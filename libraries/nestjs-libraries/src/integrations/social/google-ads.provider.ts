import {
  AnalyticsData,
  AuthTokenDetails,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';

export interface GoogleAdCreative {
  headline: string;
  description: string;
  finalUrl: string;
  displayUrl?: string;
}

export interface GoogleAdConfig {
  campaignName: string;
  objective: 'SEARCH' | 'DISPLAY' | 'SHOPPING' | 'VIDEO' | 'PERFORMANCE_MAX';
  dailyBudget: number;
  keywords?: string[];
  targeting?: {
    ageMin?: number;
    ageMax?: number;
    genders?: string[];
    locations?: string[];
  };
}

export class GoogleAdsProvider extends SocialAbstract implements SocialProvider {
  identifier = 'google-ads';
  name = 'Google Ads';
  isBetweenSteps = true;
  scopes = [
    'https://www.googleapis.com/auth/adwords',
  ];
  override maxConcurrentJob = 5;
  editor = 'normal' as const;

  maxLength() {
    return 4096;
  }

  override handleErrors(
    body: string,
    status: number
  ):
    | {
        type: 'refresh-token' | 'bad-body';
        value: string;
      }
    | undefined {
    if (status === 401 || body.indexOf('UNAUTHENTICATED') > -1) {
      return {
        type: 'refresh-token' as const,
        value: 'Please re-authenticate your Google Ads account',
      };
    }
    if (body.indexOf('ADQUOTA_EXCEEDED') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Rate limit exceeded. Please try again later.',
      };
    }
    if (body.indexOf('INVALID_AD_GROUP_AD') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Invalid ad creative format',
      };
    }
    if (body.indexOf('KEYWORD_INVALID') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Invalid keyword format',
      };
    }
    return undefined;
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    // Refresh using Google OAuth refresh token flow
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    }).then(r => r.json());

    if (response.error) {
      return {
        refreshToken: refresh_token,
        expiresIn: 0,
        accessToken: '',
        id: '',
        name: '',
        picture: '',
        username: '',
      };
    }

    return {
      refreshToken: refresh_token,
      expiresIn: response.expires_in,
      accessToken: response.access_token,
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    const scope = this.scopes.join(' ');
    return {
      url:
        'https://accounts.google.com/o/oauth2/v2/auth' +
        `?client_id=${process.env.GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/google-ads`)}` +
        `&state=${state}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&response_type=code` +
        `&access_type=offline` +
        `&prompt=consent`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string; refresh?: string }) {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code: params.code,
        redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/google-ads`,
        grant_type: 'authorization_code',
      }),
    }).then(r => r.json());

    const access_token = tokenResponse.access_token;
    const refresh_token = tokenResponse.refresh_token || params.refresh || '';

    // Get customer IDs from Google Ads
    const customerIds = await this.getAccessibleCustomers(access_token);

    return {
      id: customerIds[0] || '',
      name: `Google Ads (${customerIds.length} account${customerIds.length !== 1 ? 's' : ''})`,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: tokenResponse.expires_in || 3600,
      picture: '',
      username: customerIds.join(','),
    };
  }

  private async getAccessibleCustomers(accessToken: string): Promise<string[]> {
    try {
      const response = await fetch(
        `https://googleads.googleapis.com/v18/customers:listAccessible`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
          },
        }
      ).then(r => r.json());

      return response.resourceNames || [];
    } catch {
      return [];
    }
  }

  async pages(accessToken: string) {
    const customerIds = await this.getAccessibleCustomers(accessToken);
    return customerIds.map((id: string) => {
      // Extract customer ID from resource name (e.g., "customers/123456789")
      const customerId = id.replace('customers/', '');
      return {
        id: customerId,
        name: `Account ${customerId}`,
        access_token: accessToken,
        picture: '',
        username: customerId,
      };
    });
  }

  async post(id: string, accessToken: string, postDetails: any[]): Promise<any[]> {
    throw new Error('Use createAdCampaign for Google Ads');
  }

  async createAdCampaign(
    customerId: string,
    accessToken: string,
    config: GoogleAdConfig
  ): Promise<{ campaignId: string }> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

    // Create campaign
    const campaignResponse = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/campaigns:mutate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operations: [
            {
              create: {
                resourceName: `customers/${customerId}/campaigns/-`,
                name: config.campaignName,
                campaignBudget: `customers/${customerId}/campaignBudgets/-`,
                status: 'PAUSED',
                advertisingChannelType: this.mapObjectiveToChannel(config.objective),
              },
            },
          ],
        }),
      }
    ).then(r => r.json());

    const campaignResource = campaignResponse.results?.[0]?.resourceName;
    return { campaignId: campaignResource };
  }

  async createAdGroup(
    customerId: string,
    accessToken: string,
    campaignId: string,
    name: string
  ): Promise<{ adGroupId: string }> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

    const response = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/adGroups:mutate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operations: [
            {
              create: {
                resourceName: `customers/${customerId}/adGroups/-`,
                name: name,
                campaign: campaignId,
                status: 'ENABLED',
              },
            },
          ],
        }),
      }
    ).then(r => r.json());

    const adGroupResource = response.results?.[0]?.resourceName;
    return { adGroupId: adGroupResource };
  }

  async createTextAd(
    customerId: string,
    accessToken: string,
    adGroupId: string,
    creative: GoogleAdCreative
  ): Promise<{ adId: string }> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

    const response = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/adGroupAds:mutate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operations: [
            {
              create: {
                resourceName: `customers/${customerId}/adGroupAds/-`,
                adGroup: adGroupId,
                ad: {
                  textAd: {
                    headline: creative.headline.slice(0, 90),
                    description: creative.description.slice(0, 90),
                    displayUrl: creative.displayUrl || creative.finalUrl,
                    finalUrls: [creative.finalUrl],
                  },
                },
                status: 'PAUSED',
              },
            },
          ],
        }),
      }
    ).then(r => r.json());

    const adResource = response.results?.[0]?.resourceName;
    return { adId: adResource };
  }

  async addKeywords(
    customerId: string,
    accessToken: string,
    adGroupId: string,
    keywords: string[]
  ): Promise<void> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

    const operations = keywords.map(keyword => ({
      create: {
        resourceName: `customers/${customerId}/adGroupCriteria/-`,
        adGroup: adGroupId,
        status: 'ENABLED',
        keyword: {
          text: keyword.slice(0, 80),
          matchType: 'EXACT',
        },
      },
    }));

    await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/adGroupCriteria:mutate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operations }),
      }
    );
  }

  async setCampaignActive(
    customerId: string,
    accessToken: string,
    campaignId: string
  ): Promise<void> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

    // Extract campaign ID from resource name
    const campaignIdOnly = campaignId.split('/').pop();

    await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/campaigns:mutate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operations: [
            {
              update: {
                resourceName: campaignId,
                status: 'ENABLED',
              },
              updateMask: 'status',
            },
          ],
        }),
      }
    );
  }

  async setCampaignPaused(
    customerId: string,
    accessToken: string,
    campaignId: string
  ): Promise<void> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

    await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/campaigns:mutate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operations: [
            {
              update: {
                resourceName: campaignId,
                status: 'PAUSED',
              },
              updateMask: 'status',
            },
          ],
        }),
      }
    );
  }

  async getCampaignMetrics(
    customerId: string,
    accessToken: string,
    campaignId: string,
    dateRange: string = 'LAST_7_DAYS'
  ): Promise<{
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
  }> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

    const response = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAdsFields/search_stream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            SELECT
              campaign.id,
              metrics.impressions,
              metrics.clicks,
              metrics.cost_micros,
              metrics.conversions
            FROM campaign
            WHERE campaign.id = '${campaignId}'
          `,
          dateRange: dateRange,
        }),
      }
    ).then(r => r.json());

    const row = response.results?.[0]?.metrics;
    return {
      impressions: row?.impressions || 0,
      clicks: row?.clicks || 0,
      cost: (row?.costMicros || 0) / 1000000,
      conversions: row?.conversions || 0,
    };
  }

  private mapObjectiveToChannel(objective: string): string {
    const mapping: Record<string, string> = {
      SEARCH: 'SEARCH',
      DISPLAY: 'DISPLAY',
      SHOPPING: 'SHOPPING',
      VIDEO: 'VIDEO',
      PERFORMANCE_MAX: 'PERFORMANCE_MAX',
    };
    return mapping[objective] || 'SEARCH';
  }
}
