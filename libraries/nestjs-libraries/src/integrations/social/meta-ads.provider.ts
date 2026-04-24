import {
  AnalyticsData,
  AuthTokenDetails,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';

export interface MetaAdCreative {
  name: string;
  body: string;
  headline?: string;
  imageUrl?: string;
  callToAction?: {
    type: string;
    link: string;
  };
}

export interface MetaAdSetConfig {
  targeting: {
    ageMin?: number;
    ageMax?: number;
    countries?: string[];
    genders?: number[];
    interests?: number[];
  };
  dailyBudget: number;
  startDate?: string;
}

export interface MetaCampaignConfig {
  objective: 'LINK_CLICKS' | 'CONVERSIONS' | 'REACH' | 'BRAND_AWARENESS' | 'LEAD_GENERATION';
  adSets: MetaAdSetConfig[];
}

export class MetaAdsProvider extends SocialAbstract implements SocialProvider {
  identifier = 'meta-ads';
  name = 'Meta Ads';
  isBetweenSteps = true;
  scopes = [
    'ads_management',
    'ads_read',
    'business_management',
    'pages_show_list',
  ];
  override maxConcurrentJob = 10;
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
    if (body.indexOf('OAuthException') > -1 || body.indexOf('190') > -1) {
      return {
        type: 'refresh-token' as const,
        value: 'Please re-authenticate your Meta Ads account',
      };
    }
    if (body.indexOf('Invalid adset') > -1 || body.indexOf('2601') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Invalid ad set configuration',
      };
    }
    if (body.indexOf('2611') > -1 || body.indexOf('ad_account_disabled') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Ad account is disabled or has billing issues',
      };
    }
    return undefined;
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    // Meta tokens for business accounts require re-auth
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

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url:
        `https://www.facebook.com/v20.0/dialog/oauth` +
        `?client_id=${process.env.FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${process.env.FRONTEND_URL}/integrations/social/meta-ads`
        )}` +
        `&state=${state}` +
        `&scope=${this.scopes.join(',')}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const getAccessToken = await (
      await fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          `?client_id=${process.env.FACEBOOK_APP_ID}` +
          `&redirect_uri=${encodeURIComponent(
            `${process.env.FRONTEND_URL}/integrations/social/meta-ads${
              params.refresh ? `?refresh=${params.refresh}` : ''
            }`
          )}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&code=${params.code}`
      )
    ).json();

    const access_token = getAccessToken.access_token;

    // Get user's ad accounts
    const { data: accounts } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_status&access_token=${access_token}`
      )
    ).json();

    const primaryAccount = accounts?.find((a: any) => a.account_status === 1) || accounts?.[0];

    if (!primaryAccount) {
      throw new Error('No active ad accounts found. Please create one in Meta Business Manager.');
    }

    const { name: businessName } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/me?fields=name&access_token=${access_token}`
      )
    ).json();

    return {
      id: primaryAccount.id,
      name: businessName ? `${businessName} - ${primaryAccount.name}` : primaryAccount.name || 'Meta Ads',
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: '',
      username: primaryAccount.id,
    };
  }

  async pages(accessToken: string) {
    // Returns available ad accounts as "pages" for selection
    const { data: accounts } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_status,currency,budget_remaining&access_token=${accessToken}`
      )
    ).json();

    return (accounts || []).map((acc: any) => ({
      id: acc.id,
      name: `${acc.name || acc.id} (${acc.account_status === 1 ? 'Active' : 'Inactive'})`,
      access_token: accessToken,
      picture: '',
      username: acc.currency,
    }));
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: any[]
  ): Promise<any[]> {
    // This provider is for ads, not organic posts
    // The actual ad creation is handled via createAdCampaign
    throw new Error('Use createAdCampaign for Meta Ads');
  }

  async createAdCampaign(
    adAccountId: string,
    accessToken: string,
    config: {
      name: string;
      objective: string;
      dailyBudget: number;
    }
  ): Promise<{ campaignId: string }> {
    const response = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/act_${adAccountId}/campaigns`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: config.name,
            objective: config.objective,
            status: 'PAUSED',
            daily_budget: config.dailyBudget * 100, // cents
          }),
        },
        'meta-ads-create-campaign'
      )
    ).json();

    return { campaignId: response.id };
  }

  async createAdSet(
    adAccountId: string,
    campaignId: string,
    accessToken: string,
    config: {
      name: string;
      targeting: any;
      dailyBudget: number;
    }
  ): Promise<{ adSetId: string }> {
    const response = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/act_${adAccountId}/adsets`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: config.name,
            campaign_id: campaignId,
            targeting: config.targeting,
            daily_budget: config.dailyBudget * 100,
            status: 'PAUSED',
          }),
        },
        'meta-ads-create-adset'
      )
    ).json();

    return { adSetId: response.id };
  }

  async createAdCreative(
    adAccountId: string,
    accessToken: string,
    creative: {
      body: string;
      headline?: string;
      imageUrl?: string;
      callToActionType?: string;
      destinationUrl?: string;
    }
  ): Promise<{ creativeId: string }> {
    // Build creative object
    const creativeBody: any = {
      name: `Creative_${makeId(8)}`,
      body: { text: creative.body },
    };

    if (creative.imageUrl) {
      // Upload image first
      const imageHash = await this.uploadAdImage(adAccountId, accessToken, creative.imageUrl);
      creativeBody.image_hash = imageHash;
    }

    if (creative.headline) {
      creativeBody.link_decription = creative.headline;
    }

    if (creative.destinationUrl) {
      creativeBody.call_to_action_type = creative.callToActionType || 'LEARN_MORE';
      creativeBody.link_url = creative.destinationUrl;
    }

    const response = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/act_${adAccountId}/adcreatives`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creativeBody),
        },
        'meta-ads-create-creative'
      )
    ).json();

    return { creativeId: response.id };
  }

  async createAd(
    adAccountId: string,
    adSetId: string,
    creativeId: string,
    accessToken: string
  ): Promise<{ adId: string }> {
    const response = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/act_${adAccountId}/ads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Ad_${makeId(8)}`,
            adset_id: adSetId,
            creative: { creative_id: creativeId },
            status: 'PAUSED',
          }),
        },
        'meta-ads-create-ad'
      )
    ).json();

    return { adId: response.id };
  }

  async uploadAdImage(
    adAccountId: string,
    accessToken: string,
    imageUrl: string
  ): Promise<string> {
    const response = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/act_${adAccountId}/adimages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bytes: imageUrl,
          }),
        },
        'meta-ads-upload-image'
      )
    ).json();

    return response.images?.[0]?.hash || response.hash;
  }

  async getAdMetrics(
    adAccountId: string,
    accessToken: string,
    datePreset: string = 'last_7d'
  ): Promise<{
    impressions: number;
    clicks: number;
    spend: number;
    reach: number;
  }> {
    const { data } = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/act_${adAccountId}/insights?fields=impressions,clicks,spend,reach&date_preset=${datePreset}&access_token=${accessToken}`
      )
    ).json();

    const insight = data?.[0] || {};
    return {
      impressions: parseInt(insight.impressions || '0'),
      clicks: parseInt(insight.clicks || '0'),
      spend: parseFloat(insight.spend || '0'),
      reach: parseInt(insight.reach || '0'),
    };
  }

  async setAdActive(
    adId: string,
    accessToken: string
  ): Promise<void> {
    await this.fetch(
      `https://graph.facebook.com/v20.0/${adId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      },
      'meta-ads-activate'
    );
  }

  async setAdPaused(
    adId: string,
    accessToken: string
  ): Promise<void> {
    await this.fetch(
      `https://graph.facebook.com/v20.0/${adId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAUSED' }),
      },
      'meta-ads-pause'
    );
  }
}
