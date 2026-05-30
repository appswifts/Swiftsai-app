'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

interface PlanFeatures {
  id: string;
  name: string;
  description: string;
  monthPrice: number;
  yearPrice: number;
  maxChannels: number;
  maxOrganizations: number;
  maxPlatforms: number;
  postsPerMonth: number;
  teamMembers: boolean;
  communityFeatures: boolean;
  featuredByAppswifts: boolean;
  ai: boolean;
  importFromChannels: boolean;
  imageGenerator: boolean;
  imageGenerationCount: number;
  generateVideos: number;
  publicApi: boolean;
  webhooks: number;
  autoPost: boolean;
  inbox: boolean;
  campaigns: boolean;
  leads: boolean;
  isDefault: boolean;
  isActive: boolean;
  polarProductMonthlyId: string;
  polarProductYearlyId: string;
}

const featureLabels: Record<string, { label: string; type: 'number' | 'boolean' | 'price' | 'string' }> = {
  monthPrice: { label: 'Monthly Price ($)', type: 'price' },
  yearPrice: { label: 'Yearly Price ($)', type: 'price' },
  maxChannels: { label: 'Max Channels', type: 'number' },
  maxOrganizations: { label: 'Max Organizations', type: 'number' },
  maxPlatforms: { label: 'Max Platform Types', type: 'number' },
  postsPerMonth: { label: 'Posts per Month', type: 'number' },
  teamMembers: { label: 'Team Members', type: 'boolean' },
  communityFeatures: { label: 'Community Features', type: 'boolean' },
  featuredByAppswifts: { label: 'Featured by AppSwifts', type: 'boolean' },
  ai: { label: 'AI Features', type: 'boolean' },
  importFromChannels: { label: 'Import from Channels', type: 'boolean' },
  imageGenerator: { label: 'Image Generator', type: 'boolean' },
  imageGenerationCount: { label: 'Image Generations', type: 'number' },
  generateVideos: { label: 'Video Generations', type: 'number' },
  publicApi: { label: 'Public API', type: 'boolean' },
  webhooks: { label: 'Webhooks', type: 'number' },
  autoPost: { label: 'Auto Post', type: 'boolean' },
  inbox: { label: 'Inbox', type: 'boolean' },
  campaigns: { label: 'Campaigns', type: 'boolean' },
  leads: { label: 'Leads', type: 'boolean' },
};

const defaultForm: PlanFeatures = {
  id: '',
  name: '',
  description: '',
  monthPrice: 0,
  yearPrice: 0,
  maxChannels: 0,
  maxOrganizations: 1,
  maxPlatforms: 0,
  postsPerMonth: 0,
  teamMembers: false,
  communityFeatures: false,
  featuredByAppswifts: false,
  ai: false,
  importFromChannels: false,
  imageGenerator: false,
  imageGenerationCount: 0,
  generateVideos: 0,
  publicApi: false,
  webhooks: 0,
  autoPost: false,
  inbox: false,
  campaigns: false,
  leads: false,
  isDefault: false,
  isActive: true,
  polarProductMonthlyId: '',
  polarProductYearlyId: '',
};

