'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { OrganizationDetails } from './organization.details';
import { ManageSubscription } from './manage.subscription';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  isTrailing: boolean;
  allowTrial: boolean;
  subscription: {
    subscriptionTier: string;
    period: string;
    totalChannels: number;
    isLifetime: boolean;
    cancelAt: string | null;
  } | null;
  integrationCount: number;
  postCount: number;
  teamMembers: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
  }>;
}

interface OrganizationsResponse {
  organizations: Organization[];
  total: number;
  page: number;
  limit: number;
}

export const AdminOrganizations = () => {
  const fetch = useFetch();
  const t = useT();
  const { openModal } = useModals();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const loadOrganizations = useCallback(async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    return await (await fetch(`/admin/organizations?${params}`)).json();
  }, [page, limit, search]);

  const { data: orgsData, isLoading, mutate } = useSWR<OrganizationsResponse>(
    `/admin/organizations?page=${page}&limit=${limit}&search=${search}`,
    loadOrganizations,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenOffline: false,
    }
  );

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleViewDetails = useCallback((orgId: string) => {
    openModal({
      title: t('organization_details', 'Organization Details'),
      children: (close) => <OrganizationDetails orgId={orgId} onClose={close} />,
      size: 'xl',
    });
  }, []);

  const handleManageSubscription = useCallback((orgId: string, subscription: any) => {
    openModal({
      title: t('manage_subscription', 'Manage Subscription'),
      children: (close) => <ManageSubscription orgId={orgId} currentSub={subscription} mutate={mutate} onClose={close} />,
      size: 'lg',
    });
  }, [t, openModal, mutate]);

  const totalPages = orgsData ? Math.ceil(orgsData.total / limit) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-newTextColor/50">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-[30px]">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-bold text-newTextColor">
          {t('organization_management', 'Organization Management')}
        </h1>
        <p className="text-newTextColor/60 mt-[8px]">
          {t('manage_all_tenant_organizations', 'Manage all tenant organizations')}
        </p>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[20px]">
        <div className="lg:col-span-2">
          <Input
            label={t('search_organizations', 'Search Organizations')}
            name="search"
            placeholder={t('search_by_name_or_email', 'Search by name or email...')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            disableForm={true}
          />
        </div>
        <div className="bg-menuBg rounded-[12px] p-[20px] border border-tableBorder">
          <div className="text-newTextColor/60 text-[14px]">
            {t('total_organizations', 'Total Organizations')}
          </div>
          <div className="text-[28px] font-bold text-newTextColor">
            {orgsData?.total.toLocaleString() || '0'}
          </div>
          <div className="text-newTextColor/40 text-[12px] mt-[4px]">
            {orgsData?.organizations.filter(o => o.subscription).length || 0} {t('with_subscription', 'with subscription')}
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-menuBg rounded-[12px] border border-tableBorder overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-tableBorder">
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">
                  {t('organization', 'Organization')}
                </th>
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">
                  {t('subscription', 'Subscription')}
                </th>
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">
                  {t('team', 'Team')}
                </th>
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">
                  {t('activity', 'Activity')}
                </th>
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">
                  {t('created', 'Created')}
                </th>
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">
                  {t('actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {orgsData?.organizations.map((org) => (
                <tr key={org.id} className="border-b border-tableBorder hover:bg-tableBorder/30 transition-colors">
                  <td className="p-[16px]">
                    <div>
                      <div className="font-medium text-newTextColor">
                        {org.name}
                      </div>
                      <div className="text-newTextColor/60 text-[14px]">
                        {org.description || t('no_description', 'No description')}
                      </div>
                      <div className="flex gap-[4px] mt-[4px]">
                        {org.isTrailing && (
                          <div className="inline-block text-[10px] bg-amber-500/20 text-amber-500 px-[6px] py-[2px] rounded-full">
                            {t('trial', 'Trial')}
                          </div>
                        )}
                        {org.allowTrial && (
                          <div className="inline-block text-[10px] bg-blue-500/20 text-blue-500 px-[6px] py-[2px] rounded-full">
                            {t('trial_allowed', 'Trial Allowed')}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-[16px]">
                    {org.subscription ? (
                      <div>
                        <div className="font-medium text-newTextColor">
                          {org.subscription.subscriptionTier}
                        </div>
                        <div className="text-newTextColor/60 text-[12px]">
                          {org.subscription.period} • {org.subscription.totalChannels} {t('channels', 'channels')}
                          {org.subscription.isLifetime && ' • ' + t('lifetime', 'Lifetime')}
                        </div>
                        {org.subscription.cancelAt && (
                          <div className="text-red-500 text-[11px] mt-[2px]">
                            {t('cancels_on', 'Cancels on')} {new Date(org.subscription.cancelAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-newTextColor/50 text-[14px]">
                        {t('no_subscription', 'No subscription')}
                      </div>
                    )}
                  </td>
                  <td className="p-[16px]">
                    <div className="space-y-[2px]">
                      {org.teamMembers.slice(0, 2).map((member) => (
                        <div key={member.id} className="text-[13px]">
                          <span className="text-newTextColor">{member.name || member.email}</span>
                          <span className="text-newTextColor/50 ml-[4px]">({member.role})</span>
                        </div>
                      ))}
                      {org.teamMembers.length > 2 && (
                        <div className="text-newTextColor/50 text-[12px]">
                          +{org.teamMembers.length - 2} {t('more', 'more')}
                        </div>
                      )}
                      {org.teamMembers.length === 0 && (
                        <div className="text-newTextColor/50 text-[12px]">
                          {t('no_team_members', 'No team members')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-[16px]">
                    <div className="space-y-[4px]">
                      <div className="text-[13px]">
                        <span className="text-newTextColor">{org.integrationCount}</span>
                        <span className="text-newTextColor/50 ml-[2px]">{t('integrations', 'integrations')}</span>
                      </div>
                      <div className="text-[13px]">
                        <span className="text-newTextColor">{org.postCount}</span>
                        <span className="text-newTextColor/50 ml-[2px]">{t('posts', 'posts')}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-[16px] text-newTextColor text-[14px]">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-[16px]">
                    <div className="flex flex-col gap-[6px]">
                      <Button
                        size="sm"
                        onClick={() => handleViewDetails(org.id)}
                        className="!bg-blue-500 hover:!bg-blue-600"
                      >
                        {t('view_details', 'View Details')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleManageSubscription(org.id, org.subscription)}
                        className="!bg-green-500 hover:!bg-green-600"
                      >
                        {t('manage_subscription', 'Manage Subscription')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-newTextColor/60 text-[14px]">
            {t('showing_x_of_y_organizations', `Showing ${orgsData?.organizations.length || 0} of ${orgsData?.total || 0} organizations`)}
          </div>
          <div className="flex gap-[8px]">
            <Button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              size="sm"
              className="!bg-menuBg hover:!bg-tableBorder"
            >
              {t('previous', 'Previous')}
            </Button>
            <div className="flex items-center gap-[4px]">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    size="sm"
                    className={`min-w-[40px] ${
                      page === pageNum
                        ? '!bg-primary text-white'
                        : '!bg-menuBg hover:!bg-tableBorder'
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              size="sm"
              className="!bg-menuBg hover:!bg-tableBorder"
            >
              {t('next', 'Next')}
            </Button>
          </div>
        </div>
      )}

      {!isLoading && orgsData?.organizations.length === 0 && (
        <div className="text-center py-[60px]">
          <div className="text-newTextColor/50 text-[18px]">
            {search ? t('no_organizations_found', 'No organizations found') : t('no_organizations_yet', 'No organizations yet')}
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-[12px] text-primary hover:underline"
            >
              {t('clear_search', 'Clear search')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};