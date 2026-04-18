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
      className="bg-[#0E0E0E] flex flex-1 p-[12px] gap-[12px] min-h-screen w-screen text-white"
    >
      {/*<style>{`html, body {overflow-x: hidden;}`}</style>*/}
      <ReturnUrlComponent />
      <div
        suppressHydrationWarning
        className="flex flex-col py-[40px] px-[20px] flex-1 lg:w-[600px] lg:flex-none rounded-[12px] text-white p-[12px] bg-[#1A1919]"
      >
        <div
          suppressHydrationWarning
          className="w-full max-w-[440px] mx-auto justify-center gap-[20px] h-full flex flex-col text-white"
        >
          <LogoTextComponent />
          <div suppressHydrationWarning className="flex">{children}</div>
        </div>
      </div>
      <AuthTestimonialsClient />
    </div>
  );
}
