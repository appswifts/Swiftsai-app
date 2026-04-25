'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR, { useSWRConfig } from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  isSuperAdmin: boolean;
  activated: boolean;
  organizations: Array<{
    id: string;
    name: string;
    subscriptionStatus: string | null;
    integrationCount: number;
  }>;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export const AdminUsers = () => {
  const fetch = useFetch();
  const t = useT();
  const { mutate } = useSWRConfig();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    return await (await fetch(`/admin/users?${params}`)).json();
  }, [page, limit, search]);

  const { data: usersData, isLoading } = useSWR<UsersResponse>(
    `/admin/users?page=${page}&limit=${limit}&search=${search}`,
    loadUsers,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenOffline: false,
    }
  );

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on new search
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSuspendUser = useCallback(async (userId: string, email: string) => {
    if (!await deleteDialog(
      t('suspend_user_confirm', `Are you sure you want to suspend user ${email}?`),
      t('suspend', 'Suspend'),
      t('confirm_suspend', 'Confirm Suspend'),
      t('cancel', 'Cancel')
    )) {
      return;
    }

    try {
      await fetch(`/admin/users/${userId}/suspend`, {
        method: 'PATCH',
      });
      mutate(`/admin/users?page=${page}&limit=${limit}&search=${search}`);
    } catch (error) {
      console.error('Failed to suspend user:', error);
    }
  }, [page, limit, search]);

  const handleActivateUser = useCallback(async (userId: string, email: string) => {
    if (!await deleteDialog(
      t('activate_user_confirm', `Are you sure you want to activate user ${email}?`),
      t('activate', 'Activate'),
      t('confirm_activate', 'Confirm Activate'),
      t('cancel', 'Cancel')
    )) {
      return;
    }

    try {
      await fetch(`/admin/users/${userId}/activate`, {
        method: 'PATCH',
      });
      mutate(`/admin/users?page=${page}&limit=${limit}&search=${search}`);
    } catch (error) {
      console.error('Failed to activate user:', error);
    }
  }, [page, limit, search]);

  const handleImpersonate = useCallback(async (userId: string) => {
    if (!await deleteDialog(
      t('impersonate_user_confirm', 'Impersonate this user? You will be logged in as them.'),
      t('impersonate', 'Impersonate'),
      t('confirm_impersonate', 'Confirm Impersonate'),
      t('cancel', 'Cancel')
    )) {
      return;
    }

    try {
      await fetch('/user/impersonate', {
        method: 'POST',
        body: JSON.stringify({ id: userId }),
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to impersonate user:', error);
    }
  }, []);

  const totalPages = usersData ? Math.ceil(usersData.total / limit) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-newTextColor/50">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-[30px]">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-bold text-newTextColor">
          {t('user_management', 'User Management')}
        </h1>
        <p className="text-newTextColor/60 mt-[8px]">
          {t('manage_all_platform_users', 'Manage all platform users')}
        </p>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[20px]">
        <div className="lg:col-span-2">
          <Input
            label={t('search_users', 'Search Users')}
            name="search"
            placeholder={t('search_by_email_or_name', 'Search by email or name...')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            disableForm={true}
          />
        </div>
        <div className="bg-menuBg rounded-[12px] p-[20px] border border-tableBorder">
          <div className="text-newTextColor/60 text-[14px]">
            {t('total_users', 'Total Users')}
          </div>
          <div className="text-[28px] font-bold text-newTextColor">
            {usersData?.total.toLocaleString() || '0'}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-menuBg rounded-[12px] border border-tableBorder overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-tableBorder">
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">
                  {t('user', 'User')}
                </th>
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">
                  {t('organizations', 'Organizations')}
                </th>
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">
                  {t('created', 'Created')}
                </th>
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">
                  {t('status', 'Status')}
                </th>
                <th className="text-left p-[16px] text-newTextColor/60 font-medium text-[14px]">
                  {t('actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {usersData?.users.map((user) => (
                <tr key={user.id} className="border-b border-tableBorder hover:bg-tableBorder/30 transition-colors">
                  <td className="p-[16px]">
                    <div>
                      <div className="font-medium text-newTextColor">
                        {user.name || t('no_name', 'No name')}
                      </div>
                      <div className="text-newTextColor/60 text-[14px]">
                        {user.email}
                      </div>
                      {user.isSuperAdmin && (
                        <div className="inline-block text-[10px] bg-purple-500/20 text-purple-500 px-[6px] py-[2px] rounded-full mt-[4px]">
                          {t('super_admin', 'Super Admin')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-[16px]">
                    <div className="space-y-[4px]">
                      {user.organizations.map((org) => (
                        <div key={org.id} className="text-[14px]">
                          <div className="text-newTextColor">{org.name}</div>
                          <div className="text-newTextColor/50 text-[12px]">
                            {org.integrationCount} {t('integrations', 'integrations')}
                            {org.subscriptionStatus && ` • ${org.subscriptionStatus}`}
                          </div>
                        </div>
                      ))}
                      {user.organizations.length === 0 && (
                        <div className="text-newTextColor/50 text-[14px]">
                          {t('no_organizations', 'No organizations')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-[16px] text-newTextColor text-[14px]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-[16px]">
                    <div className={`inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full text-[12px] font-medium ${user.activated
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-red-500/20 text-red-500'
                      }`}>
                      <div className={`w-[6px] h-[6px] rounded-full ${user.activated ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                      {user.activated ? t('active', 'Active') : t('suspended', 'Suspended')}
                    </div>
                  </td>
                  <td className="p-[16px]">
                    <div className="flex gap-[8px]">
                      <Button
                        onClick={() => handleImpersonate(user.id)}
                        className="!bg-blue-500 hover:!bg-blue-600"
                      >
                        {t('impersonate', 'Impersonate')}
                      </Button>
                      {user.activated ? (
                        <Button
                          onClick={() => handleSuspendUser(user.id, user.email)}
                          className="!bg-red-500 hover:!bg-red-600"
                        >
                          {t('suspend', 'Suspend')}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleActivateUser(user.id, user.email)}
                          className="!bg-green-500 hover:!bg-green-600"
                        >
                          {t('activate', 'Activate')}
                        </Button>
                      )}
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
            {t('showing_x_of_y_users', `Showing ${usersData?.users.length || 0} of ${usersData?.total || 0} users`)}
          </div>
          <div className="flex gap-[8px]">
            <Button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
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
                    className={`min-w-[40px] ${page === pageNum
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
              className="!bg-menuBg hover:!bg-tableBorder"
            >
              {t('next', 'Next')}
            </Button>
          </div>
        </div>
      )}

      {!isLoading && usersData?.users.length === 0 && (
        <div className="text-center py-[60px]">
          <div className="text-newTextColor/50 text-[18px]">
            {search ? t('no_users_found', 'No users found') : t('no_users_yet', 'No users yet')}
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