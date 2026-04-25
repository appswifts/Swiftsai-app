'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';

interface SubscriptionsOverview {
  tiers: Array<{
    tier: string;
    count: number;
    mrr: number;
    percentage: number;
  }>;
  totalSubscriptions: number;
  totalOrganizations: number;
  totalMRR: number;
}

interface ManualSubForm {
  organizationId: string;
  subscriptionTier: string;
  period: 'MONTHLY' | 'YEARLY';
  totalChannels: number;
  isLifetime: boolean;
}

const tiers = ['FREE', 'STANDARD', 'TEAM', 'PRO', 'ULTIMATE'] as const;

export const AdminSubscriptions = () => {
  const fetch = useFetch();
  const t = useT();
  const { mutate } = useSWRConfig();
  const [showManualForm, setShowManualForm] = useState(false);

  const { data: overview, isLoading, error } = useSWR<SubscriptionsOverview>('/admin/subscriptions/overview', async () => {
    const res = await fetch('/admin/subscriptions/overview');
    return res.json();
  }, {
    revalidateOnFocus: false,
  });

  const handleManualCreate = useCallback(async (form: ManualSubForm) => {
    try {
      await fetch('/admin/subscriptions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      await mutate('/admin/subscriptions/overview');
      await mutate('/admin/stats');
      setShowManualForm(false);
    } catch (err) {
      console.error('Failed to create subscription', err);
    }
  }, [fetch, mutate]);

  if (isLoading) return <div className="flex items-center justify-center h-[400px]"><div className="text-newTextColor/50">Loading subscriptions...</div></div>;
  if (error) return <div className="text-red-500 text-center py-12">Failed to load subscriptions</div>;

  const totalMRR = overview?.totalMRR || 0;

  return (
    <div className="space-y-[30px]">
      <div>
        <h1 className="text-[24px] font-bold text-newTextColor">{t('subscriptions', 'Subscriptions')}</h1>
        <p className="text-newTextColor/60 mt-[8px]">{t('subscription_overview', 'Platform subscription overview and management')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[20px]">
        <div className="bg-menuBg rounded-[12px] p-[24px] border border-tableBorder">
          <div className="text-newTextColor/60 text-[14px]">Total MRR</div>
          <div className="text-[32px] font-bold text-newTextColor mt-[8px]">${totalMRR.toLocaleString()}</div>
        </div>
        <div className="bg-menuBg rounded-[12px] p-[24px] border border-tableBorder">
          <div className="text-newTextColor/60 text-[14px]">Total Subscriptions</div>
          <div className="text-[32px] font-bold text-newTextColor mt-[8px]">{overview?.totalSubscriptions.toLocaleString()}</div>
        </div>
        <div className="bg-menuBg rounded-[12px] p-[24px] border border-tableBorder">
          <div className="text-newTextColor/60 text-[14px]">Total Organizations</div>
          <div className="text-[32px] font-bold text-newTextColor mt-[8px]">{overview?.totalOrganizations.toLocaleString()}</div>
        </div>
        <div className="bg-menuBg rounded-[12px] p-[24px] border border-tableBorder">
          <div className="text-newTextColor/60 text-[14px]">Paid %</div>
          <div className="text-[32px] font-bold text-green-500">
            {overview ? Math.round((overview.totalSubscriptions / overview.totalOrganizations) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Tier Breakdown Table */}
      <div className="bg-menuBg rounded-[12px] border border-tableBorder overflow-hidden">
        <div className="p-[20px] border-b border-tableBorder">
          <div className="flex justify-between items-center">
            <h3 className="text-[18px] font-bold text-newTextColor">Subscription Tiers</h3>
            <Button onClick={() => setShowManualForm(!showManualForm)} className="!bg-green-500 hover:!bg-green-600">
              {t('create_manual', '+ Create Manual')}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-tableBorder">
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">Tier</th>
                <th className="text-right p-[16px] text-newTextColor/60 font-medium text-[14px]">Count</th>
                <th className="text-right p-[16px] text-newTextColor/60 font-medium text-[14px]">MRR</th>
                <th className="text-right p-[16px] text-newTextColor/60 font-medium text-[14px]">Percentage</th>
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {overview?.tiers.map((tier) => (
                <tr key={tier.tier} className="border-b border-tableBorder hover:bg-tableBorder/30">
                  <td className="p-[16px] font-medium text-newTextColor">{tier.tier}</td>
                  <td className="p-[16px] text-right text-newTextColor">{tier.count.toLocaleString()}</td>
                  <td className="p-[16px] text-right font-bold text-newTextColor">${tier.mrr.toLocaleString()}</td>
                  <td className="p-[16px] text-right">
                    <div className="inline-flex items-center gap-[4px]">
                      <div className="w-[8px] h-[8px] bg-green-500 rounded-full" />
                      {tier.percentage.toFixed(1)}%
                    </div>
                  </td>
                  <td className="p-[16px]">
                    {tier.count > 0 && (
                      <Button className="!bg-red-500/80 hover:!bg-red-500">
                        Bulk Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Subscription Form (inline) */}
      {showManualForm && (
        <div className="bg-menuBg rounded-[12px] border border-tableBorder p-[24px]">
          <h3 className="text-[18px] font-bold text-newTextColor mb-[20px]">
            {t('create_manual_subscription', 'Create Manual Subscription')}
          </h3>
          <ManualSubscriptionForm
            onSubmit={handleManualCreate}
            onClose={() => setShowManualForm(false)}
          />
        </div>
      )}
    </div>
  );
};

const ManualSubscriptionForm = ({ onSubmit, onClose }: { onSubmit: (form: ManualSubForm) => Promise<void>; onClose: () => void }) => {
  const [form, setForm] = useState<ManualSubForm>({
    organizationId: '',
    subscriptionTier: 'STANDARD',
    period: 'MONTHLY',
    totalChannels: 5,
    isLifetime: false,
  });
  const [loading, setLoading] = useState(false);
  const t = useT();

  const handleChange = (key: keyof ManualSubForm, value: any) => {
    setForm({ ...form, [key]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } catch { }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-[20px]">
      <div className="flex flex-col gap-[6px]">
        <div className="text-[14px]">Organization ID</div>
        <input
          className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
          value={form.organizationId}
          onChange={(e) => handleChange('organizationId', e.target.value)}
          placeholder="org_123"
          required
        />
      </div>
      <div className="flex flex-col gap-[6px]">
        <div className="text-[14px]">Subscription Tier</div>
        <select
          className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px]"
          value={form.subscriptionTier}
          onChange={(e) => handleChange('subscriptionTier', e.target.value)}
        >
          {tiers.map((tier) => (
            <option key={tier} value={tier}>{tier}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-[6px]">
        <div className="text-[14px]">Total Channels</div>
        <input
          type="number"
          className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
          value={form.totalChannels}
          onChange={(e) => handleChange('totalChannels', parseInt(e.target.value))}
          min={1}
        />
      </div>
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={form.isLifetime}
          onChange={(e) => handleChange('isLifetime', e.target.checked)}
        />
        <span>{t('lifetime', 'Lifetime')}</span>
      </label>
      <div className="flex gap-3 justify-end">
        <Button type="button" onClick={onClose} className="!bg-transparent border border-tableBorder">Cancel</Button>
        <Button type="submit" loading={loading}>Create</Button>
      </div>
    </form>
  );
};
