'use client';

import React, { useState, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useSWRConfig } from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Switch } from '@gitroom/react/form/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gitroom/react/ui/card';

export const AdminSettings = () => {
  const fetch = useFetch();
  const { mutate } = useSWRConfig();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    allowNewSignups: true,
    trialDays: 14,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    maxChannelsFree: 3,
  });

  const handleSave = useCallback(async () => {
    setLoading(true);
    try {
      // Stub: POST /admin/settings
      await fetch('/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
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
        <Card className="bg-menuBg border-tableBorder">
          <CardHeader>
            <CardTitle>{t('general', 'General')}</CardTitle>
            <CardDescription>{t('platform_features', 'Enable/disable platform features')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-[20px]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-newTextColor">{t('allow_new_signups', 'Allow New Signups')}</div>
                <div className="text-newTextColor/60 text-[14px]">{t('toggle_new_user_registration', 'Toggle new user registration')}</div>
              </div>
              <Switch
                checked={settings.allowNewSignups}
                onCheckedChange={(v) => setSettings({ ...settings, allowNewSignups: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-newTextColor">{t('trial_days', 'Trial Days')}</div>
                <div className="text-newTextColor/60 text-[14px]">Default trial period</div>
              </div>
              <Input
                type="number"
                value={settings.trialDays}
                onChange={(e) => setSettings({ ...settings, trialDays: parseInt(e.target.value) })}
                className="w-[80px]"
                min={0}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-newTextColor">{t('max_channels_free', 'Max Channels (Free)')}</div>
                <div className="text-newTextColor/60 text-[14px]">Channels allowed on free tier</div>
              </div>
              <Input
                type="number"
                value={settings.maxChannelsFree}
                onChange={(e) => setSettings({ ...settings, maxChannelsFree: parseInt(e.target.value) })}
                className="w-[80px]"
                min={1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card className="bg-menuBg border-tableBorder">
          <CardHeader>
            <CardTitle>{t('email_config', 'Email Configuration')}</CardTitle>
            <CardDescription>{t('smtp_settings_for_notifications', 'SMTP settings for notifications and emails')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-[20px]">
            <Input
              label="SMTP Host"
              value={settings.smtpHost}
              onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
              placeholder="smtp.example.com"
            />
            <Input
              label="SMTP Port"
              type="number"
              value={settings.smtpPort}
              onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
              placeholder="587"
            />
            <Input
              label="SMTP Username"
              value={settings.smtpUser}
              onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
              placeholder="noreply@yourapp.com"
            />
          </CardContent>
        </Card>
      </div>

      <div className="pt-[20px] border-t border-tableBorder flex justify-end">
        <Button onClick={handleSave} disabled={loading} className="!bg-primary hover:!bg-primary/90">
          {loading ? t('saving', 'Saving...') : t('save_settings', 'Save Settings')}
        </Button>
      </div>
    </div>
  );
};
