'use client';

import {
  FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const Polonto: FC<{
  setMedia: (params: { id: string; path: string }[]) => void;
  type?: 'image' | 'video';
  closeModal: () => void;
  width?: number;
  height?: number;
}> = (props) => {
  const { setMedia, closeModal } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(false);
  const t = useT();
  const fetch = useFetch();

  const handleMessage = useCallback(async (e: MessageEvent) => {
    if (e.data?.type === 'EXPORT_READY') {
      setLoading(true);
      try {
        const response = await fetch(e.data.payload.dataUrl);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('file', blob, 'design.png');
        const data = await (
          await fetch('/media/upload-simple', {
            method: 'POST',
            body: formData,
          })
        ).json();
        setMedia([{ id: data.id, path: data.path }]);
        closeModal();
      } catch (err) {
        console.error('Export failed', err);
      } finally {
        setLoading(false);
      }
    }
    if (e.data?.type === 'EDITOR_READY') {
      setLoading(false);
    }
  }, [fetch, setMedia, closeModal]);

  useEffect(() => {
    setLoading(true);
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return (
    <div className="bg-white text-black relative z-[400]" style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
      {/* Custom toolbar matching our editor style */}
      <div className="h-14 bg-[#00c4cc] flex items-center justify-between px-4 text-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">Design Media</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            loading={loading}
            className="outline-none"
            innerClassName="!bg-white !text-[#0e1318] px-5 h-9 rounded-lg text-sm font-medium hover:bg-opacity-90"
            onClick={async () => {
              if (!iframeRef.current?.contentWindow) return;
              iframeRef.current.contentWindow.postMessage({ type: 'EXPORT' }, '*');
            }}
          >
            {t('use_this_media', 'Use this media')}
          </Button>
        </div>
      </div>
      {/* Editor iframe */}
      <iframe
        ref={iframeRef}
        src="/editor/"
        className="w-full flex-1 border-0"
        title="Design Editor"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
};

export default Polonto;
