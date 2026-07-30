'use client';

import React, { ReactNode, useCallback, useState } from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';

const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CheckPayment } from '@gitroom/frontend/components/layout/check.payment';
import { ToolTip } from '@gitroom/frontend/components/layout/top.tip';
import { ShowMediaBoxModal } from '@gitroom/frontend/components/media/media.component';
import { ShowLinkedinCompany } from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { MediaSettingsLayout } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { ShowPostSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { NewSubscription } from '@gitroom/frontend/components/layout/new.subscription';
import { Support } from '@gitroom/frontend/components/layout/support';
import { ContinueProvider } from '@gitroom/frontend/components/layout/continue.provider';
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { CopilotKit } from '@copilotkit/react-core';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Impersonate } from '@gitroom/frontend/components/layout/impersonate';
import { AnnouncementBanner } from '@gitroom/frontend/components/layout/announcement.banner';
import { Title } from '@gitroom/frontend/components/layout/title';
import { TopMenu } from '@gitroom/frontend/components/layout/top.menu';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { ChromeExtensionComponent } from '@gitroom/frontend/components/layout/chrome.extension.component';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { UserDropdown } from '@gitroom/frontend/components/layout/user.dropdown';
import { StreakComponent } from '@gitroom/frontend/components/layout/streak.component';
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import { FirstBillingComponent } from '@gitroom/frontend/components/billing/first.billing.component';

const jakartaSans = { className: 'font-sans' };

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fetch = useFetch();

  const { backendUrl, billingEnabled, isGeneral } = useVariables();

  // Feedback icon component attaches Sentry feedback to a top-bar icon when DSN is present
  const searchParams = useSearchParams();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user, mutate } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  if (!user) return null;

  return (
    <ContextWrapper user={user}>
      <CopilotKit
        credentials="include"
        runtimeUrl={backendUrl + '/copilot/chat'}
        showDevConsole={false}
      >
        <MantineWrapper>
          <ToolTip />
          <Toaster />
          <CheckPayment check={searchParams.get('check') || ''} mutate={mutate}>
            <ShowMediaBoxModal />
            <ShowLinkedinCompany />
            <MediaSettingsLayout />
            <ShowPostSelector />
            <PreConditionComponent />
            <NewSubscription />
            <ContinueProvider />
            <div
              className={clsx(
                'flex flex-col min-h-screen w-full max-w-full min-w-0 overflow-x-hidden text-newTextColor p-0 sm:p-[12px]',
                jakartaSans.className
              )}
            >
              <div>{user?.admin || user?.impersonate ? <Impersonate /> : <div />}</div>
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (
                <FirstBillingComponent />
              ) : (
                <>
                  <AnnouncementBanner />
                  <div className="flex-1 flex min-w-0 gap-[8px]">
                    <Support />
                    <div className="hidden lg:flex flex-col bg-newBgColorInner w-[80px] rounded-[12px]">
                      <div
                        id="left-menu"
                        className={clsx(
                          'fixed h-full w-[64px] start-[17px] flex flex-1 top-0',
                          user?.admin && 'pt-[60px] max-h-[1000px]:w-[500px]'
                        )}
                      >
                        <div className="flex flex-col h-full gap-[32px] flex-1 py-[12px]">
                          <Logo />
                          <TopMenu />
                        </div>
                      </div>
                    </div>
                    {mobileMenuOpen && (
                      <div className="fixed inset-0 z-[9998] lg:hidden">
                        <button
                          type="button"
                          aria-label="Close navigation"
                          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                          onClick={() => setMobileMenuOpen(false)}
                        />
                        <aside className="absolute inset-y-0 start-0 z-[1] flex w-[min(84vw,320px)] flex-col gap-[24px] overflow-y-auto bg-newBgColorInner p-[16px] shadow-2xl">
                          <div className="flex items-center justify-between">
                            <Logo />
                            <button
                              type="button"
                              aria-label="Close navigation"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-newBgLineColor text-[24px]"
                            >
                              ×
                            </button>
                          </div>
                          <TopMenu />
                        </aside>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 bg-newBgLineColor sm:rounded-[12px] overflow-hidden flex flex-col gap-[1px] blurMe">
                      <div className="flex bg-newBgColorInner min-h-[64px] sm:min-h-[80px] px-[12px] sm:px-[20px] py-[8px] items-center gap-[10px]">
                        <button
                          type="button"
                          aria-label="Open navigation"
                          aria-expanded={mobileMenuOpen}
                          onClick={() => setMobileMenuOpen(true)}
                          className="lg:hidden flex h-11 w-11 flex-none items-center justify-center rounded-[10px] bg-newBgLineColor"
                        >
                          <span className="material-symbols-outlined">menu</span>
                        </button>
                        <div className="text-[18px] sm:text-[24px] font-[600] flex flex-1 min-w-0 truncate">
                          <Title />
                        </div>
                        <div className="flex min-w-0 items-center gap-[8px] sm:gap-[12px] xl:gap-[20px] text-textItemBlur">
                          <div className="hidden xl:block"><StreakComponent /></div>
                          <div className="hidden xl:block w-[1px] h-[20px] bg-blockSeparator" />
                          <OrganizationSelector />
                          <div className="hidden md:block hover:text-newTextColor">
                            <ModeComponent />
                          </div>
                          <div className="hidden xl:block w-[1px] h-[20px] bg-blockSeparator" />
                          <div className="hidden xl:block"><LanguageComponent /></div>
                          <div className="hidden xl:block"><ChromeExtensionComponent /></div>
                          <div className="hidden xl:block w-[1px] h-[20px] bg-blockSeparator" />
                          <div className="hidden xl:block"><AttachToFeedbackIcon /></div>
                          <div className="hidden xl:block w-[1px] h-[20px] bg-blockSeparator" />
                          <UserDropdown />
                          <div className="hidden sm:block"><NotificationComponent /></div>
                        </div>
                      </div>
                      <div className="flex flex-1 min-w-0 flex-col lg:flex-row gap-[1px] overflow-auto">{children}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CheckPayment>
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
};
