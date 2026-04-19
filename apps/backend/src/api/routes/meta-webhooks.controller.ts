import { Controller, Get, Post, Body, Query, HttpCode, Res, Logger, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InboxService } from '@gitroom/nestjs-libraries/database/prisma/inbox/inbox.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

@ApiTags('MetaWebhooks')
@Controller('/webhooks/meta')
export class MetaWebhooksController {
  private readonly logger = new Logger(MetaWebhooksController.name);

  constructor(
    private readonly inboxService: InboxService,
    private readonly prisma: PrismaService
  ) {}

  // ──────────────────────────────────────────────────────────────────────
  // 1. Webhook Verification (GET)
  //    Meta pings this endpoint when you configure the webhook URL.
  //    Must echo back the hub.challenge as raw text with status 200.
  // ──────────────────────────────────────────────────────────────────────
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
    @Res() res: Response
  ) {
    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      this.logger.log('Webhook verification succeeded');
      return res.status(200).send(challenge);
    }
    this.logger.warn(`Webhook verification failed. Mode: ${mode}, Token mismatch.`);
    return res.status(403).send('Verification failed');
  }

  // ──────────────────────────────────────────────────────────────────────
  // 2. Inbound Message Handler (POST)
  //    Receives payloads from WhatsApp, Facebook Messenger, and Instagram.
  //    Validates X-Hub-Signature-256 for security, then processes async.
  // ──────────────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>
  ) {
    // Validate signature if FACEBOOK_APP_SECRET is set
    if (process.env.FACEBOOK_APP_SECRET && req.rawBody) {
      const signature = req.headers['x-hub-signature-256'] as string;
      if (!this.validateSignature(req.rawBody, signature)) {
        this.logger.warn('Invalid webhook signature — payload rejected');
        return { status: 'INVALID_SIGNATURE' };
      }
    }

    // Always respond 200 immediately — Meta will disable the webhook if we're slow.
    this.processWebhookAsync(body).catch((err) =>
      this.logger.error('Async webhook processing failed', err)
    );
    return { status: 'OK' };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Signature Validation (X-Hub-Signature-256)
  //    Meta signs every webhook payload with SHA256 using your App Secret.
  // ──────────────────────────────────────────────────────────────────────
  private validateSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined
  ): boolean {
    if (!signatureHeader) {
      this.logger.warn('Missing X-Hub-Signature-256 header');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.FACEBOOK_APP_SECRET!)
      .update(rawBody)
      .digest('hex');

    const receivedSignature = signatureHeader.replace('sha256=', '');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Multi-tenant Org Resolver
  //    Looks up which SwiftsAI Organization owns a given platform internalId.
  // ──────────────────────────────────────────────────────────────────────
  private async resolveOrganizationId(
    platformInternalId: string,
    providerIdentifier: string
  ): Promise<{ organizationId: string; token: string } | null> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        internalId: platformInternalId,
        providerIdentifier,
        deletedAt: null,
      },
      select: { organizationId: true, token: true },
    });
    if (!integration) return null;
    return { organizationId: integration.organizationId, token: integration.token };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Async Processing Engine — parses the three Meta platforms
  // ──────────────────────────────────────────────────────────────────────
  private async processWebhookAsync(body: any) {
    if (!body?.object || !body?.entry) return;

    for (const entry of body.entry) {
      try {
        switch (body.object) {
          case 'whatsapp_business_account':
            await this.handleWhatsApp(entry);
            break;
          case 'page':
            await this.handleFacebookMessenger(entry);
            break;
          case 'instagram':
            await this.handleInstagram(entry);
            break;
          default:
            this.logger.debug(`Unhandled webhook object type: ${body.object}`);
        }
      } catch (err) {
        this.logger.error(`Error processing entry ${entry?.id}:`, err);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // WhatsApp Business Handler
  // ──────────────────────────────────────────────────────────────────────
  private async handleWhatsApp(entry: any) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const resolved = await this.resolveOrganizationId(phoneNumberId, 'whatsapp');
      if (!resolved) {
        this.logger.warn(`No org found for WhatsApp phone_number_id: ${phoneNumberId}`);
        continue;
      }

      // Log delivery status updates (can be expanded to update message status in DB)
      for (const status of value.statuses || []) {
        this.logger.debug(`WhatsApp delivery status: ${status.status} for msg ${status.id}`);
      }

      for (const msg of value.messages || []) {
        const senderPhone = msg.from;
        const contactName = value.contacts?.[0]?.profile?.name || senderPhone;

        let content = '[Unsupported message type]';
        if (msg.type === 'text') content = msg.text?.body || '';
        else if (msg.type === 'image') content = msg.image?.caption || '[Image]';
        else if (msg.type === 'video') content = msg.video?.caption || '[Video]';
        else if (msg.type === 'audio') content = '[Voice message]';
        else if (msg.type === 'document') content = msg.document?.filename || '[Document]';
        else if (msg.type === 'location') content = `[Location: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
        else if (msg.type === 'reaction') content = `[Reaction: ${msg.reaction?.emoji || '👍'}]`;
        else if (msg.type === 'sticker') content = '[Sticker]';

        await this.inboxService.handleIncomingMessage(
          resolved.organizationId,
          'whatsapp',
          phoneNumberId,
          senderPhone,
          content,
          { name: contactName, username: senderPhone }
        );

        this.logger.log(`WhatsApp msg from ${senderPhone} → org ${resolved.organizationId.slice(0, 8)}...`);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Facebook Messenger Handler
  // ──────────────────────────────────────────────────────────────────────
  private async handleFacebookMessenger(entry: any) {
    const pageId = entry.id;

    const resolved = await this.resolveOrganizationId(pageId, 'facebook');
    if (!resolved) {
      this.logger.warn(`No org found for Facebook Page ID: ${pageId}`);
      return;
    }

    for (const messagingEvent of entry.messaging || []) {
      if (messagingEvent.message?.is_echo) continue;

      const senderId = messagingEvent.sender?.id;
      if (!senderId || senderId === pageId) continue;

      // Handle read receipts
      if (messagingEvent.read) {
        this.logger.debug(`FB read receipt from ${senderId}`);
        continue;
      }

      // Handle delivery receipts
      if (messagingEvent.delivery) {
        this.logger.debug(`FB delivery receipt from ${senderId}`);
        continue;
      }

      let content = '[Unsupported]';
      if (messagingEvent.message?.text) {
        content = messagingEvent.message.text;
      } else if (messagingEvent.message?.attachments) {
        const att = messagingEvent.message.attachments[0];
        content = att.type === 'image' ? '[Image]'
          : att.type === 'video' ? '[Video]'
          : att.type === 'audio' ? '[Audio]'
          : att.type === 'file' ? '[File]'
          : `[${att.type || 'Attachment'}]`;
      } else if (messagingEvent.postback?.title) {
        content = `[Button: ${messagingEvent.postback.title}]`;
      }

      await this.inboxService.handleIncomingMessage(
        resolved.organizationId,
        'facebook',
        pageId,
        senderId,
        content,
        { username: senderId }
      );

      this.logger.log(`FB Messenger msg from ${senderId} → org ${resolved.organizationId.slice(0, 8)}...`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Instagram Direct Handler
  // ──────────────────────────────────────────────────────────────────────
  private async handleInstagram(entry: any) {
    const igAccountId = entry.id;

    const resolved = await this.resolveOrganizationId(igAccountId, 'instagram');
    if (!resolved) {
      this.logger.warn(`No org found for Instagram account ID: ${igAccountId}`);
      return;
    }

    for (const messagingEvent of entry.messaging || []) {
      if (messagingEvent.message?.is_echo) continue;

      const senderId = messagingEvent.sender?.id;
      if (!senderId || senderId === igAccountId) continue;

      let content = '[Unsupported]';
      if (messagingEvent.message?.text) {
        content = messagingEvent.message.text;
      } else if (messagingEvent.message?.attachments) {
        const att = messagingEvent.message.attachments[0];
        content = att.type === 'image' ? '[Image]'
          : att.type === 'video' ? '[Video]'
          : att.type === 'story_mention' ? '[Story Mention]'
          : `[${att.type || 'Attachment'}]`;
      }

      await this.inboxService.handleIncomingMessage(
        resolved.organizationId,
        'instagram',
        igAccountId,
        senderId,
        content,
        { username: senderId }
      );

      this.logger.log(`IG DM from ${senderId} → org ${resolved.organizationId.slice(0, 8)}...`);
    }
  }
}
