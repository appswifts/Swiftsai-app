'use client';

import React, { useMemo, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import useSWR, { useSWRConfig } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { CampaignWizard } from '@gitroom/frontend/components/campaigns/campaign.wizard';

type CampaignStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ERROR';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  type: string;
  status: CampaignStatus;
  budget?: number;
  metrics?: string | null;
}

export const CampaignsPage = () => {
  const t = useT();
  const fetch = useFetch();
  const { mutate } = useSWRConfig();
  const modal = useModals();

  const {
    data: campaigns,
    isLoading,
    error,
  } = useSWR<Campaign[]>('/campaigns', async (url: string) => {
    return (await fetch(url)).json();
  });

  const parsedStats = useMemo(() => {
    const safeCampaigns = campaigns || [];
    return safeCampaigns.reduce(
      (acc, campaign) => {
        if (campaign.status === 'ACTIVE') {
          acc.active += 1;
        }

        acc.spend += Number(campaign.budget || 0);
        if (campaign.metrics) {
          try {
            const metrics = JSON.parse(campaign.metrics);
            acc.impressions += Number(metrics?.impressions || 0);
            acc.clicks += Number(metrics?.clicks || 0);
          } catch {
            // ignore malformed metrics payloads
          }
        }

        return acc;
      },
      { active: 0, spend: 0, impressions: 0, clicks: 0 }
    );
  }, [campaigns]);

  const createCampaign = () => {
    modal.openModal({
      title: 'Ad Campaign Wizard',
      size: '1000px',
      classNames: { modal: 'bg-[#0a0a0f] text-white p-0 border border-white/10 rounded-2xl overflow-hidden' },
      children: (
        <CampaignWizard 
          onClose={() => modal.closeAll()} 
          onComplete={() => mutate('/campaigns')} 
        />
      ),
    });
  };

  const updateStatus = async (id: string, status: CampaignStatus) => {
    await fetch(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    await mutate('/campaigns');
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1200px] w-full mx-auto pb-[100px]">
      <div className="flex justify-between items-center border-b border-newColColor pb-6 mt-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">
            {t('campaigns', 'Campaigns')}
          </h1>
          <p className="text-gray-400">
            {t('manage_your_ads', 'Manage and track your paid advertising campaigns across platforms.')}
          </p>
        </div>
        <Button onClick={createCampaign}>
          {t('create_campaign', 'Create Campaign')}
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-newBgColor border border-newColColor rounded-lg p-5 flex flex-col gap-1">
          <div className="text-gray-400 text-sm">Active Campaigns</div>
          <div className="text-2xl font-semibold">{parsedStats.active}</div>
        </div>
        <div className="bg-newBgColor border border-newColColor rounded-lg p-5 flex flex-col gap-1">
          <div className="text-gray-400 text-sm">Total Spend</div>
          <div className="text-2xl font-semibold">${parsedStats.spend.toFixed(2)}</div>
        </div>
        <div className="bg-newBgColor border border-newColColor rounded-lg p-5 flex flex-col gap-1">
          <div className="text-gray-400 text-sm">Total Impressions</div>
          <div className="text-2xl font-semibold">{parsedStats.impressions}</div>
        </div>
        <div className="bg-newBgColor border border-newColColor rounded-lg p-5 flex flex-col gap-1">
          <div className="text-gray-400 text-sm">Total Clicks</div>
          <div className="text-2xl font-semibold">{parsedStats.clicks}</div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-newBgColor border border-newColColor rounded-lg overflow-hidden mt-4">
        {error ? (
          <div className="p-6 text-red-400">
            {t(
              'campaigns_load_error',
              'Unable to load campaigns right now. Please try again.'
            )}
          </div>
        ) : campaigns?.length ? (
          <div className="divide-y divide-newColColor">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="font-semibold">{campaign.name}</div>
                  <div className="text-xs text-gray-400 uppercase">
                    {campaign.platform} - {campaign.type}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-300">{campaign.status}</span>
                  {campaign.status === 'DRAFT' || campaign.status === 'REVIEW' ? (
                    <Button onClick={() => updateStatus(campaign.id, 'ACTIVE')}>
                      {t('launch', 'Launch')}
                    </Button>
                  ) : campaign.status === 'ACTIVE' ? (
                    <Button onClick={() => updateStatus(campaign.id, 'PAUSED')}>
                      {t('pause', 'Pause')}
                    </Button>
                  ) : campaign.status === 'PAUSED' ? (
                    <Button onClick={() => updateStatus(campaign.id, 'ACTIVE')}>
                      {t('resume', 'Resume')}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <div className="w-[64px] h-[64px] rounded-full bg-[#AA0FA4]/20 flex items-center justify-center mb-4 text-[#FC69FF]">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
            <p className="text-gray-400 max-w-md mb-6">
              Connect your ad accounts and launch your first campaign directly from SwiftsAI.
            </p>
            <Button onClick={createCampaign}>
              Create your first campaign
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
