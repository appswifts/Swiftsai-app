'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const AdminErrors = () => {
    const fetch = useFetch();
    const t = useT();
    const [page, setPage] = useState(1);

    const fetchErrors = useCallback(async () => {
        return await (await fetch(`/admin/errors?page=${page}&limit=50`)).json();
    }, [fetch, page]);

    const fetchStats = useCallback(async () => {
        return await (await fetch('/admin/errors/stats')).json();
    }, [fetch]);

    const { data: errorData } = useSWR(`/admin/errors?page=${page}`, fetchErrors);
    const { data: stats } = useSWR('/admin/errors/stats', fetchStats);

    return (
        <div className="space-y-[30px]">
            <div>
                <h1 className="text-[24px] font-bold text-newTextColor">
                    {t('system_errors', 'System Errors')}
                </h1>
                <p className="text-newTextColor/60 mt-[8px]">
                    {t('system_errors_desc', 'Monitor backend exceptions and workflow failures')}
                </p>
            </div>

            <div className="grid grid-cols-3 gap-[20px]">
                <div className="bg-menuBg p-[20px] rounded-[12px] border border-tableBorder">
                    <div className="text-[13px] text-newTextColor/50 uppercase font-medium tracking-wider mb-[4px]">Last 24 Hours</div>
                    <div className="text-[32px] font-bold text-red-400">{stats ? stats.last24h : '-'}</div>
                </div>
                <div className="bg-menuBg p-[20px] rounded-[12px] border border-tableBorder">
                    <div className="text-[13px] text-newTextColor/50 uppercase font-medium tracking-wider mb-[4px]">Last 7 Days</div>
                    <div className="text-[32px] font-bold text-orange-400">{stats ? stats.last7d : '-'}</div>
                </div>
                <div className="bg-menuBg p-[20px] rounded-[12px] border border-tableBorder">
                    <div className="text-[13px] text-newTextColor/50 uppercase font-medium tracking-wider mb-[4px]">All Time</div>
                    <div className="text-[32px] font-bold text-newTextColor">{stats ? stats.total : '-'}</div>
                </div>
            </div>

            <div className="bg-menuBg rounded-[12px] border border-tableBorder overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-tableBorder">
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium w-[150px]">Time</th>
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium w-[200px]">Organization</th>
                                <th className="text-left p-[16px] text-[12px] text-newTextColor/50 uppercase tracking-wider font-medium">Error Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!errorData ? (
                                <tr>
                                    <td colSpan={3} className="p-[40px] text-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                                    </td>
                                </tr>
                            ) : errorData.errors?.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-[40px] text-center text-newTextColor/50">No system errors logged</td>
                                </tr>
                            ) : (
                                errorData.errors?.map((err: any) => (
                                    <tr key={err.id} className="border-b border-tableBorder/50 hover:bg-tableBorder/30">
                                        <td className="p-[16px] text-[13px] text-newTextColor/70">
                                            {new Date(err.createdAt).toLocaleString()}
                                        </td>
                                        <td className="p-[16px] text-[13px] font-medium text-newTextColor/90">
                                            {err.organization?.name || 'Unknown / System'}
                                        </td>
                                        <td className="p-[16px]">
                                            <div className="text-[13px] font-mono text-red-400 bg-red-400/10 p-[12px] border border-red-500/20 rounded-[6px] overflow-hidden">
                                                <div className="max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                                                    {err.error}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {errorData && errorData.total > 50 && (
                <div className="flex items-center justify-between">
                    <div className="text-[13px] text-newTextColor/50">
                        Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, errorData.total)} of {errorData.total}
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
                            disabled={page * 50 >= errorData.total}
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
