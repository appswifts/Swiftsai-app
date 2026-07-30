import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { AuthTestimonialsClient } from '@gitroom/frontend/components/auth/auth-testimonials.client';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  await getT();

  return (
    <div
      suppressHydrationWarning
      className="bg-[#0E0E0E] flex flex-1 p-0 sm:p-[12px] gap-[12px] min-h-screen w-full max-w-full overflow-x-hidden text-white"
    >
      {/*<style>{`html, body {overflow-x: hidden;}`}</style>*/}
      <ReturnUrlComponent />
      <div
        suppressHydrationWarning
        className="flex flex-col py-[32px] sm:py-[40px] px-[16px] sm:px-[20px] flex-1 min-w-0 lg:w-[600px] lg:flex-none rounded-none sm:rounded-[12px] text-white bg-[#1A1919]"
      >
        <div
          suppressHydrationWarning
          className="w-full max-w-[440px] mx-auto justify-center gap-[20px] min-h-full flex flex-col text-white"
        >
          <LogoTextComponent />
          <div suppressHydrationWarning className="flex min-w-0 [&>*]:min-w-0 [&>*]:max-w-full">{children}</div>
        </div>
      </div>
      <AuthTestimonialsClient />
    </div>
  );
}
