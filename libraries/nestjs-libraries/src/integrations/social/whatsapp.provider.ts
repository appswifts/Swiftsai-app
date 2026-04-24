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

// ─── Helpers ────────────────────────────────────────────────
const graphApiVersion = () =>
  process.env.META_GRAPH_API_VERSION || 'v22.0';

const graphUrl = (path: string) =>
  `https://graph.facebook.com/${graphApiVersion()}/${path}`;

// ─── Provider ───────────────────────────────────────────────
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
        `https://www.facebook.com/${graphApiVersion()}/dialog/oauth` +
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
        graphUrl('oauth/access_token') +
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
        graphUrl('oauth/access_token') +
          `?grant_type=fb_exchange_token` +
          `&client_id=${process.env.FACEBOOK_APP_ID}` +
          `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
          `&fb_exchange_token=${access_token}`
      )
    ).json();

    const { id, name } = await (
      await fetch(
        graphUrl(`me?access_token=${longLived.access_token}`)
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
        graphUrl(`me/whatsapp_business_accounts?access_token=${accessToken}`)
      )
    ).json();

    const allPhoneNumbers: any[] = [];

    for (const waba of wabaResponse.data || []) {
      const phoneResponse = await (
        await fetch(
          graphUrl(
            `${waba.id}/phone_numbers?fields=display_phone_number,verified_name,id&access_token=${accessToken}`
          )
        )
      ).json();

      for (const phone of phoneResponse.data || []) {
        allPhoneNumbers.push({
          id: phone.id,
          name: `${phone.verified_name} (${phone.display_phone_number})`,
          access_token: accessToken,
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
      type: firstPost.settings?.templateName ? 'template' : 'text',
    };

    if (firstPost.settings?.templateName) {
      // Template messages need a recipient — use the integration's configured number
      body.to = integration.internalId;
      body.template = {
        name: firstPost.settings.templateName,
        language: { code: firstPost.settings.language || 'en_US' },
      };
    } else {
      body.to = integration.internalId;
      body.text = { body: firstPost.message };
    }

    const response = await (
      await this.fetch(
        graphUrl(`${id}/messages`),
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
        releaseURL: '',
        status: 'success',
      },
    ];
  }

  // ──────────────────────────────────────────────────────────
  // Direct Messaging (Inbox / Outbound)
  // ──────────────────────────────────────────────────────────
  async sendDirectMessage(
    integration: Integration,
    recipientExternalId: string,
    content: string,
    attachmentsJson?: string
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

    // Check if this is an interactive message (parse attachmentsJson)
    let messageBody: any;
    if (attachmentsJson) {
      try {
        const parsed = JSON.parse(attachmentsJson);
        if (parsed.type === 'interactive') {
          messageBody = {
            messaging_product: 'whatsapp',
            to: recipientExternalId,
            type: 'interactive',
            interactive: parsed.interactive,
          };
        }
      } catch {
        // not JSON or not interactive, fall through to text
      }
    }

    if (!messageBody) {
      messageBody = {
        messaging_product: 'whatsapp',
        to: recipientExternalId,
        type: 'text',
        text: { body: content },
      };
    }

    const response = await (
      await this.fetch(
        graphUrl(`${integration.internalId}/messages`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${integration.token}`,
          },
          body: JSON.stringify(messageBody),
        },
        'whatsapp-send-direct'
      )
    ).json();

    return { providerMessageId: response.messages?.[0]?.id };
  }

  // ──────────────────────────────────────────────────────────
  // Mark messages as read on WhatsApp
  // ──────────────────────────────────────────────────────────
  async markAsRead(
    phoneNumberId: string,
    accessToken: string,
    messageId: string
  ): Promise<void> {
    await this.fetch(
      graphUrl(`${phoneNumberId}/messages`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      },
      'whatsapp-mark-read'
    );
  }

  // ──────────────────────────────────────────────────────────
  // Typing indicators
  // ──────────────────────────────────────────────────────────
  async sendTypingIndicator(
    phoneNumberId: string,
    accessToken: string,
    recipientId: string,
    typing: 'typing' | 'paused' = 'typing'
  ): Promise<void> {
    try {
      await this.fetch(
        graphUrl(`${phoneNumberId}/messages`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipientId,
            type: 'typing',
            typing: typing === 'typing' ? 'on' : 'off',
          }),
        },
        'whatsapp-typing'
      );
    } catch {
      // Typing indicator failures are non-critical — ignore
    }
  }

  // ──────────────────────────────────────────────────────────
  // Send reaction
  // ──────────────────────────────────────────────────────────
  async sendReaction(
    phoneNumberId: string,
    accessToken: string,
    recipientId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    await this.fetch(
      graphUrl(`${phoneNumberId}/messages`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'reaction',
          reaction: {
            message_id: messageId,
            emoji,
          },
        }),
      },
      'whatsapp-reaction'
    );
  }

  // ──────────────────────────────────────────────────────────
  // Download media from Meta CDN
  // ──────────────────────────────────────────────────────────
  async downloadMedia(
    mediaId: string,
    accessToken: string
  ): Promise<{ url: string; mimeType: string; fileSize?: number }> {
    // Step 1: Get media URL from Graph API
    const metaResponse = await (
      await this.fetch(
        graphUrl(mediaId),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        'whatsapp-media-meta'
      )
    ).json();

    return {
      url: metaResponse.url, // This is a temporary CDN URL that requires the access token to download
      mimeType: metaResponse.mime_type,
      fileSize: metaResponse.file_size,
    };
  }

  // ──────────────────────────────────────────────────────────
  // Build interactive message payloads
  // ──────────────────────────────────────────────────────────
  static buildReplyButtonMessage(
    bodyText: string,
    buttons: { id: string; title: string }[]
  ) {
    return {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title.slice(0, 20) },
          })),
        },
      },
    };
  }

  static buildListMessage(
    bodyText: string,
    buttonText: string,
    sections: {
      title: string;
      rows: { id: string; title: string; description?: string }[];
    }[]
  ) {
    return {
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonText.slice(0, 20),
          sections: sections.map((s) => ({
            title: s.title,
            rows: s.rows.slice(0, 10).map((r) => ({
              id: r.id,
              title: r.title.slice(0, 24),
              description: r.description?.slice(0, 72),
            })),
          })),
        },
      },
    };
  }

  static buildCTAUrlMessage(
    bodyText: string,
    displayText: string,
    url: string
  ) {
    return {
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text: bodyText },
        action: {
          name: 'cta_url',
          parameters: {
            display_text: displayText,
            url,
          },
        },
      },
    };
  }
}
