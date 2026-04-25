'use client';

import React from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';

interface Props {
  orgId: string;
  onClose: () => void;
}

interface OrgDetailIntegration {
  name: string;
  providerIdentifier: string;
  customer?: {
    name?: string;
  };
}

interface OrgDetailPost {
  id: string;
  title?: string;
  content?: string;
  publishDate: string;
  integration: {
    name: string;
    providerIdentifier: string;
  };
}

interface OrgDetailUser {
  id: string;
  email: string;
  name: string;
}

interface OrgDetail {
  id: string;
  name: string;
  description: string | null;
  subscription: any | null;
  Integration: OrgDetailIntegration[];
  users: Array<{
    user: OrgDetailUser;
    role: string;
  }>;
  media: any[];
  post: OrgDetailPost[];
}

export const OrganizationDetails = ({ orgId, onClose }: Props) => {
  const fetch = useFetch();
  const t = useT();

  const loadOrg = async () => {
    const res = await fetch(`/admin/organizations/${orgId}`);
    if (!res.ok) throw new Error('Failed to load');
    return res.json() as Promise<OrgDetail>;
  };

  const { data: org, isLoading } = useSWR<OrgDetail>(`/admin/organizations/${orgId}`, loadOrg, {
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-newTextColor/50">{t('loading', 'Loading...')}</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-newTextColor/50 text-center py-12">
        {t('organization_not_found', 'Organization not found')}
      </div>
    );
  }

  return (
    <div className="space-y-[24px] p-[24px] max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[28px] font-bold text-newTextColor mb-[8px]">
            {org.name}
          </h2>
          {org.description && (
            <p className="text-newTextColor/60 text-[16px]">{org.description}</p>
          )}
          <div className="flex gap-[8px] mt-[12px]">
            {org.subscription && (
              <div className="inline-block text-[12px] bg-blue-500/20 text-blue-500 px-[8px] py-[4px] rounded-full font-medium">
                {org.subscription.subscriptionTier} - {org.subscription.totalChannels} channels
              </div>
            )}
            <div className="text-[12px] bg-green-500/20 text-green-500 px-[8px] py-[4px] rounded-full font-medium">
              {org.Integration.length} integrations
            </div>
            <div className="text-[12px] bg-purple-500/20 text-purple-500 px-[8px] py-[4px] rounded-full font-medium">
              {org.post.length} posts
            </div>
          </div>
        </div>
        <Button onClick={onClose} secondary={true}>
          {t('close', 'Close')}
        </Button>
      </div>

      {/* Subscription Details */}
      <div className="bg-menuBg rounded-[12px] p-[20px] border border-tableBorder">
        <h3 className="text-[18px] font-bold text-newTextColor mb-[16px]">
          {t('subscription', 'Subscription')}
        </h3>
        {org.subscription ? (
          <div className="space-y-[12px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-newTextColor/60">Tier</div>
                <div className="font-medium">{org.subscription.subscriptionTier}</div>
              </div>
              <div>
                <div className="text-newTextColor/60">Period</div>
                <div className="font-medium">{org.subscription.period}</div>
              </div>
              <div>
                <div className="text-newTextColor/60">Channels</div>
                <div className="font-medium">{org.subscription.totalChannels}</div>
              </div>
              <div>
                <div className="text-newTextColor/60">Lifetime</div>
                <div className="font-medium">{org.subscription.isLifetime ? 'Yes' : 'No'}</div>
              </div>
            </div>
            {org.subscription.cancelAt && (
              <div className="mt-[12px] p-[12px] bg-red-500/10 border border-red-500/20 rounded-[8px] text-sm text-red-500">
                Cancels on {new Date(org.subscription.cancelAt).toLocaleDateString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-newTextColor/50 py-[20px] text-center">
            {t('no_subscription', 'No active subscription')}
          </div>
        )}
      </div>

      {/* Team Members */}
      <div className="bg-menuBg rounded-[12px] p-[20px] border border-tableBorder">
        <h3 className="text-[18px] font-bold text-newTextColor mb-[16px]">
          {t('team_members', 'Team Members')} ({org.users.length})
        </h3>
        <div className="space-y-[8px]">
          {org.users.map((userOrg) => (
            <div key={userOrg.user.id} className="flex items-center justify-between p-[12px] bg-tableBorder/30 rounded-[8px]">
              <div className="flex items-center gap-[12px]">
                <div className="w-[40px] h-[40px] bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                  {userOrg.user.name?.charAt(0) || userOrg.user.email.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-newTextColor">{userOrg.user.name || userOrg.user.email}</div>
                  <div className="text-newTextColor/60 text-[14px]">{userOrg.user.email}</div>
                </div>
              </div>
              <div className="text-[12px] bg-blue-500/20 text-blue-500 px-[6px] py-[2px] rounded-full font-medium">
                {userOrg.role}
              </div>
            </div>
          ))}
          {org.users.length === 0 && (
            <div className="text-newTextColor/50 py-[40px] text-center">
              {t('no_team_members', 'No team members')}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity: Integrations & Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
        {/* Integrations */}
        <div className="bg-menuBg rounded-[12px] p-[20px] border border-tableBorder">
          <h3 className="text-[18px] font-bold text-newTextColor mb-[16px]">
            {t('integrations', 'Integrations')} ({org.Integration.length})
          </h3>
          <div className="space-y-[8px] max-h-[200px] overflow-y-auto">
            {org.Integration.map((int) => (
              <div key={int.name} className="flex items-center gap-[12px] p-[12px] bg-tableBorder/30 rounded-[8px]">
                <div className="w-[32px] h-[32px] bg-gradient-to-r from-primary to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {int.providerIdentifier.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-newTextColor">{int.name}</div>
                  <div className="text-newTextColor/60 text-[14px]">{int.providerIdentifier}</div>
                  {int.customer?.name && <div className="text-xs text-newTextColor/50">{int.customer.name}</div>}
                </div>
              </div>
            ))}
            {org.Integration.length === 0 && (
              <div className="text-newTextColor/50 py-[40px] text-center">
                No integrations
              </div>
            )}
          </div>
        </div>

        {/* Recent Posts */}
        <div className="bg-menuBg rounded-[12px] p-[20px] border border-tableBorder">
          <h3 className="text-[18px] font-bold text-newTextColor mb-[16px]">
            {t('recent_posts', 'Recent Posts')} ({org.post.length})
          </h3>
          <div className="space-y-[8px] max-h-[200px] overflow-y-auto">
            {org.post.slice(0, 5).map((p) => (
              <div key={p.id} className="p-[12px] bg-tableBorder/30 rounded-[8px]">
                <div className="flex items-center gap-[8px] mb-[4px]">
                  <div className="w-[20px] h-[20px] bg-gradient-to-r from-green-500 to-emerald-500 rounded flex items-center justify-center text-white text-xs">
                    {p.integration.providerIdentifier.slice(0, 2)}
                  </div>
                  <div className="text-[13px] font-medium text-newTextColor">{p.integration.name}</div>
                </div>
                <div className="text-[12px] text-newTextColor/70 line-clamp-2">{p.content?.slice(0, 100)}...</div>
                <div className="text-[11px] text-newTextColor/50 mt-[4px]">
                  {new Date(p.publishDate).toLocaleDateString()}
                </div>
              </div>
            ))}
            {org.post.length === 0 && (
              <div className="text-newTextColor/50 py-[40px] text-center">
                No posts
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};