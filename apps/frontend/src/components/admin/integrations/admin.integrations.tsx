'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSWRConfig } from 'swr';

export const AdminIntegrations = () => {
    const fetch = useFetch();
    const { mutate } = useSWRConfig();
    const t = useT();
    const [page, setPage] = useState(1);
    const [providerFilter, setProviderFilter] = useState('');

    const fetchIntegrations = useCallback(async () => {
        const params = new URLSearchParams({ page: String(page), limit: '30' });
        if (providerFilter) params.set('provider', providerFilter);
        return await (await fetch(`/admin/integrations?${params}`)).json();
    }, [fetch, page, providerFilter]);

    const { data } = useSWR(`/admin/integrations?page=${page}&provider=${providerFilter}`, fetchIntegrations);

    const toggleIntegrationStatus = async (id: string, disabled: boolean) => {
        if (!confirm(disabled ? 'Enable this integration?' : 'Disable this integration?')) return;
        try {
            await fetch(`/admin/integrations/${id}/${disabled ? 'enable' : 'disable'}`, { method: 'POST' });
            await mutate(`/admin/integrations?page=${page}&provider=${providerFilter}`);
        } catch (e) {
            alert('Failed to update integration status');
        }
    };

    return (
        <div className="space-y-[30px]">
            <div>
                <h1 className="text-[24px] font-bold text-newTextColor">
                    {t('integration_health', 'Integration Health Monitor')}
                </h1>
                <p className="text-newTextColor/60 mt-[8px]">
                    {t('integration_health_desc', 'Monitor connected third-party platforms across all organizations')}
                </p>
            </div>

            <div className="flex gap-[12px] items-center">
                <select
                    className="h-[42px] w-[200px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor"
                    value={providerFilter}
                    onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
                >
                    <option value="">All Providers</option>
                    <option value="twitter">X (Twitter)</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="pinterest">Pinterest</option>
                    <option value="youtube">YouTube</option>
                </select>
            </div>

            <div className="bg-menuBg rounded-[12px] border border-tableBorder overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-tableBorder">
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">Provider</th>
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">Organization</th>
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">Profile Name</th>
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">Status</th>
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">Posts</th>
                                <th className="text-right p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!data ? (
                                <tr>
                                    <td colSpan={6} className="p-[40px] text-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                                    </td>
                                </tr>
                            ) : data.integrations?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-[40px] text-center text-newTextColor/50">No integrations found</td>
                                </tr>
                            ) : (
                                data.integrations?.map((int: any) => (
                                    <tr key={int.id} className="border-b border-tableBorder/50 hover:bg-tableBorder/30">
                                        <td className="p-[16px] capitalize font-medium">{int.provider}</td>
                                        <td className="p-[16px] text-newTextColor/70">{int.organizationName || 'Unknown'}</td>
                                        <td className="p-[16px] text-newTextColor/70">{int.profile || int.name}</td>
                                        <td className="p-[16px]">
                                            {int.disabled ? (
                                                <span className="inline-flex px-[8px] py-[2px] rounded text-[12px] bg-red-500/20 text-red-400">Disabled</span>
                                            ) : int.refreshNeeded ? (
                                                <span className="inline-flex px-[8px] py-[2px] rounded text-[12px] bg-yellow-500/20 text-yellow-400">Token Needs Refresh</span>
                                            ) : (
                                                <span className="inline-flex px-[8px] py-[2px] rounded text-[12px] bg-green-500/20 text-green-400">Healthy</span>
                                            )}
                                        </td>
                                        <td className="p-[16px] text-newTextColor/70">{int.postCount}</td>
                                        <td className="p-[16px] text-right">
                                            <button
                                                onClick={() => toggleIntegrationStatus(int.id, int.disabled)}
                                                className={`text-[12px] px-[12px] py-[6px] rounded border ${int.disabled ? 'border-green-500/50 text-green-400 hover:bg-green-500/10' : 'border-red-500/50 text-red-400 hover:bg-red-500/10'}`}
                                            >
                                                {int.disabled ? 'Enable' : 'Disable'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {data && data.total > 30 && (
                <div className="flex items-center justify-between">
                    <div className="text-[13px] text-newTextColor/50">
                        Showing {((page - 1) * 30) + 1}–{Math.min(page * 30, data.total)} of {data.total}
                    </div>
                    <div className="flex gap-[8px]">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="text-[13px] px-[14px] py-[8px] rounded-[6px] border border-tableBorder hover:bg-tableBorder disabled:opacity-30"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={page * 30 >= data.total}
                            className="text-[13px] px-[14px] py-[8px] rounded-[6px] border border-tableBorder hover:bg-tableBorder disabled:opacity-30"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
