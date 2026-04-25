'use client';

import React, { ReactNode, useCallback } from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';

import dynamic from 'next/dynamic';
const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import useSWR from 'swr';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Title } from '@gitroom/frontend/components/layout/title';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { ChromeExtensionComponent } from '@gitroom/frontend/components/layout/chrome.extension.component';
import { useRouter } from 'next/navigation';
import { AdminTopMenu } from '@gitroom/frontend/components/admin/layout/admin.top.menu';

const jakartaSans = { className: 'font-sans' };

export const AdminLayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const { backendUrl } = useVariables();
  const router = useRouter();

  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);

  const { data: user } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  // Redirect non-admin users
  if (user && !user.admin) {
    router.push('/home');
    return null;
  }

  if (!user) return null;

  return (
    <MantineWrapper>
      <Toaster />
      <div
        className={clsx(
          'flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px]',
          jakartaSans.className
        )}
      >
        <div className="flex">
          <div className="w-[250px] bg-menuBg h-screen rounded-[8px] p-[20px] flex flex-col gap-[30px] fixed left-[12px] top-[12px]">
            <Logo />
            <div className="flex flex-col flex-1 gap-[16px]">
              <AdminTopMenu />
            </div>
            <div className="flex gap-[10px]">
              <ModeComponent />
              <LanguageComponent />
              <ChromeExtensionComponent />
            </div>
          </div>
          <div className="flex-1 ml-[262px] p-[20px]">
            <Title />
            <div className="mt-[30px]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </MantineWrapper>
  );
};