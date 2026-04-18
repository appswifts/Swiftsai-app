'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { Button } from '@gitroom/react/form/button';

// ─── Types ──────────────────────────────────────────────────
interface LeadIdentity {
  id: string;
  channel: string;
  externalId: string;
  displayName?: string;
  avatarUrl?: string;
  lastSeenAt?: string;
}

interface LeadMessage {
  id: string;
  content?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: string;
  createdAt: string;
  leadIdentity?: {
    id: string;
    channel: string;
    displayName?: string;
    avatarUrl?: string;
    externalId: string;
  };
}

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: LeadStatusType;
  source?: string;
  ownerUserId?: string;
  identities: LeadIdentity[];
  messages?: Array<{
    id: string;
    content?: string;
    direction: 'INBOUND' | 'OUTBOUND';
    createdAt: string;
    status?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

type LeadStatusType = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST';
type ViewMode = 'pipeline' | 'table';

// ─── Constants ──────────────────────────────────────────────
const LEAD_COLUMNS: { key: LeadStatusType; label: string; color: string; dotColor: string }[] = [
  { key: 'NEW', label: 'Intake', color: 'border-t-blue-500', dotColor: 'bg-blue-400' },
  { key: 'CONTACTED', label: 'Contacted', color: 'border-t-amber-500', dotColor: 'bg-amber-400' },
  { key: 'QUALIFIED', label: 'Qualified', color: 'border-t-purple-500', dotColor: 'bg-purple-400' },
  { key: 'WON', label: 'Converted', color: 'border-t-emerald-500', dotColor: 'bg-emerald-400' },
  { key: 'LOST', label: 'Lost', color: 'border-t-rose-500', dotColor: 'bg-rose-400' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  NEW: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  CONTACTED: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  QUALIFIED: { bg: 'bg-purple-500/15', text: 'text-purple-400', dot: 'bg-purple-400' },
  WON: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  LOST: { bg: 'bg-rose-500/15', text: 'text-rose-400', dot: 'bg-rose-400' },
};

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  facebook: { label: 'Messenger', color: '#0084FF' },
  instagram: { label: 'Instagram', color: '#E4405F' },
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  x: { label: 'X', color: '#1DA1F2' },
  telegram: { label: 'Telegram', color: '#26A5E4' },
};

// ─── Helpers ────────────────────────────────────────────────
function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

// ─── Small Components ───────────────────────────────────────
const PlatformBadge: React.FC<{ channel: string; size?: number }> = ({ channel, size = 16 }) => (
  <img
    src={`/icons/platforms/${channel}.png`}
    alt={channel}
    className="rounded-full flex-shrink-0"
    style={{ width: size, height: size }}
    onError={(e) => {
      (e.target as HTMLImageElement).style.display = 'none';
    }}
  />
);

const Avatar: React.FC<{ name: string; url?: string; size?: number }> = ({ name, url, size = 40 }) => {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-[#AA0FA4] to-[#FC69FF] flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(name)}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// LEADS PAGE
// ═══════════════════════════════════════════════════════════
export const LeadsPage = () => {
  const t = useT();
  const fetch = useFetch();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // ─── Fetch leads ────────────────────────────────────────
  const { data: leadsData, isLoading, mutate: mutateLeads } = useSWR(
    '/leads?limit=200',
    async (url: string) => (await fetch(url)).json(),
    { refreshInterval: 10000 }
  );
  const allLeads: Lead[] = leadsData?.leads || [];

  // ─── Fetch selected lead details ────────────────────────
  const { data: selectedLeadDetail, mutate: mutateLeadDetail } = useSWR(
    selectedLeadId ? `/leads/${selectedLeadId}` : null,
    async (url: string) => (await fetch(url)).json()
  );

  // ─── Fetch messages for selected lead ──────────────────
  const { data: messagesData, mutate: mutateMessages } = useSWR<{ messages: LeadMessage[] }>(
    selectedLeadId ? `/leads/${selectedLeadId}/messages` : null,
    async (url: string) => (await fetch(url)).json(),
    { refreshInterval: 5000 }
  );

  // ─── Auto-scroll messages ─────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  // ─── Available sources from data ──────────────────────
  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    allLeads.forEach((lead) => {
      if (lead.source) sources.add(lead.source);
      lead.identities?.forEach((i) => sources.add(i.channel));
    });
    return Array.from(sources);
  }, [allLeads]);

  // ─── Filtered leads ──────────────────────────────────
  const filteredLeads = useMemo(() => {
    let list = allLeads;

    if (filterSource !== 'all') {
      list = list.filter(
        (l) =>
          l.source === filterSource ||
          l.identities?.some((i) => i.channel === filterSource)
      );
    }

    if (filterStatus !== 'all') {
      list = list.filter((l) => l.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.phone?.includes(q) ||
          l.identities?.some(
            (i) =>
              i.displayName?.toLowerCase().includes(q) ||
              i.externalId?.toLowerCase().includes(q)
          )
      );
    }
    return list;
  }, [allLeads, filterSource, filterStatus, searchQuery]);

  // ─── Leads grouped by status (for pipeline view) ─────
  const groupedLeads = useMemo(() => {
    const groups: Record<LeadStatusType, Lead[]> = {
      NEW: [],
      CONTACTED: [],
      QUALIFIED: [],
      WON: [],
      LOST: [],
    };
    filteredLeads.forEach((lead) => {
      if (groups[lead.status]) {
        groups[lead.status].push(lead);
      } else {
        groups.NEW.push(lead);
      }
    });
    return groups;
  }, [filteredLeads]);

  // ─── Stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    const intake = groupedLeads.NEW.length;
    const converted = groupedLeads.WON.length;
    const total = filteredLeads.length;
    const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : '—';
    return { intake, converted, rate, total };
  }, [groupedLeads, filteredLeads]);

  const selectedLead = useMemo(
    () => allLeads.find((l) => l.id === selectedLeadId),
    [allLeads, selectedLeadId]
  );

  // ─── Update Lead Status ──────────────────────────────
  const updateLeadStatus = useCallback(
    async (leadId: string, status: LeadStatusType) => {
      await fetch(`/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await mutateLeads();
      await mutateLeadDetail();
      setStageDropdownOpen(false);
    },
    [fetch, mutateLeads, mutateLeadDetail]
  );

  // ─── Send Message ────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!selectedLead || !message.trim()) return;
    const firstIdentity = selectedLead.identities?.[0];
    if (!firstIdentity) return;

    setIsSending(true);
    try {
      await fetch(`/leads/${selectedLead.id}/send`, {
        method: 'POST',
        body: JSON.stringify({
          leadIdentityId: firstIdentity.id,
          content: message.trim(),
        }),
      });
      setMessage('');
      await mutateMessages();
    } finally {
      setIsSending(false);
    }
  }, [selectedLead, message, fetch, mutateMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) return <LoadingComponent />;

  return (
    <div className="flex flex-col h-[calc(100vh-92px)] overflow-hidden bg-[#0a0a0f]">
      {/* ═══ TOP HEADER BAR ═══ */}
      <div className="px-5 py-3 border-b border-white/10 bg-[#0f0f18] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white">{t('leads_center', 'Leads Center')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button className="!px-3 !py-1.5 !text-sm !rounded-lg !bg-[#AA0FA4] hover:!bg-[#AA0FA4]/80">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              {t('add_leads', 'Add leads')}
            </span>
          </Button>
        </div>
      </div>

      {/* ═══ VIEW TOGGLE + FILTERS ═══ */}
      <div className="px-5 py-2.5 border-b border-white/10 bg-[#0f0f18] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Pipeline / Table Toggle */}
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'pipeline'
                  ? 'bg-[#AA0FA4]/30 text-[#FC69FF]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
              {t('pipeline_view', 'Pipeline view')}
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'table'
                  ? 'bg-[#AA0FA4]/30 text-[#FC69FF]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>
              {t('table_view', 'Table view')}
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 ml-2">
            {/* Source Filter */}
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#FC69FF]/50"
            >
              <option value="all">{t('source', 'Source')}: All</option>
              {availableSources.map((src) => (
                <option key={src} value={src}>
                  {PLATFORM_META[src]?.label || src.charAt(0).toUpperCase() + src.slice(1)}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#FC69FF]/50"
            >
              <option value="all">{t('status', 'Status')}: All</option>
              {LEAD_COLUMNS.map((col) => (
                <option key={col.key} value={col.key}>
                  {col.label}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_leads', 'Search leads...')}
                className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg pl-7 pr-3 py-1.5 w-[180px] outline-none focus:border-[#FC69FF]/50"
              />
            </div>
          </div>
        </div>

        {/* Hide filters button (decorative) */}
        <button className="text-xs text-gray-400 hover:text-white transition flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          {t('hide_filters', 'Hide filters')}
        </button>
      </div>

      {/* ═══ STATS BAR ═══ */}
      <div className="px-5 py-2 border-b border-white/10 bg-[#0a0a0f] flex items-center gap-6">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-blue-400 font-semibold">
            {t('intake_leads', 'Intake leads')}: {stats.intake}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-emerald-400 font-semibold">
            {t('converted_leads', 'Converted leads')}: {stats.converted}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-300 font-semibold">
            {t('conversion_rate', 'Conversion rate')}: {stats.rate}%
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
      </div>

      {/* ═══ MAIN CONTENT AREA ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Pipeline / Table View ─── */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {viewMode === 'pipeline' ? (
            /* ═══ KANBAN PIPELINE VIEW ═══ */
            <div className="flex gap-3 p-4 h-full min-w-max">
              {LEAD_COLUMNS.map((column) => {
                const columnLeads = groupedLeads[column.key] || [];
                return (
                  <div
                    key={column.key}
                    className={`w-[260px] flex-shrink-0 flex flex-col bg-[#0f0f18] rounded-xl border-t-[3px] ${column.color} border border-white/5`}
                  >
                    {/* Column Header */}
                    <div className="px-3 py-2.5 flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{column.label}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                          {columnLeads.length}
                        </span>
                        <button className="text-gray-500 hover:text-white transition">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                        </button>
                      </div>
                    </div>

                    {/* Column Cards */}
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                      {columnLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="text-xs text-gray-500">
                            {t('no_leads_stage', 'No leads in this stage')}
                          </div>
                          <div className="text-[11px] text-gray-600 mt-1">
                            {t('move_leads_hint', 'Move leads to this stage')}
                          </div>
                        </div>
                      ) : (
                        columnLeads.map((lead) => (
                          <div
                            key={lead.id}
                            onClick={() => setSelectedLeadId(lead.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedLeadId === lead.id
                                ? 'border-[#FC69FF]/50 bg-[#AA0FA4]/10 shadow-lg shadow-[#AA0FA4]/5'
                                : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <Avatar
                                name={lead.name}
                                url={lead.identities?.[0]?.avatarUrl}
                                size={36}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm text-white truncate">
                                    {lead.name}
                                  </span>
                                  <button
                                    className="text-gray-500 hover:text-white transition flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                                  </button>
                                </div>

                                {/* Platform badges */}
                                <div className="flex items-center gap-1 mt-1.5">
                                  {lead.identities?.map((identity) => (
                                    <PlatformBadge
                                      key={identity.id}
                                      channel={identity.channel}
                                      size={16}
                                    />
                                  ))}
                                  {lead.source && (
                                    <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded ml-0.5">
                                      {lead.source === 'ad' ? 'ad_id…' : lead.source}
                                    </span>
                                  )}
                                </div>

                                {/* Last message snippet */}
                                {lead.messages?.[0] && (
                                  <div className="text-[11px] text-gray-500 truncate mt-1.5">
                                    {lead.messages[0].direction === 'OUTBOUND' ? 'You: ' : ''}
                                    {lead.messages[0].content}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ═══ TABLE VIEW ═══ */
            <div className="p-4 h-full overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-white/10">
                    <th className="pb-2 pl-3 font-medium">{t('name', 'Name')}</th>
                    <th className="pb-2 font-medium">{t('email', 'Email')}</th>
                    <th className="pb-2 font-medium">{t('phone', 'Phone')}</th>
                    <th className="pb-2 font-medium">{t('channels', 'Channels')}</th>
                    <th className="pb-2 font-medium">{t('stage', 'Stage')}</th>
                    <th className="pb-2 font-medium">{t('source', 'Source')}</th>
                    <th className="pb-2 font-medium">{t('last_activity', 'Last Activity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const sc = STATUS_COLORS[lead.status] || STATUS_COLORS.NEW;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`border-b border-white/5 cursor-pointer transition ${
                          selectedLeadId === lead.id
                            ? 'bg-[#AA0FA4]/10'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="py-3 pl-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={lead.name} url={lead.identities?.[0]?.avatarUrl} size={32} />
                            <span className="font-medium text-white">{lead.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-gray-400">{lead.email || '—'}</td>
                        <td className="py-3 text-gray-400">{lead.phone || '—'}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            {lead.identities?.map((i) => (
                              <PlatformBadge key={i.id} channel={i.channel} size={18} />
                            ))}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {LEAD_COLUMNS.find((c) => c.key === lead.status)?.label || lead.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400 text-xs">{lead.source || '—'}</td>
                        <td className="py-3 text-gray-500 text-xs">{relativeTime(lead.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredLeads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-3 text-gray-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <div className="text-sm font-medium text-gray-400">{t('no_leads', 'No leads yet')}</div>
                  <p className="text-xs mt-1">{t('no_leads_hint', 'Connect channels and interact to start generating leads.')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ RIGHT: LEAD DETAIL PANEL ═══ */}
        {selectedLead && (
          <div className="w-[320px] border-l border-white/10 bg-[#0f0f18] flex flex-col flex-shrink-0 overflow-hidden">
            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar name={selectedLead.name} url={selectedLead.identities?.[0]?.avatarUrl} size={32} />
                <div>
                  <div className="font-semibold text-sm text-white">{selectedLead.name}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeadId('')}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {/* Scrollable Detail Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Lead Management */}
              <div className="p-4 border-b border-white/10">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {t('lead_management', 'Lead management')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-gray-500 mb-1">{t('assigned_to', 'Assigned to')}</div>
                    <div className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300">
                      {t('unassigned', 'Unassigned')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 mb-1">{t('stage', 'Stage')}</div>
                    <div className="relative">
                      <button
                        onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-white/10 text-xs transition hover:border-[#FC69FF]/40 ${
                          STATUS_COLORS[selectedLead.status]?.bg || ''
                        } ${STATUS_COLORS[selectedLead.status]?.text || 'text-gray-300'}`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[selectedLead.status]?.dot || 'bg-gray-400'}`} />
                          {LEAD_COLUMNS.find((c) => c.key === selectedLead.status)?.label || selectedLead.status}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                      </button>
                      {stageDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                          {LEAD_COLUMNS.map((col) => (
                            <button
                              key={col.key}
                              onClick={() => updateLeadStatus(selectedLead.id, col.key)}
                              className={`w-full text-left px-2.5 py-2 text-xs flex items-center gap-2 transition hover:bg-white/10 ${
                                selectedLead.status === col.key
                                  ? `${STATUS_COLORS[col.key].text} font-medium`
                                  : 'text-gray-300'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[col.key].dot}`} />
                              {col.label}
                              {selectedLead.status === col.key && (
                                <svg className="ml-auto" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="p-4 border-b border-white/10">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {t('contact_details', 'Contact details')}
                </div>
                {selectedLead.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    {selectedLead.email}
                  </div>
                )}
                {selectedLead.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {selectedLead.phone}
                  </div>
                )}
                {!selectedLead.email && !selectedLead.phone && (
                  <div className="text-xs text-gray-500 italic">
                    {t('no_details', 'No contact details added.')}
                  </div>
                )}
              </div>

              {/* Platform Identities (all connected channels) */}
              <div className="p-4 border-b border-white/10">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {t('platform_profiles', 'Platform profiles')}
                </div>
                {selectedLead.identities?.length > 0 ? (
                  selectedLead.identities.map((identity) => (
                    <div key={identity.id} className="flex items-center gap-2.5 mb-2.5 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <PlatformBadge channel={identity.channel} size={24} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">
                          {identity.displayName || identity.externalId}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1">
                          {PLATFORM_META[identity.channel]?.label || identity.channel}
                          {identity.lastSeenAt && (
                            <>
                              <span className="text-gray-600">·</span>
                              <span>{relativeTime(identity.lastSeenAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 italic">
                    {t('no_platforms', 'No platform profiles linked.')}
                  </div>
                )}
              </div>

              {/* Message Thread (inline conversation) */}
              <div className="p-4 border-b border-white/10">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {t('conversation', 'Conversation')}
                </div>
                <div className="max-h-[280px] overflow-y-auto flex flex-col gap-2 mb-3">
                  {(messagesData?.messages || []).length === 0 ? (
                    <div className="text-xs text-gray-500 text-center py-4 italic">
                      {t('no_messages_lead', 'No messages with this lead yet.')}
                    </div>
                  ) : (
                    (messagesData?.messages || []).map((msg) => {
                      const isOutbound = msg.direction === 'OUTBOUND';
                      return (
                        <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                          <div className="flex items-end gap-1.5 max-w-[85%]">
                            {!isOutbound && msg.leadIdentity && (
                              <PlatformBadge channel={msg.leadIdentity.channel} size={16} />
                            )}
                            <div>
                              <div
                                className={`rounded-xl px-3 py-1.5 text-xs leading-relaxed ${
                                  isOutbound
                                    ? 'bg-[#AA0FA4] text-white rounded-br-sm'
                                    : 'bg-white/10 text-gray-200 rounded-bl-sm'
                                }`}
                              >
                                {msg.content || '[empty]'}
                              </div>
                              <div className={`text-[9px] text-gray-500 mt-0.5 ${isOutbound ? 'text-right' : ''}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply bar */}
                {selectedLead.identities?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <PlatformBadge channel={selectedLead.identities[0].channel} size={20} />
                    <input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('reply_on', `Reply on ${PLATFORM_META[selectedLead.identities[0].channel]?.label || selectedLead.identities[0].channel}...`)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FC69FF]/50"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isSending || !message.trim()}
                      className="text-[#FC69FF] hover:text-white disabled:text-gray-600 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4">
                <button className="w-full flex items-center justify-center gap-2 text-xs text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-lg py-2 transition hover:bg-rose-500/5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  {t('delete_lead', 'Delete lead')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
