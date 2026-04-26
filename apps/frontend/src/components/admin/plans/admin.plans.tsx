'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';

interface PlanFeatures {
    month_price: number;
    year_price: number;
    channel: number;
    posts_per_month: number;
    team_members: boolean;
    community_features: boolean;
    featured_by_appswifts: boolean;
    ai: boolean;
    import_from_channels: boolean;
    image_generator: boolean;
    image_generation_count: number;
    generate_videos: number;
    public_api: boolean;
    webhooks: number;
    autoPost: boolean;
    inbox: boolean;
    campaigns: boolean;
    leads: boolean;
    [key: string]: any;
}

const tiers = ['FREE', 'STANDARD', 'TEAM', 'PRO', 'ULTIMATE'] as const;

const featureLabels: Record<string, { label: string; type: 'number' | 'boolean' | 'price' }> = {
    month_price: { label: 'Monthly Price ($)', type: 'price' },
    year_price: { label: 'Yearly Price ($)', type: 'price' },
    channel: { label: 'Max Channels', type: 'number' },
    posts_per_month: { label: 'Posts per Month', type: 'number' },
    team_members: { label: 'Team Members', type: 'boolean' },
    community_features: { label: 'Community Features', type: 'boolean' },
    featured_by_appswifts: { label: 'Featured by AppSwifts', type: 'boolean' },
    ai: { label: 'AI Features', type: 'boolean' },
    import_from_channels: { label: 'Import from Channels', type: 'boolean' },
    image_generator: { label: 'Image Generator', type: 'boolean' },
    image_generation_count: { label: 'Image Generations', type: 'number' },
    generate_videos: { label: 'Video Generations', type: 'number' },
    public_api: { label: 'Public API', type: 'boolean' },
    webhooks: { label: 'Webhooks', type: 'number' },
    autoPost: { label: 'Auto Post', type: 'boolean' },
    inbox: { label: 'Inbox', type: 'boolean' },
    campaigns: { label: 'Campaigns', type: 'boolean' },
    leads: { label: 'Leads', type: 'boolean' },
};

export const AdminPlans = () => {
    const fetch = useFetch();
    const { mutate } = useSWRConfig();
    const t = useT();
    const [saving, setSaving] = useState<string | null>(null);
    const [editingTier, setEditingTier] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<PlanFeatures>>({});

    const fetchPlans = useCallback(async () => {
        const res = await (await fetch('/admin/plans')).json();
        return res;
    }, [fetch]);

    const { data, error } = useSWR('/admin/plans', fetchPlans);

    const handleEdit = (tier: string) => {
        setEditingTier(tier);
        setEditForm({ ...(data?.plans?.[tier] || {}) });
    };

    const handleSave = async (tier: string) => {
        setSaving(tier);
        try {
            await fetch(`/admin/plans/${tier}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            await mutate('/admin/plans');
            setEditingTier(null);
        } catch (err) {
            console.error('Failed to save plan', err);
        } finally {
            setSaving(null);
        }
    };

    const handleCancel = () => {
        setEditingTier(null);
        setEditForm({});
    };

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

    return (
        <div className="space-y-[30px]">
            <div>
                <h1 className="text-[24px] font-bold text-newTextColor">
                    {t('plan_management', 'Plans & Features')}
                </h1>
                <p className="text-newTextColor/60 mt-[8px]">
                    {t('plan_management_desc', 'Configure pricing tiers and feature limits for each subscription plan')}
                </p>
                {data.isCustom && (
                    <span className="inline-flex items-center px-[10px] py-[4px] rounded-full text-[12px] font-medium bg-green-500/20 text-green-400 mt-[8px]">
                        Custom Plans Active
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 gap-[20px]">
                {tiers.map((tier) => {
                    const plan = plans[tier] || {};
                    const isEditing = editingTier === tier;

                    return (
                        <div
                            key={tier}
                            className="bg-menuBg rounded-[12px] border border-tableBorder overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-[20px] border-b border-tableBorder flex items-center justify-between">
                                <div className="flex items-center gap-[12px]">
                                    <h3 className="text-[18px] font-bold text-newTextColor">{tier}</h3>
                                    <span className="text-newTextColor/60 text-[14px]">
                                        ${plan.month_price || 0}/mo · ${plan.year_price || 0}/yr
                                    </span>
                                </div>
                                <div className="flex gap-[8px]">
                                    {isEditing ? (
                                        <>
                                            <Button
                                                onClick={() => handleSave(tier)}
                                                loading={saving === tier}
                                                className="!bg-green-600 hover:!bg-green-700 !text-[13px] !px-[16px] !py-[6px]"
                                            >
                                                Save
                                            </Button>
                                            <button
                                                onClick={handleCancel}
                                                className="text-[13px] px-[16px] py-[6px] rounded-[6px] border border-tableBorder text-newTextColor/70 hover:bg-tableBorder transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleEdit(tier)}
                                            className="text-[13px] px-[16px] py-[6px] rounded-[6px] border border-tableBorder text-newTextColor/70 hover:bg-tableBorder transition-colors"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Features Grid */}
                            <div className="p-[20px]">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-[16px]">
                                    {Object.entries(featureLabels).map(([key, { label, type }]) => {
                                        const value = isEditing ? (editForm[key] ?? plan[key]) : plan[key];

                                        return (
                                            <div key={key} className="flex flex-col gap-[4px]">
                                                <div className="text-[12px] text-newTextColor/50 font-medium uppercase tracking-wider">
                                                    {label}
                                                </div>
                                                {isEditing ? (
                                                    type === 'boolean' ? (
                                                        <label className="relative inline-flex items-center cursor-pointer mt-[4px]">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!value}
                                                                onChange={(e) =>
                                                                    setEditForm({ ...editForm, [key]: e.target.checked })
                                                                }
                                                                className="sr-only peer"
                                                            />
                                                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
                                                        </label>
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            value={value ?? 0}
                                                            onChange={(e) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    [key]: parseFloat(e.target.value) || 0,
                                                                })
                                                            }
                                                            className="h-[36px] w-full bg-newBgColorInner px-[12px] outline-none border-newTableBorder border rounded-[6px] text-[14px] text-textColor"
                                                        />
                                                    )
                                                ) : type === 'boolean' ? (
                                                    <span
                                                        className={`text-[14px] font-medium ${value ? 'text-green-400' : 'text-red-400'
                                                            }`}
                                                    >
                                                        {value ? '✓ Enabled' : '✕ Disabled'}
                                                    </span>
                                                ) : type === 'price' ? (
                                                    <span className="text-[16px] font-bold text-newTextColor">
                                                        ${value || 0}
                                                    </span>
                                                ) : (
                                                    <span className="text-[16px] font-bold text-newTextColor">
                                                        {value === 9999 ? '∞' : value || 0}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
