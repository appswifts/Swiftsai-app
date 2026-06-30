'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useSWRConfig } from 'swr';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';

export const AdminSettings = () => {
  const fetch = useFetch();
  const { mutate } = useSWRConfig();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    allowNewSignups: true,
    trialDays: 14,
    trialTier: 'STANDARD',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    maxChannelsFree: 3,
    llmModel: '',
    defaultPlanId: '',
  });

  const fetchPlans = useCallback(async () => {
    const res = await (await fetch('/admin/plans')).json();
    return res;
  }, [fetch]);

  const { data: plansData } = useSWR('/admin/plans/list', fetchPlans);

  // Load settings from backend
  const fetchSettings = useCallback(async () => {
    const res = await (await fetch('/admin/settings')).json();
    return res;
  }, [fetch]);

  const { data } = useSWR('/admin/settings', fetchSettings);

  useEffect(() => {
    if (data && typeof data === 'object') {
      setSettings((prev) => ({ ...prev, ...data }));
    }
  }, [data]);

  const handleSave = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      await mutate('/admin/settings');
      await mutate('/admin/stats');
      alert(t('settings_saved', 'Settings saved!'));
    } catch (error) {
      console.error('Save failed', error);
      alert(t('save_failed', 'Save failed'));
    } finally {
      setLoading(false);
    }
  }, [settings, fetch, mutate, t]);

  return (
    <div className="space-y-[30px]">
      <div>
        <h1 className="text-[24px] font-bold text-newTextColor">{t('admin_settings', 'Admin Settings')}</h1>
        <p className="text-newTextColor/60 mt-[8px]">{t('platform_configuration', 'Configure platform-wide settings')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[30px]">
        {/* General Settings */}
        <div className="bg-menuBg rounded-[12px] border border-tableBorder overflow-hidden">
          <div className="p-[20px] border-b border-tableBorder">
            <h3 className="text-[18px] font-bold text-newTextColor">{t('general', 'General')}</h3>
            <p className="text-newTextColor/60 text-[14px] mt-[4px]">{t('platform_features', 'Enable/disable platform features')}</p>
          </div>
          <div className="p-[20px] space-y-[20px]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-newTextColor">{t('allow_new_signups', 'Allow New Signups')}</div>
                <div className="text-newTextColor/60 text-[14px]">{t('toggle_new_user_registration', 'Toggle new user registration')}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowNewSignups}
                  onChange={(e) => setSettings({ ...settings, allowNewSignups: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-newTextColor">{t('trial_days', 'Trial Days')}</div>
                <div className="text-newTextColor/60 text-[14px]">Default trial period</div>
              </div>
              <input
                type="number"
                value={settings.trialDays}
                onChange={(e) => setSettings({ ...settings, trialDays: parseInt(e.target.value) })}
                className="w-[80px] h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
                min={0}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-newTextColor">{t('default_plan', 'Default Plan')}</div>
                <div className="text-newTextColor/60 text-[14px]">Plan assigned to new users on signup</div>
              </div>
              <select
                value={settings.defaultPlanId}
                onChange={(e) => setSettings({ ...settings, defaultPlanId: e.target.value })}
                className="w-[200px] h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
              >
                <option value="">No default plan (free tier)</option>
                {plansData && Array.isArray(plansData) && plansData.map((plan: any) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — ${plan.monthPrice}/mo
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-newTextColor">{t('max_channels_free', 'Max Channels (Free)')}</div>
                <div className="text-newTextColor/60 text-[14px]">Channels allowed on free tier</div>
              </div>
              <input
                type="number"
                value={settings.maxChannelsFree}
                onChange={(e) => setSettings({ ...settings, maxChannelsFree: parseInt(e.target.value) })}
                className="w-[80px] h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
                min={1}
              />
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-menuBg rounded-[12px] border border-tableBorder overflow-hidden">
          <div className="p-[20px] border-b border-tableBorder">
            <h3 className="text-[18px] font-bold text-newTextColor">{t('email_config', 'Email Configuration')}</h3>
            <p className="text-newTextColor/60 text-[14px] mt-[4px]">{t('smtp_settings_for_notifications', 'SMTP settings for notifications and emails')}</p>
          </div>
          <div className="p-[20px] space-y-[20px]">
            <div className="flex flex-col gap-[6px]">
              <div className="text-[14px]">SMTP Host</div>
              <input
                className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
                value={settings.smtpHost}
                onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="text-[14px]">SMTP Port</div>
              <input
                type="number"
                className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
                value={settings.smtpPort}
                onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                placeholder="587"
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="text-[14px]">SMTP Username</div>
              <input
                className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
                value={settings.smtpUser}
                onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                placeholder="noreply@yourapp.com"
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="text-[14px]">SMTP Password</div>
              <input
                type="password"
                className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
                value={settings.smtpPassword}
                onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                placeholder="SMTP password"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-[20px] border-t border-tableBorder flex justify-end">
        <Button onClick={handleSave} loading={loading} className="!bg-primary hover:!bg-primary/90">
          {t('save_settings', 'Save Settings')}
        </Button>
      </div>
    </div>
  );
};
