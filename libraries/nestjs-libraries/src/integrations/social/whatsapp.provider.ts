import {
  AnalyticsData,
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { WhatsappDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/whatsapp.dto';
import { Integration } from '@prisma/client';

export class WhatsappProvider extends SocialAbstract implements SocialProvider {
  identifier = 'whatsapp';
  name = 'WhatsApp Business';
  isBetweenSteps = true;
  scopes = [
    'whatsapp_business_management',
    'whatsapp_business_messaging',
    'business_management',
  ];
  override maxConcurrentJob = 50;
  editor = 'normal' as const;
  maxLength() {
    return 4096;
  }
  dto = WhatsappDto;

  override handleErrors(
    body: string,
    status: number
  ):
    | {
        type: 'refresh-token' | 'bad-body';
        value: string;
      }
    | undefined {
    if (body.indexOf('Error validating access token') > -1 || body.indexOf('190') > -1) {
      return {
        type: 'refresh-token' as const,
        value: 'Please re-authenticate your WhatsApp account',
      };
    }
    return undefined;
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    // Meta tokens are usually long-lived (60 days) and handled via exchange, but interface requires this.
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
        'https://www.facebook.com/v20.0/dialog/oauth' +
        `?client_id=${process.env.FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${process.env.FRONTEND_URL}/integrations/social/whatsapp`
        )}` +
        `&state=${state}` +
        `&scope=${this.scopes.join(',')}` +
        `&response_type=code`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const response = await (
      await fetch(
        `https://graph.facebook.com/v20.0/oauth/access_token` +
          `?client_id=${process.env.FACEBOOK_APP_ID}` +
          `&redirect_uri=${encodeURIComponent(
            `${process.env.FRONTEND_URL}/integrations/social/whatsapp${
              params.refresh ? `?refresh=${params.refresh}` : ''
            }`
          )}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&code=${params.code}`
      )
    ).json();

    const { access_token } = response;

    // Exchange for long-lived token
    const longLived = await (
      await fetch(
        `https://graph.facebook.com/v20.0/oauth/access_token` +
          `?grant_type=fb_exchange_token` +
          `&client_id=${process.env.FACEBOOK_APP_ID}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&fb_exchange_token=${access_token}`
      )
    ).json();

    const { id, name } = await (
      await fetch(
        `https://graph.facebook.com/v20.0/me?access_token=${longLived.access_token}`
      )
    ).json();

    return {
      id,
      name: name || 'WhatsApp Business',
      accessToken: longLived.access_token,
      refreshToken: longLived.access_token,
      expiresIn: longLived.expires_in || 5184000, // 60 days
      username: '',
      picture: '',
    };
  }

  async pages(accessToken: string) {
    // For WhatsApp, "pages" are actually Phone Numbers under WABAs
    // 1. Get WABAs
    const wabaResponse = await (
      await fetch(
        `https://graph.facebook.com/v20.0/me/whatsapp_business_accounts?access_token=${accessToken}`
      )
    ).json();

    const allPhoneNumbers: any[] = [];

    for (const waba of wabaResponse.data || []) {
      const phoneResponse = await (
        await fetch(
          `https://graph.facebook.com/v20.0/${waba.id}/phone_numbers?fields=display_phone_number,verified_name,id&access_token=${accessToken}`
        )
      ).json();

      for (const phone of phoneResponse.data || []) {
        allPhoneNumbers.push({
          id: phone.id,
          name: `${phone.verified_name} (${phone.display_phone_number})`,
          access_token: accessToken, // Use user token or generate system user token if needed, but Graph API allows user token for WABAs
          picture: '',
          username: phone.display_phone_number,
        });
      }
    }

    return allPhoneNumbers;
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<WhatsappDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    
    const body: any = {
      messaging_product: 'whatsapp',
      to: firstPost.settings?.templateName ? 'RECIPIENT_ID' : integration.internalId, // This needs clarification on how SwiftsAI handles "Posting" vs "Messaging"
      type: firstPost.settings?.templateName ? 'template' : 'text',
    };

    if (firstPost.settings?.templateName) {
      body.template = {
        name: firstPost.settings.templateName,
        language: { code: firstPost.settings.language || 'en_US' }
      };
    } else {
      body.text = { body: firstPost.message };
    }

    // Official API: Sending a message from the Phone Number ID (id)
    const response = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/${id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        },
        'whatsapp-post'
      )
    ).json();

    return [
      {
        id: firstPost.id,
        postId: response.messages?.[0]?.id,
        releaseURL: '', // WhatsApp messages don't have public URLs usually
        status: 'success',
      },
    ];
  }

  async sendDirectMessage(
    integration: Integration,
    recipientExternalId: string,
    content: string
  ): Promise<{ providerMessageId?: string }> {
    if (!integration?.internalId) {
      throw new Error('Missing WhatsApp phone number ID on integration');
    }

    if (!integration?.token) {
      throw new Error('Missing WhatsApp access token on integration');
    }

    if (!recipientExternalId) {
      throw new Error('Missing WhatsApp recipient id');
    }

    const response = await (
      await this.fetch(
        `https://graph.facebook.com/v20.0/${integration.internalId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${integration.token}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipientExternalId,
            type: 'text',
            text: { body: content },
          }),
        },
        'whatsapp-send-direct'
      )
    ).json();

    return { providerMessageId: response.messages?.[0]?.id };
  }
}
