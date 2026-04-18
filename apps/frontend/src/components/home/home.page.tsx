'use client';

import React from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';

export const HomePage = () => {
  const user = useUser();
  const t = useT();
  const fetch = useFetch();
  const router = useRouter();

  const { data: analytics, isLoading: analyticsLoading } = useSWR('/analytics', async (url) => {
    return (await fetch(url)).json();
  });

  const { data: posts, isLoading: postsLoading } = useSWR('/posts?page=1', async (url) => {
    return (await fetch(url)).json();
  });

  if (analyticsLoading || postsLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1200px] w-full mx-auto pb-[100px]">
      <div className="flex flex-col gap-2 border-b border-newColColor pb-6 mt-4">
        <h1 className="text-3xl font-semibold">
          {t('welcome_back', 'Welcome back')}, {user?.name || user?.orgId}!
        </h1>
        <p className="text-gray-400">
          {t('heres_whats_happening', "Here's what's happening with your accounts today.")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-newBgColor border border-newColColor rounded-lg p-5 flex flex-col gap-2 relative">
          <div className="text-gray-400 text-sm whitespace-nowrap overflow-hidden text-ellipsis w-full pe-[30px]">{t('total_posts', 'Total Posts')}</div>
          <div className="text-3xl font-semibold">
            {analytics?.totalPosts || 0}
          </div>
        </div>
        <div className="bg-newBgColor border border-newColColor rounded-lg p-5 flex flex-col gap-2 relative">
          <div className="text-gray-400 text-sm whitespace-nowrap overflow-hidden text-ellipsis w-full pe-[30px]">{t('audience_size', 'Audience Size')}</div>
          <div className="text-3xl font-semibold">
            {analytics?.audience || 0}
          </div>
        </div>
        <div className="bg-newBgColor border border-newColColor rounded-lg p-5 flex flex-col gap-2 relative">
          <div className="text-gray-400 text-sm whitespace-nowrap overflow-hidden text-ellipsis w-full pe-[30px]">{t('engagement_rate', 'Engagement Rate')}</div>
          <div className="text-3xl font-semibold">
            {analytics?.engagement ? `${analytics.engagement}%` : '0%'}
          </div>
        </div>
        <div className="bg-newBgColor border border-newColColor rounded-lg p-5 flex flex-col gap-2 relative flex-1 text-center justify-center items-center">
          <div className="font-semibold mb-2">Grow your audience</div>
          <Button onClick={() => router.push('/launches')} className="w-full">
            {t('create_new_post', 'Create New Post')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-xl font-semibold border-b border-newColColor pb-2">{t('recent_activity', 'Recent Activity')}</h2>
          <div className="bg-newBgColor border border-newColColor rounded-lg overflow-hidden">
            {posts?.posts?.length > 0 ? (
              <div className="flex flex-col">
                {posts.posts.slice(0, 5).map((post: any) => (
                  <div key={post.id} className="p-4 border-b border-newColColor last:border-b-0 flex justify-between items-center hover:bg-gray-800 transition cursor-pointer" onClick={() => router.push(`/launches?post=${post.id}`)}>
                    <div className="flex flex-col gap-1">
                      <div className="font-medium truncate max-w-[300px]">{post.content || 'Media post'}</div>
                      <div className="text-xs text-gray-500">{new Date(post.state === 'PUBLISHED' ? post.publishedAt : post.createdAt).toLocaleString()}</div>
                    </div>
                    <div>
                       <span className={`px-2 py-1 text-xs rounded-full ${post.state === 'PUBLISHED' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'}`}>{post.state}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-gray-500">
                {t('no_recent_posts', 'No recent posts found. Create one to get started!')}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold border-b border-newColColor pb-2">{t('quick_actions', 'Quick Actions')}</h2>
          <div className="flex flex-col gap-3">
             <div onClick={() => router.push('/third-party')} className="bg-newBgColor border border-newColColor rounded-lg p-4 cursor-pointer hover:border-[#FC69FF] transition flex items-center justify-between">
                <div>{t('connect_channel', 'Connect a Channel')}</div>
                <div>→</div>
             </div>
             <div onClick={() => router.push('/media')} className="bg-newBgColor border border-newColColor rounded-lg p-4 cursor-pointer hover:border-[#FC69FF] transition flex items-center justify-between">
                <div>{t('upload_media', 'Upload Media')}</div>
                <div>→</div>
             </div>
             {user?.tier !== 'ULTIMATE' && (
               <div className="mt-4 p-4 rounded-xl border border-[#AA0FA4] bg-[#AA0FA4]/10 relative overflow-hidden text-center cursor-pointer hover:bg-[#AA0FA4]/20 transition"
               onClick={() => router.push('/billing')}>
                  <div className="font-bold text-[#FC69FF] mb-2">{t('upgrade_tier', 'Upgrade to unlock more')}</div>
                  <div className="text-sm text-gray-300">Access unlimited posts, AI features, and more channels.</div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
