'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const UserDropdown = () => {
  const user = useUser();
  const fetch = useFetch();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = (user?.name || user?.email || '?')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = useCallback(async () => {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  }, [fetch]);

  const handleSettings = useCallback(() => {
    window.location.href = '/admin/settings';
  }, []);

  return (
    <div className="relative group" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-[8px] hover:text-newTextColor text-textItemBlur transition-colors"
      >
        <div className="w-[28px] h-[28px] rounded-full bg-primary/20 flex items-center justify-center text-[12px] font-semibold text-primary">
          {initials}
        </div>
      </button>
      {open && (
        <div className="absolute top-[100%] end-0 mt-[8px] w-[200px] bg-third border border-tableBorder rounded-[8px] shadow-lg z-50 py-[8px]">
          <div className="px-[16px] py-[8px] border-b border-tableBorder">
            <div className="text-[14px] font-medium text-newTextColor truncate">
              {user?.name || 'User'}
            </div>
            <div className="text-[12px] text-newTextColor/60 truncate">
              {user?.email}
            </div>
          </div>
          {user?.admin && (
            <button
              onClick={() => { window.location.href = '/admin'; setOpen(false); }}
              className="w-full text-left px-[16px] py-[8px] text-[14px] text-newTextColor hover:bg-tableBorder/30 transition-colors"
            >
              {t('admin_panel', 'Admin Panel')}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left px-[16px] py-[8px] text-[14px] text-red-500 hover:bg-tableBorder/30 transition-colors"
          >
            {t('logout', 'Logout')}
          </button>
        </div>
      )}
    </div>
  );
};
