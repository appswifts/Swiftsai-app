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
          'flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-x-hidden p-[8px] text-newTextColor sm:p-[12px]',
          jakartaSans.className
        )}
      >
        <div className="flex min-w-0 flex-col gap-[12px] lg:flex-row lg:gap-0">
          <aside className="relative flex h-auto w-full flex-col gap-[16px] rounded-[8px] bg-menuBg p-[14px] lg:fixed lg:left-[12px] lg:top-[12px] lg:h-[calc(100vh-24px)] lg:w-[250px] lg:gap-[30px] lg:overflow-y-auto lg:p-[20px]">
            <Logo />
            <div className="flex flex-col flex-1 gap-[16px]">
              <AdminTopMenu />
            </div>
            <div className="flex flex-wrap gap-[10px]">
              <ModeComponent />
              <LanguageComponent />
              <ChromeExtensionComponent />
            </div>
          </aside>
          <main className="w-full min-w-0 flex-1 px-[4px] py-[12px] sm:p-[20px] lg:ml-[262px]">
            <Title />
            <div className="mt-[20px] min-w-0 sm:mt-[30px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </MantineWrapper>
  );
};
