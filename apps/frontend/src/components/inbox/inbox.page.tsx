'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';

// ─── Types ──────────────────────────────────────────────────
interface InboxIdentity {
  id: string;
  channel: string;
  externalId: string;
  displayName?: string;
  avatarUrl?: string;
  lastSeenAt?: string;
}

interface InboxConversation {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST';
  identities: InboxIdentity[];
  lastMessage?: {
    content?: string;
    createdAt: string;
    direction: 'INBOUND' | 'OUTBOUND';
  };
  updatedAt: string;
}

interface InboxAttachment {
  type: string;
  mediaId?: string;
  mimeType?: string;
  url?: string;
  filename?: string;
}

interface InboxMessage {
  id: string;
  content?: string;
  attachmentsJson?: string;
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

// ─── Helpers ────────────────────────────────────────────────
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'] as const;

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
  x: { label: 'X / Twitter', color: '#1DA1F2' },
  telegram: { label: 'Telegram', color: '#26A5E4' },
};

function relativeTime(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
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

// ─── Platform Icon (small badge) ───────────────────────────
const PlatformBadge: React.FC<{ channel: string; size?: number }> = ({ channel, size = 16 }) => {
  return (
    <img
      src={`/icons/platforms/${channel}.png`}
      alt={channel}
      className="rounded-full"
      style={{ width: size, height: size }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

// ─── Media Attachment Renderer ─────────────────────────────
const AttachmentRenderer: React.FC<{ attachmentsJson?: string }> = ({ attachmentsJson }) => {
  if (!attachmentsJson) return null;
  let attachments: InboxAttachment[] = [];
  try {
    attachments = JSON.parse(attachmentsJson);
  } catch {
    return null;
  }
  if (!attachments.length) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {attachments.map((att, idx) => {
        if (att.type === 'image' || att.type === 'sticker') {
          return att.url ? (
            <img
              key={idx}
              src={att.url}
              alt="Attachment"
              className="max-w-[240px] rounded-lg border border-white/10"
              loading="lazy"
            />
          ) : (
            <div key={idx} className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              Image (media unavailable)
            </div>
          );
        }
        if (att.type === 'video') {
          return att.url ? (
            <video key={idx} src={att.url} controls className="max-w-[280px] rounded-lg border border-white/10" />
          ) : (
            <div key={idx} className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
              Video (media unavailable)
            </div>
          );
        }
        if (att.type === 'audio') {
          return att.url ? (
            <audio key={idx} src={att.url} controls className="max-w-[280px]" />
          ) : (
            <div key={idx} className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              Voice message
            </div>
          );
        }
        if (att.type === 'document') {
          return (
            <a
              key={idx}
              href={att.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs bg-white/5 rounded-lg px-3 py-2 border border-white/10 hover:bg-white/10 transition text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {att.filename || 'Document'}
            </a>
          );
        }
        return (
          <div key={idx} className="text-xs text-gray-500 bg-white/5 rounded-lg px-3 py-2">
            [{att.type || 'Attachment'}]
          </div>
        );
      })}
    </div>
  );
};

// ─── Avatar Component ──────────────────────────────────────
const Avatar: React.FC<{ name: string; url?: string; size?: number }> = ({
  name,
  url,
  size = 40,
}) => {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
        }}
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
// MAIN INBOX PAGE COMPONENT
// ═══════════════════════════════════════════════════════════
export const InboxPage = () => {
  const t = useT();
  const fetch = useFetch();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Mark messages as read when selecting a conversation
  const selectConversation = useCallback(
    async (id: string) => {
      setSelectedConversationId(id);
      try {
        await fetch(`/inbox/${id}/read`, { method: 'POST' });
      } catch {
        // Non-critical
      }
    },
    [fetch]
  );

  // ─── Data Fetching ──────────────────────────────────────
  const { data: conversations, isLoading, mutate: mutateConversations } = useSWR<InboxConversation[]>(
    '/inbox',
    async (url: string) => (await fetch(url)).json(),
    { refreshInterval: 5000 }
  );

  const {
    data: messagesData,
    mutate: mutateMessages,
  } = useSWR<{ messages: InboxMessage[] }>(
    selectedConversationId ? `/inbox/${selectedConversationId}/messages` : null,
    async (url: string) => (await fetch(url)).json(),
    { refreshInterval: 5000 }
  );

  // ─── Auto-scroll to bottom ─────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  // ─── Platform Tabs ────────────────────────────────────
  const platformTabs = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    (conversations || []).forEach((c) => {
      counts.all++;
      c.identities?.forEach((identity) => {
        counts[identity.channel] = (counts[identity.channel] || 0) + 1;
      });
    });

    const tabs = [{ id: 'all', name: t('all_messages', 'All messages'), count: counts.all }];
    Object.keys(PLATFORM_META).forEach((key) => {
      if (counts[key]) {
        tabs.push({ id: key, name: PLATFORM_META[key].label, count: counts[key] });
      }
    });
    // Add any remaining channels not in PLATFORM_META
    Object.keys(counts).forEach((key) => {
      if (key !== 'all' && !PLATFORM_META[key] && counts[key]) {
        tabs.push({ id: key, name: key.charAt(0).toUpperCase() + key.slice(1), count: counts[key] });
      }
    });
    return tabs;
  }, [conversations, t]);

  // ─── Filtered Conversations ───────────────────────────
  const filteredConversations = useMemo(() => {
    let list = conversations || [];

    if (selectedPlatform !== 'all') {
      list = list.filter((c) =>
        c.identities?.some((identity) => identity.channel === selectedPlatform)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.lastMessage?.content?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [conversations, selectedPlatform, searchQuery]);

  const selectedConversation = useMemo(
    () => filteredConversations.find((c) => c.id === selectedConversationId),
    [filteredConversations, selectedConversationId]
  );

  // ─── Send Message ─────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!selectedConversation || !message.trim()) return;
    const firstIdentity = selectedConversation.identities?.[0];
    if (!firstIdentity) return;

    setIsSending(true);
    try {
      await fetch(`/inbox/${selectedConversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          leadIdentityId: firstIdentity.id,
          content: message.trim(),
        }),
      });
      setMessage('');
      await mutateMessages();
      await mutateConversations();
    } finally {
      setIsSending(false);
    }
  }, [selectedConversation, message, fetch, mutateMessages, mutateConversations]);

  // ─── Update Lead Status ───────────────────────────────
  const updateLeadStatus = useCallback(
    async (status: string) => {
      if (!selectedConversation) return;
      await fetch(`/inbox/${selectedConversation.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await mutateConversations();
      setStatusDropdownOpen(false);
    },
    [selectedConversation, fetch, mutateConversations]
  );

  // ─── Handle Key Press ────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-92px)] overflow-hidden bg-[#0a0a0f]">
      {/* ═══ TOP PLATFORM TABS ═══ */}
      <div className="flex items-center gap-0 border-b border-white/10 bg-[#0f0f18] px-4">
        {platformTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedPlatform(tab.id)}
            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
              selectedPlatform === tab.id
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.id !== 'all' && <PlatformBadge channel={tab.id} size={16} />}
              {tab.name}
              {tab.count > 0 && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    selectedPlatform === tab.id
                      ? 'bg-[#AA0FA4] text-white'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {selectedPlatform === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FC69FF]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ═══ LEFT: CONVERSATION LIST ═══ */}
        <div className="w-[320px] border-r border-white/10 bg-[#0f0f18] flex flex-col flex-shrink-0">
          {/* Search & Manage */}
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search', 'Search')}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#FC69FF]/50 transition"
              />
            </div>
          </div>

          {/* Conversation Items */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-gray-600 mb-3"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <div className="text-gray-400 font-medium text-sm">
                  {t('no_conversations', 'No conversations yet')}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('connect_channels_hint', 'Connect your channels to start receiving messages.')}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const statusColor = STATUS_COLORS[conversation.status] || STATUS_COLORS.NEW;
                const avatar = conversation.identities?.[0]?.avatarUrl;

                return (
                  <div
                    key={conversation.id}
                    onClick={() => selectConversation(conversation.id)}
                    className={`flex items-start gap-3 px-3 py-3 cursor-pointer border-b border-white/5 transition-colors ${
                      selectedConversationId === conversation.id
                        ? 'bg-[#AA0FA4]/15 border-l-[3px] border-l-[#FC69FF]'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <Avatar name={conversation.name} url={avatar} size={42} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-white truncate">
                          {conversation.name}
                        </span>
                        <span className="text-[11px] text-gray-500 flex-shrink-0 ml-2">
                          {conversation.lastMessage?.createdAt
                            ? relativeTime(conversation.lastMessage.createdAt)
                            : ''}
                        </span>
                      </div>

                      {/* Last message preview */}
                      <div className="text-xs text-gray-400 truncate mt-0.5">
                        {conversation.lastMessage?.direction === 'OUTBOUND' && (
                          <span className="text-gray-500">You: </span>
                        )}
                        {conversation.lastMessage?.content || t('no_messages', 'No messages yet')}
                      </div>

                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColor.bg} ${statusColor.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                          {conversation.status}
                        </span>
                        {conversation.identities?.map((identity) => (
                          <PlatformBadge key={identity.id} channel={identity.channel} size={14} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══ CENTER: MESSAGE THREAD ═══ */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="56"
                height="56"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-gray-600"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div className="text-sm">{t('select_conversation', 'Select a conversation to start reading')}</div>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="px-4 py-3 border-b border-white/10 bg-[#0f0f18] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={selectedConversation.name}
                    url={selectedConversation.identities?.[0]?.avatarUrl}
                    size={36}
                  />
                  <div>
                    <div className="font-semibold text-sm text-white">
                      {selectedConversation.name}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {selectedConversation.identities
                        ?.map((i) => `${PLATFORM_META[i.channel]?.label || i.channel}`)
                        .join(' · ')}
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1">
                  {/* Flag */}
                  <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                  </button>
                  {/* Star */}
                  <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-yellow-400 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </button>
                  {/* Check / Done */}
                  <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {(messagesData?.messages || []).map((msg, idx) => {
                  const isOutbound = msg.direction === 'OUTBOUND';
                  const prevMsg = messagesData?.messages?.[idx - 1];
                  const showDate =
                    !prevMsg ||
                    new Date(msg.createdAt).toDateString() !==
                      new Date(prevMsg.createdAt).toDateString();

                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="text-center text-[11px] text-gray-500 my-2">
                          {new Date(msg.createdAt).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      )}
                      <div
                        className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="flex items-end gap-2 max-w-[70%]">
                          {!isOutbound && (
                            <Avatar
                              name={msg.leadIdentity?.displayName || selectedConversation.name}
                              url={msg.leadIdentity?.avatarUrl}
                              size={28}
                            />
                          )}
                          <div>
                            <div
                              className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                                isOutbound
                                  ? 'bg-[#AA0FA4] text-white rounded-br-md'
                                  : 'bg-white/10 text-gray-100 rounded-bl-md'
                              }`}
                            >
                              {msg.content || t('empty_message', '[Empty message]')}
                            </div>
                            <AttachmentRenderer attachmentsJson={msg.attachmentsJson} />
                            <div
                              className={`text-[10px] text-gray-500 mt-1 flex items-center gap-1 ${
                                isOutbound ? 'justify-end' : ''
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {isOutbound && msg.status && (
                                <span className="text-[10px]">
                                  {msg.status === 'READ'
                                    ? '✓✓'
                                    : msg.status === 'DELIVERED'
                                    ? '✓✓'
                                    : msg.status === 'SENT'
                                    ? '✓'
                                    : msg.status === 'FAILED'
                                    ? '✕'
                                    : '⏳'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose Bar */}
              <div className="px-4 py-3 border-t border-white/10 bg-[#0f0f18]">
                <div className="flex items-end gap-2">
                  {/* Attachment button */}
                  <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  </button>
                  {/* Emoji button */}
                  <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
                  </button>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('reply_in', `Reply in ${PLATFORM_META[selectedConversation.identities?.[0]?.channel]?.label || 'Chat'}...`)}
                    rows={1}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#FC69FF]/50 transition resize-none min-h-[40px] max-h-[120px]"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isSending || !message.trim()}
                    className="!px-4 !py-2.5 !rounded-xl flex-shrink-0"
                  >
                    {isSending ? (
                      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ═══ RIGHT: CONTACT DETAILS PANEL ═══ */}
        {selectedConversation && (
          <div className="w-[300px] border-l border-white/10 bg-[#0f0f18] overflow-y-auto flex-shrink-0">
            {/* Contact Header */}
            <div className="p-4 border-b border-white/10 text-center">
              <Avatar
                name={selectedConversation.name}
                url={selectedConversation.identities?.[0]?.avatarUrl}
                size={56}
              />
              <div className="font-semibold text-white mt-3">{selectedConversation.name}</div>
              <button
                onClick={() => router.push('/leads')}
                className="text-[12px] text-[#FC69FF] hover:text-[#FC69FF]/80 mt-1 transition"
              >
                {t('view_profile', 'View in Leads Center →')}
              </button>
            </div>

            {/* Contact Details */}
            <div className="p-4 border-b border-white/10">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t('contact_details', 'Contact details')}
              </div>
              {selectedConversation.email && (
                <div className="text-sm text-gray-300 mb-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  {selectedConversation.email}
                </div>
              )}
              {selectedConversation.phone && (
                <div className="text-sm text-gray-300 mb-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {selectedConversation.phone}
                </div>
              )}
              {!selectedConversation.email && !selectedConversation.phone && (
                <div className="text-sm text-gray-500 italic">
                  {t('no_contact_details', 'No contact details added yet.')}
                </div>
              )}
            </div>

            {/* Connected Channels */}
            <div className="p-4 border-b border-white/10">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t('channels', 'Connected channels')}
              </div>
              {selectedConversation.identities?.map((identity) => (
                <div key={identity.id} className="flex items-center gap-2 mb-2 text-sm text-gray-300">
                  <PlatformBadge channel={identity.channel} size={20} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      {identity.displayName || identity.externalId}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {PLATFORM_META[identity.channel]?.label || identity.channel}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Lead Stage */}
            <div className="p-4 border-b border-white/10">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                {t('lead_stage', 'Lead stage')}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </div>
              <div className="relative">
                <button
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border border-white/10 text-sm transition hover:border-[#FC69FF]/40 ${
                    STATUS_COLORS[selectedConversation.status]?.bg || ''
                  } ${STATUS_COLORS[selectedConversation.status]?.text || 'text-gray-300'}`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        STATUS_COLORS[selectedConversation.status]?.dot || 'bg-gray-400'
                      }`}
                    />
                    {selectedConversation.status}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </button>

                {statusDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                    {LEAD_STATUSES.map((status) => {
                      const color = STATUS_COLORS[status];
                      return (
                        <button
                          key={status}
                          onClick={() => updateLeadStatus(status)}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition hover:bg-white/10 ${
                            selectedConversation.status === status
                              ? `${color.text} font-medium`
                              : 'text-gray-300'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                          {status}
                          {selectedConversation.status === status && (
                            <svg className="ml-auto" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Activity */}
            <div className="p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t('activity', 'Activity')}
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">
                {t(
                  'activity_hint',
                  'Marking orders and leads can improve ad performance. Track your lead interactions here.'
                )}
              </div>
              <button
                onClick={() => router.push('/leads')}
                className="mt-3 text-xs text-[#FC69FF] hover:text-[#FC69FF]/80 transition font-medium"
              >
                {t('view_in_leads', 'View in Leads Center →')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
