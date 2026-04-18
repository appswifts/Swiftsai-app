'use client';

import dynamic from 'next/dynamic';

const RegisterNoSSR = dynamic(
  () =>
    import('@gitroom/frontend/components/auth/register').then(
      (mod) => mod.Register
    ),
  { ssr: false }
);

export function RegisterClientWrapper() {
  return <RegisterNoSSR />;
}
