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
import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import { orderBy } from 'lodash';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Integration } from '@prisma/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Bot,
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
        'trz fixed inset-y-0 start-0 z-[70] flex w-[300px] max-w-[88vw] flex-col border-e border-newBgLineColor bg-newBgColorInner shadow-sm transition-transform duration-200 xl:relative xl:inset-auto xl:z-auto xl:w-[248px] xl:max-w-none xl:translate-x-0 xl:shadow-none',
        open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center border-b border-newBgLineColor px-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">
              {t('select_channels', 'Social channels')}
            </h2>
            <p className="truncate text-xs text-newTextColor/55">
              {selected.length
                ? `${selected.length} ${t('selected', 'selected')}`
                : t('choose_channels_for_chat', 'Choose channels for this chat')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-newBgLineColor text-newTextColor xl:hidden"
            aria-label={t('close', 'Close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
          {sortedIntegrations.map((integration) => {
            const isSelected = selected.some((p) => p.id === integration.id);
            return (
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={setIntegration(integration)}
              key={integration.id}
              className={clsx(
                'group flex w-full min-w-0 items-center gap-3 rounded-lg border px-2.5 py-2 text-start transition-colors',
                isSelected
                  ? 'border-btnPrimary/35 bg-btnPrimary/10'
                  : 'border-transparent hover:border-newBgLineColor hover:bg-boxHover'
              )}
            >
              <div
                className={clsx(
                  'relative flex shrink-0 items-center justify-center rounded-lg',
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
                  'min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm',
                  integration.disabled && 'opacity-50'
                )}
              >
                {integration.name}
              </div>
              <span
                className={clsx(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  isSelected
                    ? 'border-btnPrimary bg-btnPrimary text-white'
                    : 'border-newBgLineColor text-transparent'
                )}
              >
                <Check className="h-3 w-3" />
              </span>
            </button>
          )})}
          {!sortedIntegrations.length && (
            <div className="rounded-lg border border-dashed border-newBgLineColor p-4 text-center text-sm text-newTextColor/55">
              {t('no_social_channels', 'Connect a social channel to begin.')}
            </div>
          )}
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
      <div className="relative flex h-[calc(100dvh-96px)] min-h-0 w-full min-w-0 overflow-hidden rounded-xl border border-newBgLineColor bg-newBgColorInner shadow-sm">
        {(channelsOpen || threadsOpen) && (
          <button
            type="button"
            aria-label={t('close_panels', 'Close panels')}
            onClick={() => {
              setChannelsOpen(false);
              setThreadsOpen(false);
            }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
          />
        )}
        <AgentList
          onChange={setProperties}
          open={channelsOpen}
          onClose={() => setChannelsOpen(false)}
        />
        <main className="flex min-w-0 flex-1 flex-col bg-newBgColorInner">
          <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-newBgLineColor px-3 sm:px-4">
            <button
              type="button"
              onClick={() => setChannelsOpen(true)}
              className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-newBgLineColor px-3 text-sm hover:bg-boxHover xl:hidden"
            >
              <Menu className="h-4 w-4" />
              <span className="hidden sm:inline">{t('channels', 'Channels')}</span>
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-3 xl:flex-none">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-btnPrimary/15 text-btnPrimary">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold">
                  {t('swiftsai_copilot', 'SwiftsAI Copilot')}
                </h1>
                <p className="truncate text-xs text-newTextColor/55">
                  {properties.length
                    ? `${properties.length} ${t('channels_selected', 'channels selected')}`
                    : t('organization_scoped', 'Organization workspace')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setThreadsOpen(true)}
              className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-newBgLineColor px-3 text-sm hover:bg-boxHover"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t('conversations', 'Conversations')}
              </span>
            </button>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {children}
          </div>
        </main>
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
        'trz fixed inset-y-0 end-0 z-[70] flex w-[360px] max-w-[92vw] flex-col border-s border-newBgLineColor bg-newBgColorInner shadow-sm transition-transform duration-200',
        open ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-newBgLineColor px-4">
          <div>
            <h2 className="text-sm font-semibold">
              {t('conversations', 'Conversations')}
            </h2>
            <p className="text-xs text-newTextColor/55">
              {t('tenant_session_history', 'History for this organization')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-newBgLineColor hover:bg-boxHover"
            aria-label={t('close', 'Close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3 pb-0">
          <Link
            href={`/agents`}
            onClick={onClose}
            className="flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-btnPrimary px-4 text-sm text-white outline-none"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>{t('start_a_new_chat', 'Start a new chat')}</span>
          </Link>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
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
