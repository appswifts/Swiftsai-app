import React from 'react';
import clsx from 'clsx';

export const LogoTextComponent = ({
  className,
  iconClassName,
  labelClassName,
}: {
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}) => {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <img
        src="/swiftai.png"
        alt=""
        width={40}
        height={40}
        className={clsx('h-10 w-10 shrink-0 object-contain', iconClassName)}
      />
      <span
        className={clsx(
          'whitespace-nowrap text-xl font-bold tracking-tight',
          labelClassName
        )}
      >
        SwiftsAI
      </span>
    </span>
  );
};
