import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { InstagramDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/instagram.dto';
import { InstagramProvider } from '@gitroom/nestjs-libraries/integrations/social/instagram.provider';
import { Integration } from '@prisma/client';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';

const instagramProvider = new InstagramProvider();

@Rules(
  "Instagram should have at least one attachment, if it's a story, it can have only one picture"
)
export class InstagramStandaloneProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'instagram-standalone';
  name = 'Instagram\n(Standalone)';
  isBetweenSteps = false;
  refreshCron = true;
  scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
  ];
  override maxConcurrentJob = 200; // Instagram standalone has stricter limits
  dto = InstagramDto;

  editor = 'normal' as const;
  maxLength() {
    return 2200;
  }

  public override handleErrors(
    body: string,
    status: number
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    return instagramProvider.handleErrors(body, status);
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
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
    const redirectUri = `${
      process?.env.FRONTEND_URL?.indexOf('https') == -1
        ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
        : `${process?.env.FRONTEND_URL}`
    }/integrations/social/instagram-standalone`;

    return {
      url:
        `https://www.facebook.com/v20.0/dialog/oauth` +
        `?client_id=${process.env.FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}` +
        `&scope=${encodeURIComponent(this.scopes.join(','))}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh: string;
  }) {
    const redirectUri = `${
      process?.env.FRONTEND_URL?.indexOf('https') == -1
        ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
        : `${process?.env.FRONTEND_URL}`
    }/integrations/social/instagram-standalone${
      params.refresh ? `?refresh=${params.refresh}` : ''
    }`;

    const getAccessToken = await (
      await fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          `?client_id=${process.env.FACEBOOK_APP_ID}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&code=${params.code}`
      )
    ).json();

    if (!getAccessToken.access_token) {
      throw new Error(
        `Facebook token exchange failed: ${getAccessToken.error?.message || JSON.stringify(getAccessToken)}`
      );
    }

    const { access_token } = await (
      await fetch(
        'https://graph.facebook.com/v20.0/oauth/access_token' +
          '?grant_type=fb_exchange_token' +
          `&client_id=${process.env.FACEBOOK_APP_ID}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&fb_exchange_token=${getAccessToken.access_token}`
      )
    ).json();

    if (!access_token) {
      throw new Error('Failed to exchange for long-lived access token');
    }

    // Get the Instagram Business Account connected to this Facebook user
    const meFields = await (
      await fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name,picture,instagram_business_account{id,username,name,profile_picture_url}&access_token=${access_token}`
      )
    ).json();

    let igAccount = meFields?.instagram_business_account;

    // Fallback: find Instagram account through connected Facebook pages
    if (!igAccount?.id) {
      try {
        const pagesResponse = await (
          await fetch(
            `https://graph.facebook.com/v20.0/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url}&limit=100&access_token=${access_token}`
          )
        ).json();

        const pageWithIg = pagesResponse?.data?.find(
          (p: any) => p?.instagram_business_account?.id
        );

        if (pageWithIg?.instagram_business_account) {
          igAccount = pageWithIg.instagram_business_account;
        }
      } catch {
        // ignore fallback errors
      }
    }

    if (!igAccount?.id) {
      throw new Error(
        'No Instagram Business Account found. Go to Accounts Center on Facebook to connect your Instagram Business or Creator account to your Facebook profile, then try again.'
      );
    }

    return {
      id: igAccount.id,
      name: igAccount.name || meFields.name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: igAccount.profile_picture_url || meFields?.picture?.data?.url || '',
      username: igAccount.username || '',
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<InstagramDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return instagramProvider.post(
      id,
      accessToken,
      postDetails,
      integration
    );
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails<InstagramDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return instagramProvider.comment(
      id,
      postId,
      lastCommentId,
      accessToken,
      postDetails,
      integration
    );
  }

  async analytics(id: string, accessToken: string, date: number) {
    return instagramProvider.analytics(
      id,
      accessToken,
      date
    );
  }

  async postAnalytics(
    integrationId: string,
    accessToken: string,
    postId: string,
    date: number
  ) {
    return instagramProvider.postAnalytics(
      integrationId,
      accessToken,
      postId,
      date
    );
  }
}
