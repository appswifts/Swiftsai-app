'use client';

import React, { useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import dayjs from 'dayjs';

interface Integration {
  id: string;
  name: string;
  picture: string;
  providerIdentifier: 'facebook' | 'instagram';
  internalId: string;
}

interface Post {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
}

interface Comment {
  id: string;
  message?: string;
  text?: string;
  from?: { id: string; name: string };
  username?: string;
  created_time?: string;
  timestamp?: string;
  like_count?: number;
  comment_count?: number;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  return dayjs(dateStr).format('MMM D, YYYY h:mm A');
};

const IntegrationCard = ({
  integration,
  selected,
  onClick,
}: {
  integration: Integration;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-[12px] px-[16px] py-[12px] rounded-[12px] cursor-pointer transition-all min-w-[200px] ${
      selected
        ? 'bg-btnPrimary text-newBtnText'
        : 'bg-newBgColorInner text-newBtnText hover:bg-btnSimple'
    }`}
  >
    <img
      src={integration.picture || '/no-picture.jpg'}
      alt={integration.name}
      className="w-[32px] h-[32px] rounded-full"
    />
    <div className="text-left">
      <div className="text-[13px] font-medium leading-tight">{integration.name}</div>
      <div className="text-[11px] opacity-60 leading-tight">
        {integration.providerIdentifier === 'facebook' ? 'Facebook Page' : 'Instagram'}
      </div>
    </div>
  </button>
);

const PostItem = ({
  post,
  selected,
  onClick,
}: {
  post: Post;
  selected: boolean;
  onClick: () => void;
}) => {
  const content = post.message || post.caption || '(No content)';
  const pic = post.full_picture || post.media_url;
  const date = post.created_time || post.timestamp || '';
  const url = post.permalink_url || post.permalink || '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-[16px] py-[12px] rounded-[8px] cursor-pointer transition-all border ${
        selected
          ? 'bg-btnPrimary/10 border-btnPrimary text-newBtnText'
          : 'bg-newBgColorInner border-newBorder text-newBtnText hover:bg-boxHover'
      }`}
    >
      <div className="flex gap-[12px]">
        {pic && (
          <img
            src={pic}
            alt=""
            className="w-[48px] h-[48px] rounded-[8px] object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] line-clamp-2 leading-snug">
            {content}
          </p>
          <div className="flex items-center gap-[8px] mt-[6px]">
            <span className="text-[11px] opacity-50">
              {dayjs(date).format('MMM D, YYYY')}
            </span>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-btnPrimary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Open
              </a>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

const CommentItem = ({
  comment,
  onReply,
  onDelete,
  integrationId,
}: {
  comment: Comment;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  integrationId: string;
}) => {
  const [deleting, setDeleting] = useState(false);
  const fetch = useFetch();

  const authorName = comment.from?.name || comment.username || 'Unknown';
  const content = comment.message || comment.text || '';
  const date = comment.created_time || comment.timestamp || '';

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this comment?')) return;
    setDeleting(true);
    try {
      await fetch(`/comments/${integrationId}/${comment.id}`, { method: 'DELETE' });
      onDelete(comment.id);
    } catch {
      alert('Failed to delete comment');
    }
    setDeleting(false);
  }, [fetch, integrationId, comment.id, onDelete]);

  return (
    <div className="flex gap-[12px] px-[16px] py-[10px] rounded-[8px] bg-newBgColorInner border border-newBorder">
      <div className="w-[32px] h-[32px] rounded-full bg-btnPrimary/20 flex items-center justify-center text-[12px] font-bold flex-shrink-0">
        {authorName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[8px]">
          <span className="text-[12px] font-medium">{authorName}</span>
          <span className="text-[10px] opacity-40">{formatDate(date)}</span>
          {comment.like_count !== undefined && comment.like_count > 0 && (
            <span className="text-[11px] opacity-50">❤️ {comment.like_count}</span>
          )}
        </div>
        <p className="text-[13px] mt-[4px] leading-snug">{content}</p>
        <div className="flex gap-[12px] mt-[6px]">
          <button
            onClick={() => onReply(comment.id)}
            className="text-[11px] text-btnPrimary hover:underline"
          >
            Reply
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-[11px] text-customColor22 hover:underline"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const CommentsPage = () => {
  const fetch = useFetch();
  const t = useT();

  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; label: string } | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const { data: integrations, isLoading: loadingIntegrations } = useSWR<Integration[]>(
    '/comments/integrations',
    async (url: string) => (await fetch(url)).json()
  );

  const { data: posts, isLoading: loadingPosts } = useSWR<Post[]>(
    selectedIntegrationId ? `/comments/${selectedIntegrationId}/posts` : null,
    async (url: string) => (await fetch(url)).json()
  );

  const { data: comments, isLoading: loadingComments, mutate: mutateComments } = useSWR<Comment[]>(
    selectedIntegrationId && selectedPostId
      ? `/comments/${selectedIntegrationId}/${selectedPostId}`
      : null,
    async (url: string) => (await fetch(url)).json()
  );

  const handleSelectIntegration = useCallback((id: string) => {
    setSelectedIntegrationId(id);
    setSelectedPostId('');
    setReplyTarget(null);
  }, []);

  const handleSelectPost = useCallback((postId: string) => {
    setSelectedPostId(postId);
    setReplyTarget(null);
    setReplyMessage('');
  }, []);

  const handleReplyToPost = useCallback(() => {
    setReplyTarget({ parentId: selectedPostId, label: 'Post' });
    setReplyMessage('');
  }, [selectedPostId]);

  const handleReplyToComment = useCallback((commentId: string) => {
    setReplyTarget({ parentId: commentId, label: 'Comment' });
    setReplyMessage('');
  }, []);

  const handleSendReply = useCallback(async () => {
    if (!replyTarget || !replyMessage.trim() || !selectedIntegrationId) return;
    setSendingReply(true);
    try {
      await fetch(
        `/comments/${selectedIntegrationId}/${replyTarget.parentId}/reply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: replyMessage }),
        }
      );
      setReplyMessage('');
      setReplyTarget(null);
      await mutateComments();
    } catch {
      alert('Failed to send reply');
    }
    setSendingReply(false);
  }, [replyTarget, replyMessage, selectedIntegrationId, fetch, mutateComments]);

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      mutateComments(
        (prev) => prev?.filter((c) => c.id !== commentId),
        false
      );
    },
    [mutateComments]
  );

  const selectedIntegration = integrations?.find((i) => i.id === selectedIntegrationId);
  const selectedPost = posts?.find((p) => p.id === selectedPostId);

  if (loadingIntegrations) {
    return <LoadingComponent />;
  }

  return (
    <div className="flex flex-col flex-1 p-[24px] gap-[20px] overflow-hidden">
      {/* Integration Selector */}
      <div className="flex gap-[12px] flex-wrap">
        {!integrations?.length && (
          <div className="text-newBtnText opacity-50 text-[14px] py-[20px]">
            {t('no_integrations', 'Connect a Facebook Page or Instagram account to manage comments')}
          </div>
        )}
        {integrations?.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            selected={integration.id === selectedIntegrationId}
            onClick={() => handleSelectIntegration(integration.id)}
          />
        ))}
      </div>

      {/* Main content area */}
      {selectedIntegrationId && (
        <div className="flex flex-1 gap-[16px] overflow-hidden min-h-0">
          {/* Post list */}
          <div className="w-[380px] flex-shrink-0 flex flex-col gap-[12px] overflow-hidden">
            <h2 className="text-[14px] font-medium text-newBtnText flex-shrink-0">
              {selectedIntegration?.providerIdentifier === 'facebook'
                ? t('recent_posts', 'Recent Posts')
                : t('recent_media', 'Recent Media')}
            </h2>
            <div className="flex-1 overflow-y-auto flex flex-col gap-[8px] custom-scrollbar">
              {loadingPosts && <LoadingComponent width={40} height={40} />}
              {!loadingPosts && !posts?.length && (
                <div className="text-newBtnText opacity-40 text-[13px] py-[20px] text-center">
                  {t('no_posts', 'No posts found')}
                </div>
              )}
              {posts?.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  selected={post.id === selectedPostId}
                  onClick={() => handleSelectPost(post.id)}
                />
              ))}
            </div>
          </div>

          {/* Comment thread */}
          <div className="flex-1 flex flex-col gap-[12px] overflow-hidden bg-newBgColorInner rounded-[12px] p-[20px]">
            {!selectedPostId ? (
              <div className="flex-1 flex items-center justify-center text-newBtnText opacity-40 text-[14px]">
                {t('select_post', 'Select a post to view comments')}
              </div>
            ) : (
              <>
                <div className="flex-shrink-0 flex items-center justify-between">
                  <h2 className="text-[14px] font-medium text-newBtnText">
                    {t('comments', 'Comments')}
                  </h2>
                  {!replyTarget && (
                    <button
                      onClick={handleReplyToPost}
                      className="text-[12px] px-[12px] py-[6px] rounded-[8px] bg-btnPrimary text-newBtnText hover:opacity-90"
                    >
                      {t('reply_to_post', 'Reply to Post')}
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-[8px] custom-scrollbar">
                  {loadingComments && <LoadingComponent width={40} height={40} />}
                  {!loadingComments && !comments?.length && (
                    <div className="text-newBtnText opacity-40 text-[13px] py-[20px] text-center">
                      {t('no_comments', 'No comments yet')}
                    </div>
                  )}
                  {comments?.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onReply={handleReplyToComment}
                      onDelete={handleDeleteComment}
                      integrationId={selectedIntegrationId}
                    />
                  ))}
                </div>

                {/* Reply form */}
                {replyTarget && (
                  <div className="flex-shrink-0 flex gap-[12px] items-start pt-[12px] border-t border-newBorder">
                    <div className="flex-1">
                      <div className="text-[11px] opacity-50 mb-[4px]">
                        {t('replying_to', `Replying to ${replyTarget.label}`)}
                        <button
                          onClick={() => setReplyTarget(null)}
                          className="ml-[8px] text-customColor22 hover:underline"
                        >
                          {t('cancel', 'Cancel')}
                        </button>
                      </div>
                      <textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder={t('type_reply', 'Type your reply...')}
                        rows={2}
                        className="w-full bg-newBgColor border border-newBorder rounded-[8px] px-[12px] py-[8px] text-[13px] text-newBtnText placeholder-gray-500 outline-none focus:border-btnPrimary transition resize-none"
                      />
                    </div>
                    <button
                      onClick={handleSendReply}
                      disabled={sendingReply || !replyMessage.trim()}
                      className="px-[16px] py-[8px] rounded-[8px] bg-btnPrimary text-newBtnText text-[13px] hover:opacity-90 disabled:opacity-40 mt-[18px]"
                    >
                      {sendingReply ? 'Sending...' : t('send', 'Send')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
