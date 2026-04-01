'use client';

export const Logo = () => {
  return (
    <img
      src="/logo.svg"
      alt="Swifts AI"
      width={60}
      height={60}
      className="mt-[8px] min-w-[60px] min-h-[60px]"
      style={{ objectFit: 'contain' }}
    />
  );
};
