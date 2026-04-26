'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface AuditLogEntry {
    id: string;
    action: string;
    targetId: string | null;
    details: any;
    createdAt: string;
    admin: {
        id: string;
        email: string;
        name: string | null;
    };
}

const actionColors: Record<string, string> = {
    'user.suspend': 'bg-red-500/20 text-red-400',
    'user.activate': 'bg-green-500/20 text-green-400',
    'user.toggle-admin': 'bg-purple-500/20 text-purple-400',
    'subscription.create': 'bg-blue-500/20 text-blue-400',
    'subscription.update': 'bg-yellow-500/20 text-yellow-400',
    'subscription.cancel': 'bg-red-500/20 text-red-400',
    'plan.update': 'bg-indigo-500/20 text-indigo-400',
    'settings.update': 'bg-cyan-500/20 text-cyan-400',
    'organization.trial': 'bg-orange-500/20 text-orange-400',
};

export const AdminAuditLog = () => {
    const fetch = useFetch();
    const t = useT();
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');

    const fetchLogs = useCallback(async () => {
        const params = new URLSearchParams({ page: String(page), limit: '30' });
        if (actionFilter) params.set('action', actionFilter);
        const res = await (await fetch(`/admin/audit-log?${params}`)).json();
        return res;
    }, [fetch, page, actionFilter]);

    const { data, error } = useSWR(`/admin/audit-log?page=${page}&action=${actionFilter}`, fetchLogs);

    if (error) {
        return <div className="text-red-400 p-4">Failed to load audit log</div>;
    }

    return (
        <div className="space-y-[30px]">
            <div>
                <h1 className="text-[24px] font-bold text-newTextColor">
                    {t('audit_log', 'Audit Log')}
                </h1>
                <p className="text-newTextColor/60 mt-[8px]">
                    {t('audit_log_desc', 'Track all administrative actions performed on the platform')}
                </p>
            </div>

            {/* Filters */}
            <div className="flex gap-[12px] items-center">
                <input
                    className="h-[42px] w-[300px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor placeholder:text-newTextColor/40"
                    placeholder="Filter by action (e.g. user.suspend)"
                    value={actionFilter}
                    onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                />
                {actionFilter && (
                    <button
                        onClick={() => { setActionFilter(''); setPage(1); }}
                        className="text-[13px] px-[12px] py-[8px] rounded-[6px] border border-tableBorder text-newTextColor/70 hover:bg-tableBorder transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-menuBg rounded-[12px] border border-tableBorder overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-tableBorder">
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">
                                    Time
                                </th>
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">
                                    Admin
                                </th>
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">
                                    Action
                                </th>
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">
                                    Target
                                </th>
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {!data ? (
                                <tr>
                                    <td colSpan={5} className="p-[40px] text-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                                    </td>
                                </tr>
                            ) : data.logs?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-[40px] text-center text-newTextColor/50">
                                        No audit log entries found
                                    </td>
                                </tr>
                            ) : (
                                data.logs?.map((log: AuditLogEntry) => (
                                    <tr key={log.id} className="border-b border-tableBorder/50 hover:bg-tableBorder/30 transition-colors">
                                        <td className="p-[16px] text-[13px] text-newTextColor/70 whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td className="p-[16px]">
                                            <div className="text-[13px] text-newTextColor font-medium">
                                                {log.admin?.name || 'Unknown'}
                                            </div>
                                            <div className="text-[12px] text-newTextColor/50">
                                                {log.admin?.email}
                                            </div>
                                        </td>
                                        <td className="p-[16px]">
                                            <span className={`inline-flex px-[10px] py-[3px] rounded-full text-[12px] font-medium ${actionColors[log.action] || 'bg-gray-500/20 text-gray-400'}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-[16px] text-[13px] text-newTextColor/70 font-mono">
                                            {log.targetId ? (
                                                <span title={log.targetId}>
                                                    {log.targetId.substring(0, 12)}...
                                                </span>
                                            ) : (
                                                <span className="text-newTextColor/30">—</span>
                                            )}
                                        </td>
                                        <td className="p-[16px] text-[12px] text-newTextColor/60 max-w-[300px] truncate">
                                            {log.details ? (
                                                <code className="bg-newBgColorInner px-[6px] py-[2px] rounded text-[11px]">
                                                    {JSON.stringify(log.details).substring(0, 80)}
                                                </code>
                                            ) : (
                                                <span className="text-newTextColor/30">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {data && data.total > 30 && (
                <div className="flex items-center justify-between">
                    <div className="text-[13px] text-newTextColor/50">
                        Showing {((page - 1) * 30) + 1}–{Math.min(page * 30, data.total)} of {data.total}
                    </div>
                    <div className="flex gap-[8px]">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="text-[13px] px-[14px] py-[8px] rounded-[6px] border border-tableBorder text-newTextColor/70 hover:bg-tableBorder transition-colors disabled:opacity-30"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={page * 30 >= data.total}
                            className="text-[13px] px-[14px] py-[8px] rounded-[6px] border border-tableBorder text-newTextColor/70 hover:bg-tableBorder transition-colors disabled:opacity-30"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
