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
    aiProvider: 'openai',
    aiModel: '',
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

  const providerPresets = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3', 'o3-mini', 'o4-mini'],
    anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
    google: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'deepseek-r1-distill-llama-70b'],
  } as const;

  const providerLabels: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google Gemini',
    groq: 'Groq (Free)',
  };

  const provider = ((settings as any).aiProvider as string) || 'openai';

  const modelItems = [...(providerPresets as any)[provider] || providerPresets.openai] as string[];
  const modelOptions = [
    { value: '', label: t('use_env_default', 'Use Environment Default') },
    ...modelItems.map((m) => ({ value: m, label: m })),
  ];

  const [customModel, setCustomModel] = useState(false);

  useEffect(() => {
    if (settings.llmModel && !modelOptions.find(m => m.value === settings.llmModel)) {
      setCustomModel(true);
    }
  }, [settings.llmModel]);

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

        {/* AI Configuration */}
        <div className="bg-menuBg rounded-[12px] border border-tableBorder overflow-hidden">
          <div className="p-[20px] border-b border-tableBorder">
            <h3 className="text-[18px] font-bold text-newTextColor">{t('ai_configuration', 'AI Configuration')}</h3>
            <p className="text-newTextColor/60 text-[14px] mt-[4px]">{t('ai_model_settings', 'Configure the AI provider and model — changes take effect immediately, no restart needed')}</p>
          </div>
          <div className="p-[20px] space-y-[20px]">
            <div className="flex flex-col gap-[6px]">
              <div className="text-[14px] font-medium text-newTextColor">{t('ai_provider', 'AI Provider')}</div>
              <select
                className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
                value={provider}
                onChange={(e) => setSettings({ ...settings, aiProvider: e.target.value, aiModel: '' })}
              >
                {Object.keys(providerLabels).map((key) => (
                  <option key={key} value={key}>{(providerLabels as any)[key]}</option>
                ))}
              </select>
              <div className="text-[12px] text-newTextColor/40 mt-[2px]">
                {provider === 'groq' ? 'Groq offers free API access to open-source models. Set GROQ_API_KEY in your environment.' :
                 provider === 'google' ? 'Requires GOOGLE_API_KEY environment variable.' :
                 provider === 'anthropic' ? 'Requires ANTHROPIC_API_KEY environment variable.' :
                 'Requires OPENAI_API_KEY environment variable.'}
              </div>
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="text-[14px] font-medium text-newTextColor">{t('llm_model', 'Model')}</div>
              {!customModel ? (
                <div className="flex gap-[8px]">
                  <select
                    className="flex-1 h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
                    value={(settings as any).aiModel || ''}
                    onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                  >
                    {modelOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setCustomModel(true)}
                    className="h-[42px] px-[12px] bg-newBgColorInner border border-newTableBorder rounded-[8px] text-[12px] text-newTextColor/60 hover:text-newTextColor whitespace-nowrap"
                  >
                    {t('custom', 'Custom')}
                  </button>
                </div>
              ) : (
                <div className="flex gap-[8px]">
                  <input
                    className="flex-1 h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
                    value={(settings as any).aiModel || ''}
                    onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                    placeholder={provider === 'openai' ? 'e.g. gpt-4o' : provider === 'groq' ? 'e.g. llama-3.3-70b-versatile' : 'e.g. custom-model-name'}
                  />
                  <button
                    type="button"
                    onClick={() => { setCustomModel(false); setSettings({ ...settings, aiModel: '' }); }}
                    className="h-[42px] px-[12px] bg-newBgColorInner border border-newTableBorder rounded-[8px] text-[12px] text-newTextColor/60 hover:text-newTextColor whitespace-nowrap"
                  >
                    {t('presets', 'Presets')}
                  </button>
                </div>
              )}
              {(settings as any).aiModel && (
                <div className="text-[12px] text-green-500 mt-[2px]">
                  ✓ {t('active_model', 'Active model')}: <span className="font-mono font-semibold">{(settings as any).aiModel}</span> ({providerLabels[provider]})
                </div>
              )}
              {!(settings as any).aiModel && (
                <div className="text-[12px] text-newTextColor/40 mt-[2px]">
                  {t('using_env_fallback', 'Using AI_MODEL / LLM_MODEL env var or default')}
                </div>
              )}
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
