```tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useSWRConfig } from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@gitroom/react/form/select';

interface Props {
  orgId: string;
  currentSub?: any;
  mutate: () => Promise<any>;
  onClose: () => void;
}

const tiers = ['FREE', 'STANDARD', 'TEAM', 'PRO', 'ULTIMATE'] as const;
type SubscriptionTier = typeof tiers[number];

const periods = ['MONTHLY', 'YEARLY'] as const;
type Period = typeof periods[number];

export const ManageSubscription = ({ orgId, currentSub, mutate, onClose }: Props) => {
  const fetch = useFetch();
  const { mutate: globalMutate } = useSWRConfig();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier>(currentSub?.subscriptionTier || 'STANDARD');
  const [period, setPeriod] = useState<Period>(currentSub?.period || 'MONTHLY');
  const [channels, setChannels] = useState<number>(currentSub?.totalChannels || 5);
  const [lifetime, setLifetime] = useState(!!currentSub?.isLifetime);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`/admin/organizations/${orgId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionTier: tier,
          period,
          totalChannels: channels,
          isLifetime: lifetime,
        }),
      });
      await mutate();
      await globalMutate('/admin/stats');
      onClose();
    } catch (error) {
      console.error('Failed to update subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [orgId, tier, period, channels, lifetime, mutate, globalMutate, onClose, fetch, t]);

  return (
    <form onSubmit={handleSubmit} className="space-y-[20px]">
      <h3 className="text-[20px] font-bold text-newTextColor">{t('manage_subscription', 'Manage Subscription')}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
        <div>
          <label className="block text-newTextColor/60 text-[14px] mb-[8px]">{t('subscription_tier', 'Subscription Tier')}</label>
          <Select value={tier} onValueChange={(v: SubscriptionTier) => setTier(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiers.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-newTextColor/60 text-[14px] mb-[8px]">{t('billing_period', 'Billing Period')}</label>
          <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-newTextColor/60 text-[14px] mb-[8px]">{t('total_channels', 'Total Channels')}</label>
        <Input
          type="number"
          min={1}
          value={channels}
          onChange={(e) => setChannels(parseInt(e.target.value) || 0)}
          placeholder="5"
          className="w-full"
        />
      </div>

      <div className="flex items-center space-x-3">
        <input
          id="lifetime"
          type="checkbox"
          checked={lifetime}
          onChange={(e) => setLifetime(e.target.checked)}
          className="w-4 h-4 text-primary bg-menuBg border-tableBorder rounded focus:ring-primary"
        />
        <label htmlFor="lifetime" className="text-newTextColor/80 text-[14px]">
          {t('lifetime_access', 'Lifetime access (no recurring billing)')}
        </label>
      </div>

      <div className="flex gap-[12px] justify-end pt-[20px] border-t border-tableBorder">
        <Button type="button" onClick={onClose} variant="ghost" className="!bg-menuBg">
          {t('cancel', 'Cancel')}
        </Button>
        <Button type="submit" disabled={loading} className="!bg-green-500 hover:!bg-green-600">
          {loading ? t('saving', 'Saving...') : t('save_changes', 'Save Changes')}
        </Button>
      </div>
    </form>
  );
};
```