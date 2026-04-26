'use client';

import React, { FC, ReactNode, useCallback } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { usePathname, useRouter } from 'next/navigation';

interface AdminMenuItemInterface {
  name: string;
  icon: ReactNode;
  path: string;
}

export const AdminTopMenu: FC = () => {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();

  const menuItems: AdminMenuItemInterface[] = [
    {
      name: t('admin_dashboard', 'Dashboard'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
      path: '/admin',
    },
    {
      name: t('admin_users', 'Users'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      path: '/admin/users',
    },
    {
      name: t('admin_organizations', 'Organizations'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      path: '/admin/organizations',
    },
    {
      name: t('admin_integrations', 'Integrations'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <path d="M7 7v10" />
          <path d="M11 7v10" />
          <path d="M15 7v10" />
          <path d="M3 11h18" />
        </svg>
      ),
      path: '/admin/integrations',
    },
    {
      name: t('admin_errors', 'Error Logs'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      ),
      path: '/admin/errors',
    },
    {
      name: t('admin_billing', 'Billing & Subscriptions'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      ),
      path: '/admin/subscriptions',
    },
    {
      name: t('admin_plans', 'Plans & Features'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
      path: '/admin/plans',
    },
    {
      name: t('admin_settings', 'Admin Settings'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
      path: '/admin/settings',
    },
    {
      name: t('admin_audit_log', 'Audit Log'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      path: '/admin/audit-log',
    },
  ];

  const navigate = useCallback((path: string) => {
    router.push(path);
  }, []);

  const knownPaths = menuItems.map(i => i.path);

  return (
    <>
      <div className="text-newTextColor/50 text-[12px] uppercase font-bold tracking-wider">
        {t('admin_panel', 'Admin Panel')}
      </div>
      <div className="flex flex-col gap-[8px]">
        {menuItems.map((item) => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`
              flex items-center gap-[12px] p-[10px] rounded-[8px] cursor-pointer transition-colors
              ${pathname === item.path || (item.path === '/admin' && pathname?.startsWith('/admin') && !knownPaths.slice(1).some(p => pathname === p))
                ? 'bg-primary text-white'
                : 'hover:bg-tableBorder'
              }
            `}
          >
            <div className="w-[20px] h-[20px] flex items-center justify-center">
              {item.icon}
            </div>
            <div className="text-[14px] font-medium">
              {item.name}
            </div>
          </div>
        ))}
      </div>
      <div className="text-newTextColor/50 text-[12px] uppercase font-bold tracking-wider mt-[20px]">
        {t('switch_to_tenant', 'Switch to Tenant')}
      </div>
      <div
        onClick={() => router.push('/home')}
        className="
          flex items-center gap-[12px] p-[10px] rounded-[8px] cursor-pointer
          hover:bg-tableBorder transition-colors
        "
      >
        <div className="w-[20px] h-[20px] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="text-[14px] font-medium">
          {t('tenant_dashboard', 'Tenant Dashboard')}
        </div>
      </div>
    </>
  );
};