export const AdminPlans = () => {
  const fetch = useFetch();
  const { mutate } = useSWRConfig();
  const t = useT();
  const { openModal } = useModals();
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    const res = await (await fetch('/admin/plans')).json();
    return res;
  }, [fetch]);

  const { data, error, isLoading } = useSWR('/admin/plans', fetchPlans);

  const handleEdit = useCallback((planName: string) => {
    const plan = data?.plans?.[planName];
    if (!plan) return;

      openModal({
        title: t('edit_plan', `Edit ${planName} Plan`),
        children: (close: any) => (
          <PlanFormModal
            initial={{
              ...defaultForm,
              name: planName,
              ...plan,
            }}
            onSave={async (formData) => {
              setSaving(planName);
              try {
                await fetch(`/admin/plans/${planName}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(formData),
                });
                await mutate('/admin/plans');
                close();
              } finally {
                setSaving(null);
              }
            }}
            onClose={close}
            saving={saving === planName}
          />
        ),
        size: 'xl',
      });
  }, [data, fetch, mutate, openModal, t, saving, setSaving]);

  const handleCreate = useCallback(() => {
    openModal({
      title: t('create_plan', 'Create New Plan'),
      children: (close: any) => (
        <PlanFormModal
          initial={{ ...defaultForm }}
          onSave={async (formData) => {
            try {
              await fetch('/admin/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
              });
              await mutate('/admin/plans');
              close();
            } catch (err) {
              console.error('Failed to create plan', err);
            }
          }}
          onClose={close}
          saving={false}
        />
      ),
      size: 'xl',
    });
  }, [fetch, mutate, openModal, t]);

  const handleDelete = useCallback(async (planName: string) => {
    if (!await deleteDialog(
      t('delete_plan_confirm', `Delete plan "${planName}"? This cannot be undone.`),
      t('delete', 'Delete'),
      t('confirm_delete', 'Confirm Delete'),
      t('cancel', 'Cancel')
    )) return;

    try {
      const plan = data?.plans?.[planName];
      if (!plan?.id) return;
      await fetch(`/admin/plans/${plan.id}`, { method: 'DELETE' });
      await mutate('/admin/plans');
    } catch (err) {
      console.error('Failed to delete plan', err);
    }
  }, [data, fetch, mutate, t]);

  const handleSetDefault = useCallback(async (planName: string) => {
    const plan = data?.plans?.[planName];
    if (!plan?.id) return;
    await fetch(`/admin/plans/${plan.id}/default`, { method: 'POST' });
    await mutate('/admin/plans');
  }, [data, fetch, mutate]);

  if (error) {
    return <div className="text-red-400 p-4">Failed to load plans</div>;
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const plans = data.plans || {};
  const planEntries = Object.entries(plans) as [string, any][];

  return (
    <div className="space-y-[30px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-newTextColor">
            {t('plan_management', 'Plans & Features')}
          </h1>
          <p className="text-newTextColor/60 mt-[8px]">
            {t('plan_management_desc', 'Configure pricing tiers and feature limits for each subscription plan')}
          </p>
        </div>
        <Button onClick={handleCreate} className="!bg-green-600 hover:!bg-green-700">
          + Create Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-[20px]">
        {planEntries.map(([planName, plan]) => (
          <div
            key={planName}
            className="bg-menuBg rounded-[12px] border border-tableBorder overflow-hidden"
          >
            <div className="p-[20px] border-b border-tableBorder flex items-center justify-between">
              <div className="flex items-center gap-[12px]">
                <h3 className="text-[18px] font-bold text-newTextColor">{planName}</h3>
                <span className="text-newTextColor/60 text-[14px]">
                  ${plan.month_price || 0}/mo · ${plan.year_price || 0}/yr
                </span>
                {plan.isDefault && (
                  <span className="inline-flex items-center px-[10px] py-[4px] rounded-full text-[12px] font-medium bg-blue-500/20 text-blue-400">
                    Default
                  </span>
                )}
                {!plan.isActive && (
                  <span className="inline-flex items-center px-[10px] py-[4px] rounded-full text-[12px] font-medium bg-red-500/20 text-red-400">
                    Disabled
                  </span>
                )}
              </div>
              <div className="flex gap-[8px]">
                {!plan.isDefault && (
                  <button
                    onClick={() => handleSetDefault(planName)}
                    className="text-[13px] px-[16px] py-[6px] rounded-[6px] border border-tableBorder text-newTextColor/70 hover:bg-tableBorder transition-colors"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleEdit(planName)}
                  className="text-[13px] px-[16px] py-[6px] rounded-[6px] border border-tableBorder text-newTextColor/70 hover:bg-tableBorder transition-colors"
                >
                  Edit
                </button>
                {!['FREE', 'STANDARD', 'PRO', 'TEAM', 'ULTIMATE'].includes(planName) && (
                  <button
                    onClick={() => handleDelete(planName)}
                    className="text-[13px] px-[16px] py-[6px] rounded-[6px] border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div className="p-[20px]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-[16px]">
                {Object.entries(featureLabels).map(([key, { label, type }]) => {
                  const value = plan[key];
                  return (
                    <div key={key} className="flex flex-col gap-[4px]">
                      <div className="text-[12px] text-newTextColor/50 font-medium uppercase tracking-wider">
                        {label}
                      </div>
                      {type === 'boolean' ? (
                        <span className={`text-[14px] font-medium ${value ? 'text-green-400' : 'text-red-400'}`}>
                          {value ? '✓ Enabled' : '✕ Disabled'}
                        </span>
                      ) : type === 'price' ? (
                        <span className="text-[16px] font-bold text-newTextColor">${value || 0}</span>
                      ) : (
                        <span className="text-[16px] font-bold text-newTextColor">
                          {value === 999999 ? '∞' : value || 0}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PlanFormModal = ({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: PlanFeatures;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) => {
  const t = useT();
  const [form, setForm] = useState<PlanFeatures>(initial);

  const handleChange = (key: string, value: any) => {
    setForm({ ...form, [key]: value });
  };

  const handleBoolean = (key: string) => {
    setForm({ ...form, [key]: !(form as any)[key] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      monthPrice: form.monthPrice,
      yearPrice: form.yearPrice,
      maxChannels: form.maxChannels,
      maxOrganizations: form.maxOrganizations,
      maxPlatforms: form.maxPlatforms,
      postsPerMonth: form.postsPerMonth,
      teamMembers: form.teamMembers,
      communityFeatures: form.communityFeatures,
      featuredByAppswifts: form.featuredByAppswifts,
      ai: form.ai,
      importFromChannels: form.importFromChannels,
      imageGenerator: form.imageGenerator,
      imageGenerationCount: form.imageGenerationCount,
      generateVideos: form.generateVideos,
      publicApi: form.publicApi,
      webhooks: form.webhooks,
      autoPost: form.autoPost,
      inbox: form.inbox,
      campaigns: form.campaigns,
      leads: form.leads,
      isDefault: form.isDefault,
      isActive: form.isActive,
      polarProductMonthlyId: form.polarProductMonthlyId || undefined,
      polarProductYearlyId: form.polarProductYearlyId || undefined,
      description: form.description,
      name: form.name,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-[20px] max-h-[70vh] overflow-y-auto p-[4px]">
      {!initial.id && (
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px] font-medium text-newTextColor">Plan Name</div>
          <input
            className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value.toUpperCase())}
            placeholder="e.g. ENTERPRISE"
            required
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-[16px]">
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px] font-medium text-newTextColor">Monthly Price ($)</div>
          <input
            type="number"
            className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
            value={form.monthPrice}
            onChange={(e) => handleChange('monthPrice', parseInt(e.target.value) || 0)}
            min={0}
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px] font-medium text-newTextColor">Yearly Price ($)</div>
          <input
            type="number"
            className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
            value={form.yearPrice}
            onChange={(e) => handleChange('yearPrice', parseInt(e.target.value) || 0)}
            min={0}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[16px]">
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px] font-medium text-newTextColor">Max Channels</div>
          <input
            type="number"
            className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
            value={form.maxChannels}
            onChange={(e) => handleChange('maxChannels', parseInt(e.target.value) || 0)}
            min={0}
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px] font-medium text-newTextColor">Max Organizations</div>
          <input
            type="number"
            className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
            value={form.maxOrganizations}
            onChange={(e) => handleChange('maxOrganizations', parseInt(e.target.value) || 1)}
            min={1}
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px] font-medium text-newTextColor">Max Platform Types</div>
          <input
            type="number"
            className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
            value={form.maxPlatforms}
            onChange={(e) => handleChange('maxPlatforms', parseInt(e.target.value) || 0)}
            min={0}
          />
        </div>
      </div>

      <div className="flex flex-col gap-[6px]">
        <div className="text-[14px] font-medium text-newTextColor">Posts per Month</div>
        <input
          type="number"
          className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
          value={form.postsPerMonth}
          onChange={(e) => handleChange('postsPerMonth', parseInt(e.target.value) || 0)}
          min={0}
        />
      </div>

      <div className="grid grid-cols-3 gap-[16px]">
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px] font-medium text-newTextColor">Image Generations</div>
          <input
            type="number"
            className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
            value={form.imageGenerationCount}
            onChange={(e) => handleChange('imageGenerationCount', parseInt(e.target.value) || 0)}
            min={0}
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px] font-medium text-newTextColor">Video Generations</div>
          <input
            type="number"
            className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
            value={form.generateVideos}
            onChange={(e) => handleChange('generateVideos', parseInt(e.target.value) || 0)}
            min={0}
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px] font-medium text-newTextColor">Webhooks</div>
          <input
            type="number"
            className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
            value={form.webhooks}
            onChange={(e) => handleChange('webhooks', parseInt(e.target.value) || 0)}
            min={0}
          />
        </div>
      </div>

      <div className="text-[14px] font-medium text-newTextColor mt-[16px] mb-[8px]">Feature Toggles</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-[12px]">
        {[
          { key: 'teamMembers', label: 'Team Members' },
          { key: 'communityFeatures', label: 'Community Features' },
          { key: 'featuredByAppswifts', label: 'Featured by AppSwifts' },
          { key: 'ai', label: 'AI Features' },
          { key: 'importFromChannels', label: 'Import from Channels' },
          { key: 'imageGenerator', label: 'Image Generator' },
          { key: 'publicApi', label: 'Public API' },
          { key: 'autoPost', label: 'Auto Post' },
          { key: 'inbox', label: 'Inbox' },
          { key: 'campaigns', label: 'Campaigns' },
          { key: 'leads', label: 'Leads' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between p-[12px] bg-newBgColorInner rounded-[8px] border border-newTableBorder cursor-pointer">
            <span className="text-[14px] text-newTextColor">{label}</span>
            <input
              type="checkbox"
              checked={(form as any)[key] || false}
              onChange={() => handleBoolean(key)}
              className="w-4 h-4"
            />
          </label>
        ))}
      </div>

      <div className="text-[14px] font-medium text-newTextColor mt-[16px] mb-[8px]">Polar Product IDs</div>
      <div className="grid grid-cols-2 gap-[16px]">
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px]">Monthly Product ID</div>
          <input
            className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor font-mono text-[12px]"
            value={form.polarProductMonthlyId}
            onChange={(e) => handleChange('polarProductMonthlyId', e.target.value)}
            placeholder="polar_product_id_monthly"
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px]">Yearly Product ID</div>
          <input
            className="h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor font-mono text-[12px]"
            value={form.polarProductYearlyId}
            onChange={(e) => handleChange('polarProductYearlyId', e.target.value)}
            placeholder="polar_product_id_yearly"
          />
        </div>
      </div>

      <div className="flex items-center gap-[12px] mt-[8px]">
        <label className="flex items-center gap-[8px] cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => handleChange('isActive', e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-[14px] text-newTextColor">Active</span>
        </label>
        <label className="flex items-center gap-[8px] cursor-pointer">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => handleChange('isDefault', e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-[14px] text-newTextColor">Set as Default</span>
        </label>
      </div>

      <div className="flex gap-[12px] justify-end pt-[16px] border-t border-tableBorder">
        <button
          type="button"
          onClick={() => onClose()}
          className="text-[14px] px-[20px] py-[10px] rounded-[8px] border border-tableBorder text-newTextColor/70 hover:bg-tableBorder transition-colors"
        >
          Cancel
        </button>
        <Button type="submit" loading={saving}>
          {initial.id ? 'Update Plan' : 'Create Plan'}
        </Button>
      </div>
    </form>
  );
};
