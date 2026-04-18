'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { Button } from '@gitroom/react/form/button';

interface InboxIdentity {
  id: string;
  channel: string;
  externalId: string;
  displayName?: string;
}

interface InboxConversation {
  id: string;
  name: string;
  status: string;
  identities: InboxIdentity[];
  lastMessage?: {
    content?: string;
    createdAt: string;
    direction: 'INBOUND' | 'OUTBOUND';
  };
}

interface InboxMessage {
  id: string;
  content?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  createdAt: string;
}

export const InboxPage = () => {
  const t = useT();
  const fetch = useFetch();
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { data: conversations, isLoading } = useSWR<InboxConversation[]>('/inbox', async (url: string) => {
    return (await fetch(url)).json();
  });

  const { data: messagesData, mutate: mutateMessages } = useSWR<{ messages: InboxMessage[] }>(
    selectedConversationId ? `/inbox/${selectedConversationId}/messages` : null,
    async (url: string) => (await fetch(url)).json()
  );

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (selectedPlatform === 'all') {
      return conversations;
    }

    return conversations.filter((conversation) =>
      conversation.identities?.some((identity) => identity.channel === selectedPlatform)
    );
  }, [conversations, selectedPlatform]);

  const selectedConversation = useMemo(
    () =>
      filteredConversations.find(
        (conversation) => conversation.id === selectedConversationId
      ),
    [filteredConversations, selectedConversationId]
  );

  const sendMessage = async () => {
    if (!selectedConversation || !message.trim()) {
      return;
    }

    const firstIdentity = selectedConversation.identities?.[0];
    if (!firstIdentity) {
      return;
    }

    setIsSending(true);
    try {
      await fetch(`/inbox/${selectedConversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          leadIdentityId: firstIdentity.id,
          content: message.trim(),
        }),
      });
      setMessage('');
      await mutateMessages();
    } finally {
      setIsSending(false);
    }
  };

  const platforms = [
    { id: 'all', name: 'All Messages' },
    { id: 'facebook', name: 'Facebook' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'whatsapp', name: 'WhatsApp' },
  ];

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="flex h-[calc(100vh-92px)] overflow-hidden bg-newBgColorInner">
      {/* Sidebar */}
      <div className="w-[280px] border-r border-newColColor bg-newBgColor flex flex-col">
        <div className="p-4 border-b border-newColColor font-bold text-lg">
          {t('unified_inbox', 'Unified Inbox')}
        </div>
        <div className="flex flex-col overflow-y-auto">
          {platforms.map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className={`p-3 cursor-pointer border-b border-newColColor/50 hover:bg-[#AA0FA4]/10 transition ${selectedPlatform === p.id ? 'bg-[#AA0FA4]/20 border-l-4 border-l-[#FC69FF]' : ''}`}
            >
              {p.name}
            </div>
          ))}
        </div>
      </div>

      {/* Message List */}
      <div className="w-[350px] border-r border-newColColor bg-newBgColor flex flex-col">
        <div className="p-4 border-b border-newColColor">
          <input 
            type="text" 
            placeholder={t('search_messages', 'Search messages...')}
            className="w-full bg-black/40 border border-newColColor rounded-md px-3 py-2 text-sm outline-none focus:border-[#FC69FF]"
          />
        </div>
        {filteredConversations.length ? (
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversationId(conversation.id)}
                className={`p-4 border-b border-newColColor/50 cursor-pointer transition ${
                  selectedConversationId === conversation.id
                    ? 'bg-[#AA0FA4]/20'
                    : 'hover:bg-[#AA0FA4]/10'
                }`}
              >
                <div className="font-medium truncate">{conversation.name}</div>
                <div className="text-xs text-gray-400 truncate mt-1">
                  {conversation.lastMessage?.content || t('no_messages', 'No messages yet')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-gray-600"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <div className="font-semibold text-gray-400">No Conversations Yet</div>
            <p className="text-sm mt-2">
              Connect your channels and wait for messages to sync.
            </p>
          </div>
        )}
      </div>

      {/* Message Detail */}
      <div className="flex-1 bg-newBgColorInner flex flex-col">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start reading
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-newColColor bg-newBgColor">
              <div className="font-semibold">{selectedConversation.name}</div>
              <div className="text-xs text-gray-400 mt-1">
                {(selectedConversation.identities || [])
                  .map((identity) => `${identity.channel}:${identity.externalId}`)
                  .join('  •  ')}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {(messagesData?.messages || []).map((item) => (
                <div
                  key={item.id}
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                    item.direction === 'OUTBOUND'
                      ? 'bg-[#AA0FA4]/30 self-end'
                      : 'bg-black/30 self-start'
                  }`}
                >
                  <div>{item.content || t('empty_message', 'Empty message')}</div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-newColColor bg-newBgColor flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('type_message', 'Type your message...')}
                className="flex-1 bg-black/40 border border-newColColor rounded-md px-3 py-2 text-sm outline-none focus:border-[#FC69FF]"
              />
              <Button onClick={sendMessage} disabled={isSending || !message.trim()}>
                {t('send', 'Send')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
