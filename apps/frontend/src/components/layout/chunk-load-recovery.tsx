'use client';

import { useEffect } from 'react';

const recoveryKey = 'swiftsai-chunk-recovery';

const isChunkLoadError = (value: unknown) => {
  const message =
    value instanceof Error
      ? value.message
      : typeof value === 'string'
        ? value
        : '';

  return (
    message.includes('ChunkLoadError') ||
    message.includes('Failed to load chunk') ||
    message.includes('Loading chunk')
  );
};

export function ChunkLoadRecovery(): null {
  useEffect(() => {
    const recover = (error: unknown) => {
      if (!isChunkLoadError(error)) {
        return;
      }

      const previousRecovery = Number(sessionStorage.getItem(recoveryKey) || 0);
      if (Date.now() - previousRecovery < 60_000) {
        return;
      }

      sessionStorage.setItem(recoveryKey, String(Date.now()));
      window.location.reload();
    };

    const onError = (event: ErrorEvent) =>
      recover(event.error || event.message);
    const onRejection = (event: PromiseRejectionEvent) =>
      recover(event.reason);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
