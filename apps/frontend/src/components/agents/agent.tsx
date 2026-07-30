'use client';

import React, {
  createContext,
  FC,
  useCallback,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import clsx from 'clsx';
import useCookie from 'react-use-cookie';
import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import { orderBy } from 'lodash';
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Integration } from '@prisma/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Check,
  History,
  Menu,
  MessageSquarePlus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

export const AgentList: FC<{
  onChange: (arr: any[]) => void;
  open: boolean;
  onClose: () => void;
}> = ({ onChange, open, onClose }) => {
  const fetch = useFetch();
  const t = useT();
  const [selected, setSelected] = useState([]);

  const load = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json()).integrations;
  }, []);

  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');

  const { data } = useSWR('integrations', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });

  const setIntegration = useCallback(
    (integration: Integration) => () => {
      if (selected.some((p) => p.id === integration.id)) {
        onChange(selected.filter((p) => p.id !== integration.id));
        setSelected(selected.filter((p) => p.id !== integration.id));
      } else {
        onChange([...selected, integration]);
        setSelected([...selected, integration]);
      }
    },
    [selected]
  );

  const sortedIntegrations = useMemo(() => {
    return orderBy(
      data || [],
      ['type', 'disabled', 'identifier'],
      ['desc', 'asc', 'asc']
    );
  }, [data]);

  return (
    <div
      className={clsx(
        'trz fixed inset-y-0 start-0 z-[70] flex w-[300px] max-w-[88vw] flex-col gap-[15px] border-e border-newBgLineColor bg-newBgColorInner transition-transform duration-200 lg:relative lg:inset-auto lg:z-auto lg:max-w-none lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
        collapseMenu === '1'
          ? 'lg:group lg:sidebar lg:w-[100px]'
          : 'lg:w-[260px]'
      )}
    >
      <div className="absolute top-0 start-0 w-full h-full p-[20px] overflow-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
        <div className="flex items-center">
          <h2 className="group-[.sidebar]:hidden flex-1 text-[20px] font-[500] mb-[15px]">
            {t('select_channels', 'Select Channels')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="mb-[15px] flex h-9 w-9 items-center justify-center rounded-md border border-newBgLineColor text-newTextColor lg:hidden"
            aria-label={t('close', 'Close')}
          >
            <X className="h-4 w-4" />
          </button>
          <div
            onClick={() => setCollapseMenu(collapseMenu === '1' ? '0' : '1')}
            className="-mt-3 hidden group-[.sidebar]:rotate-[180deg] group-[.sidebar]:mx-auto text-btnText bg-btnSimple rounded-[6px] w-[24px] h-[24px] items-center justify-center cursor-pointer select-none lg:flex"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="7"
              height="13"
              viewBox="0 0 7 13"
              fill="none"
            >
              <path
                d="M6 11.5L1 6.5L6 1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div className={clsx('flex flex-col gap-[15px]')}>
          {sortedIntegrations.map((integration, index) => (
            <div
              onClick={setIntegration(integration)}
              key={integration.id}
              className={clsx(
                'flex gap-[12px] items-center group/profile justify-center hover:bg-boxHover rounded-e-[8px] hover:opacity-100 cursor-pointer',
                !selected.some((p) => p.id === integration.id) && 'opacity-20'
              )}
            >
              <div
                className={clsx(
                  'relative rounded-full flex justify-center items-center gap-[6px]',
                  integration.disabled && 'opacity-50'
                )}
              >
                {(integration.inBetweenSteps || integration.refreshNeeded) && (
                  <div className="absolute start-0 top-0 w-[39px] h-[46px] cursor-pointer">
                    <div className="bg-red-500 w-[15px] h-[15px] rounded-full start-0 -top-[5px] absolute z-[200] text-[10px] flex justify-center items-center">
                      !
                    </div>
                    <div className="bg-primary/60 w-[39px] h-[46px] start-0 top-0 absolute rounded-full z-[199]" />
                  </div>
                )}
                <div className="h-full w-[4px] -ms-[12px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity">
                  <SVGLine />
                </div>
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                  src={integration.picture}
                  className="rounded-[8px]"
                  alt={integration.identifier}
                  width={36}
                  height={36}
                />
                <SafeImage
                  src={`/icons/platforms/${integration.identifier}.png`}
                  className="rounded-[8px] absolute z-10 bottom-[5px] -end-[5px] border border-fifth"
                  alt={integration.identifier}
                  width={18.41}
                  height={18.41}
                />
              </div>
              <div
                className={clsx(
                  'flex-1 whitespace-nowrap text-ellipsis overflow-hidden group-[.sidebar]:hidden',
                  integration.disabled && 'opacity-50'
                )}
              >
                {integration.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const PropertiesContext = createContext({ properties: [] });
export const Agent: FC<{ children: ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState([]);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const t = useT();

  return (
    <PropertiesContext.Provider value={{ properties }}>
      <div className="relative flex h-[calc(100dvh-112px)] min-h-[560px] w-full min-w-0 overflow-hidden rounded-xl border border-newBgLineColor bg-newBgColorInner shadow-sm">
        {(channelsOpen || threadsOpen) && (
          <button
            type="button"
            aria-label={t('close_panels', 'Close panels')}
            onClick={() => {
              setChannelsOpen(false);
              setThreadsOpen(false);
            }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] lg:hidden"
          />
        )}
        <AgentList
          onChange={setProperties}
          open={channelsOpen}
          onClose={() => setChannelsOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col bg-newBgColorInner">
          <div className="flex h-[54px] shrink-0 items-center justify-between border-b border-newBgLineColor px-3 lg:hidden">
            <button
              type="button"
              onClick={() => setChannelsOpen(true)}
              className="flex h-9 items-center gap-2 rounded-md border border-newBgLineColor px-3 text-sm"
            >
              <Menu className="h-4 w-4" />
              {t('channels', 'Channels')}
            </button>
            <span className="text-sm font-semibold">
              {t('swiftsai_copilot', 'SwiftsAI Copilot')}
            </span>
            <button
              type="button"
              onClick={() => setThreadsOpen(true)}
              className="flex h-9 items-center gap-2 rounded-md border border-newBgLineColor px-3 text-sm"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">{t('sessions', 'Sessions')}</span>
            </button>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
        </div>
        <Threads open={threadsOpen} onClose={() => setThreadsOpen(false)} />
      </div>
    </PropertiesContext.Provider>
  );
};

const Threads: FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const fetch = useFetch();
  const router = useRouter();
  const t = useT();
  const { mutate } = useSWRConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const threads = useCallback(async () => {
    return (await fetch('/copilot/list')).json();
  }, []);
  const { id } = useParams<{ id: string }>();

  const { data } = useSWR('threads', threads, {
    revalidateOnFocus: false,
  });

  const renameThread = useCallback(async (threadId: string) => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    await fetch(`/copilot/${threadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: nextTitle }),
    });
    setEditingId(null);
    setTitle('');
    await mutate('threads');
  }, [title]);

  const removeThread = useCallback(async (threadId: string) => {
    if (
      !(await deleteDialog(
        t('delete_conversation_confirm', 'Delete this conversation permanently?'),
        t('delete_conversation', 'Delete conversation'),
        t('delete', 'Delete'),
        t('cancel', 'Cancel')
      ))
    ) {
      return;
    }
    await fetch(`/copilot/${threadId}`, { method: 'DELETE' });
    await mutate('threads');
    if (threadId === id) {
      router.push('/agents');
    }
  }, [id]);

  return (
    <aside
      className={clsx(
        'trz fixed inset-y-0 end-0 z-[70] flex w-[320px] max-w-[90vw] flex-col border-s border-newBgLineColor bg-newBgColorInner transition-transform duration-200 xl:relative xl:inset-auto xl:z-auto xl:w-[280px] xl:max-w-none xl:translate-x-0',
        open ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'
      )}
    >
      <div className="absolute top-0 start-0 w-full h-full p-[16px] overflow-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
        <div className="mb-[16px] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {t('conversations', 'Conversations')}
            </h2>
            <p className="text-xs text-newTextColor/55">
              {t('tenant_session_history', 'History for this organization')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-newBgLineColor xl:hidden"
            aria-label={t('close', 'Close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-[15px] flex justify-center">
          <Link
            href={`/agents`}
            onClick={onClose}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-btnPrimary px-4 text-white outline-none"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>{t('start_a_new_chat', 'Start a new chat')}</span>
          </Link>
        </div>
        <div className="flex flex-col gap-1">
          {data?.threads?.map((p: any) => (
            <div
              className={clsx(
                'group flex min-w-0 items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 hover:border-newBgLineColor hover:bg-newBgColor',
                p.id === id && 'bg-newBgColor'
              )}
              key={p.id}
            >
              {editingId === p.id ? (
                <>
                  <input
                    value={title}
                    maxLength={80}
                    autoFocus
                    onChange={(event) => setTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') renameThread(p.id);
                      if (event.key === 'Escape') setEditingId(null);
                    }}
                    className="h-8 min-w-0 flex-1 rounded-md border border-newBgLineColor bg-newBgColorInner px-2 text-sm outline-none focus:border-btnPrimary"
                  />
                  <button
                    type="button"
                    onClick={() => renameThread(p.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-boxHover"
                    aria-label={t('save', 'Save')}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/agents/${p.id}`}
                    onClick={onClose}
                    className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-1 py-1 text-sm"
                  >
                    {p.title || t('untitled_conversation', 'Untitled conversation')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(p.id);
                      setTitle(p.title || '');
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md opacity-60 hover:bg-boxHover hover:opacity-100"
                    aria-label={t('rename', 'Rename')}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeThread(p.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md opacity-60 hover:bg-red-500/10 hover:text-red-500 hover:opacity-100"
                    aria-label={t('delete', 'Delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
          {!data?.threads?.length && (
            <div className="rounded-lg border border-dashed border-newBgLineColor p-5 text-center text-sm text-newTextColor/55">
              {t('no_conversations_yet', 'Your saved conversations will appear here.')}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
