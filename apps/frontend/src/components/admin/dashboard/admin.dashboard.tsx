'use client';

import React, { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface AdminStats {
  users: {
    total: number;
    newLast30Days: number;
    newLast7Days: number;
  };
  organizations: {
    total: number;
    newLast30Days: number;
  };
  subscriptions: {
    total: number;
    active: number;
    mrr: number;
  };
  integrations: {
    total: number;
  };
  posts: {
    total: number;
  };
}

export const AdminDashboard = () => {
  const fetch = useFetch();
  const t = useT();

  const loadStats = useCallback(async () => {
    return await (await fetch('/admin/stats')).json();
  }, []);

  const { data: stats, isLoading } = useSWR<AdminStats>('/admin/stats', loadStats, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-newTextColor/50">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-newTextColor/50">Failed to load dashboard</div>
      </div>
    );
  }

  const statCards = [
    {
      title: t('total_users', 'Total Users'),
      value: stats.users.total.toLocaleString(),
      change: stats.users.newLast30Days,
      changeLabel: t('last_30_days', 'last 30 days'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-500',
    },
    {
      title: t('active_subscriptions', 'Active Subscriptions'),
      value: stats.subscriptions.active.toLocaleString(),
      change: Math.round((stats.subscriptions.active / Math.max(stats.subscriptions.total, 1)) * 100),
      changeLabel: t('conversion_rate', 'conversion rate'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2"/>
          <line x1="2" x2="22" y1="10" y2="10"/>
        </svg>
      ),
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-500',
    },
    {
      title: t('monthly_recurring_revenue', 'Monthly Recurring Revenue'),
      value: `$${stats.subscriptions.mrr.toLocaleString()}`,
      change: 0, // We'd need historical data for this
      changeLabel: t('mrr', 'MRR'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-500',
    },
    {
      title: t('total_organizations', 'Total Organizations'),
      value: stats.organizations.total.toLocaleString(),
      change: stats.organizations.newLast30Days,
      changeLabel: t('last_30_days', 'last 30 days'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-500',
    },
    {
      title: t('total_posts_scheduled', 'Total Posts Scheduled'),
      value: stats.posts.total.toLocaleString(),
      change: 0, // We'd need historical data
      changeLabel: t('all_time', 'all time'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
          <line x1="16" x2="16" y1="2" y2="6"/>
          <line x1="8" x2="8" y1="2" y2="6"/>
          <line x1="3" x2="21" y1="10" y2="10"/>
        </svg>
      ),
      bgColor: 'bg-pink-500/10',
      textColor: 'text-pink-500',
    },
    {
      title: t('total_integrations', 'Total Integrations'),
      value: stats.integrations.total.toLocaleString(),
      change: 0, // We'd need historical data
      changeLabel: t('active_channels', 'active channels'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15v5m-5 0h10m2-15v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5Zm10-2V1h2v2ZM5 3V1H3v2Zm8 8V7m-4 4V7"/>
        </svg>
      ),
      bgColor: 'bg-cyan-500/10',
      textColor: 'text-cyan-500',
    },
  ];

  return (
    <div className="space-y-[30px]">
      {/* Dashboard Header */}
      <div>
        <h1 className="text-[24px] font-bold text-newTextColor">
          {t('admin_dashboard', 'Admin Dashboard')}
        </h1>
        <p className="text-newTextColor/60 mt-[8px]">
          {t('platform_overview_and_analytics', 'Platform overview and analytics')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-menuBg rounded-[12px] p-[24px] border border-tableBorder"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-newTextColor/60 text-[14px] font-medium">
                  {card.title}
                </div>
                <div className="text-[28px] font-bold text-newTextColor mt-[8px]">
                  {card.value}
                </div>
                {card.change !== undefined && card.change !== 0 && (
                  <div className="flex items-center gap-[6px] mt-[12px]">
                    <span className={`text-[14px] font-medium ${card.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {card.change > 0 ? '+' : ''}{card.change}{typeof card.change === 'number' && card.change !== 0 ? '%' : ''}
                    </span>
                    <span className="text-newTextColor/50 text-[12px]">
                      {card.changeLabel}
                    </span>
                  </div>
                )}
              </div>
              <div className={`w-[48px] h-[48px] rounded-[12px] flex items-center justify-center ${card.bgColor} ${card.textColor}`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[30px]">
        {/* Quick Actions */}
        <div className="bg-menuBg rounded-[12px] p-[24px] border border-tableBorder">
          <h3 className="text-[18px] font-bold text-newTextColor mb-[20px]">
            {t('quick_actions', 'Quick Actions')}
          </h3>
          <div className="space-y-[12px]">
            <button
              onClick={() => window.location.href = '/admin/users'}
              className="w-full flex items-center justify-between p-[16px] rounded-[8px] bg-blue-500/10 hover:bg-blue-500/20 transition-colors group"
            >
              <div className="flex items-center gap-[12px]">
                <div className="w-[40px] h-[40px] rounded-[8px] bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-newTextColor font-medium">
                    {t('manage_users', 'Manage Users')}
                  </div>
                  <div className="text-newTextColor/50 text-[12px]">
                    {t('view_suspend_activate_users', 'View, suspend, or activate users')}
                  </div>
                </div>
              </div>
              <div className="text-newTextColor/30 group-hover:text-newTextColor/60 transition-colors">
                →
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/organizations'}
              className="w-full flex items-center justify-between p-[16px] rounded-[8px] bg-green-500/10 hover:bg-green-500/20 transition-colors group"
            >
              <div className="flex items-center gap-[12px]">
                <div className="w-[40px] h-[40px] rounded-[8px] bg-green-500/20 flex items-center justify-center text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-newTextColor font-medium">
                    {t('manage_organizations', 'Manage Organizations')}
                  </div>
                  <div className="text-newTextColor/50 text-[12px]">
                    {t('view_edit_tenant_organizations', 'View and edit tenant organizations')}
                  </div>
                </div>
              </div>
              <div className="text-newTextColor/30 group-hover:text-newTextColor/60 transition-colors">
                →
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/subscriptions'}
              className="w-full flex items-center justify-between p-[16px] rounded-[8px] bg-purple-500/10 hover:bg-purple-500/20 transition-colors group"
            >
              <div className="flex items-center gap-[12px]">
                <div className="w-[40px] h-[40px] rounded-[8px] bg-purple-500/20 flex items-center justify-center text-purple-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2"/>
                    <line x1="2" x2="22" y1="10" y2="10"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-newTextColor font-medium">
                    {t('manage_subscriptions', 'Manage Subscriptions')}
                  </div>
                  <div className="text-newTextColor/50 text-[12px]">
                    {t('manual_activation_plan_changes', 'Manual activation and plan changes')}
                  </div>
                </div>
              </div>
              <div className="text-newTextColor/30 group-hover:text-newTextColor/60 transition-colors">
                →
              </div>
            </button>
          </div>
        </div>

        {/* Platform Health */}
        <div className="bg-menuBg rounded-[12px] p-[24px] border border-tableBorder">
          <h3 className="text-[18px] font-bold text-newTextColor mb-[20px]">
            {t('platform_health', 'Platform Health')}
          </h3>
          <div className="space-y-[16px]">
            <div>
              <div className="flex justify-between items-center mb-[8px]">
                <span className="text-newTextColor font-medium">
                  {t('user_growth', 'User Growth')}
                </span>
                <span className="text-green-500 text-[14px] font-medium">
                  +{stats.users.newLast30Days} {t('last_30_days_short', '30d')}
                </span>
              </div>
              <div className="h-[6px] bg-newTableBorder rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${Math.min((stats.users.newLast30Days / Math.max(stats.users.total, 1)) * 100, 100)}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-[8px]">
                <span className="text-newTextColor font-medium">
                  {t('subscription_conversion', 'Subscription Conversion')}
                </span>
                <span className="text-blue-500 text-[14px] font-medium">
                  {Math.round((stats.subscriptions.active / Math.max(stats.organizations.total, 1)) * 100)}%
                </span>
              </div>
              <div className="h-[6px] bg-newTableBorder rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${Math.round((stats.subscriptions.active / Math.max(stats.organizations.total, 1)) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-[8px]">
                <span className="text-newTextColor font-medium">
                  {t('active_engagement', 'Active Engagement')}
                </span>
                <span className="text-amber-500 text-[14px] font-medium">
                  {stats.posts.total > 0 ? 'High' : 'No data'}
                </span>
              </div>
              <div className="h-[6px] bg-newTableBorder rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${Math.min((stats.posts.total / Math.max(stats.organizations.total * 10, 1)) * 100, 100)}%`
                  }}
                />
              </div>
            </div>

            <div className="pt-[16px] border-t border-tableBorder">
              <div className="text-newTextColor/60 text-[14px]">
                {t('platform_summary', 'Platform Summary')}:
              </div>
              <div className="mt-[8px] text-newTextColor">
                {t('healthy_growing_platform_with_x_users_and_x_orgs', `Healthy, growing platform with ${stats.users.total} users and ${stats.organizations.total} organizations.`)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};