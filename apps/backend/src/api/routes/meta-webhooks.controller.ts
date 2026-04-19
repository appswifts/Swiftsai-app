import { Controller, Get, Post, Body, Query, HttpCode, Res, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InboxService } from '@gitroom/nestjs-libraries/database/prisma/inbox/inbox.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Response } from 'express';

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
  //    Dynamically resolves the owning Organization via the Integration table.
  // ──────────────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(200)
  async handleWebhook(@Body() body: any) {
    // Always respond 200 immediately — Meta will disable the webhook if we're slow.
    // We process asynchronously in the background.
    this.processWebhookAsync(body).catch((err) =>
      this.logger.error('Async webhook processing failed', err)
    );
    return { status: 'OK' };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Multi-tenant Org Resolver
  //    Looks up which SwiftsAI Organization owns a given platform internalId.
  // ──────────────────────────────────────────────────────────────────────
  private async resolveOrganizationId(
    platformInternalId: string,
    providerIdentifier: string
  ): Promise<string | null> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        internalId: platformInternalId,
        providerIdentifier,
        deletedAt: null,
      },
      select: { organizationId: true },
    });
    return integration?.organizationId || null;
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
        // Log but don't crash — a single bad entry must not block others
        this.logger.error(`Error processing entry ${entry?.id}:`, err);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // WhatsApp Business Handler
  //    Payload: body.object === 'whatsapp_business_account'
  //    entry.changes[].value.messages[] contains inbound texts.
  // ──────────────────────────────────────────────────────────────────────
  private async handleWhatsApp(entry: any) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      // Resolve which SwiftsAI org owns this WhatsApp phone number
      const orgId = await this.resolveOrganizationId(phoneNumberId, 'whatsapp');
      if (!orgId) {
        this.logger.warn(`No org found for WhatsApp phone_number_id: ${phoneNumberId}`);
        continue;
      }

      for (const msg of value.messages || []) {
        const senderPhone = msg.from;
        const contactName = value.contacts?.[0]?.profile?.name || senderPhone;

        // Extract text content — support text, image captions, reactions, etc.
        let content = '[Unsupported message type]';
        if (msg.type === 'text') {
          content = msg.text?.body || '';
        } else if (msg.type === 'image') {
          content = msg.image?.caption || '[Image]';
        } else if (msg.type === 'video') {
          content = msg.video?.caption || '[Video]';
        } else if (msg.type === 'audio') {
          content = '[Voice message]';
        } else if (msg.type === 'document') {
          content = msg.document?.filename || '[Document]';
        } else if (msg.type === 'location') {
          content = `[Location: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
        } else if (msg.type === 'reaction') {
          content = `[Reaction: ${msg.reaction?.emoji || '👍'}]`;
        } else if (msg.type === 'sticker') {
          content = '[Sticker]';
        }

        await this.inboxService.handleIncomingMessage(
          orgId,
          'whatsapp',
          phoneNumberId,
          senderPhone,
          content,
          { name: contactName, username: senderPhone }
        );

        this.logger.log(`WhatsApp msg from ${senderPhone} → org ${orgId.slice(0, 8)}...`);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Facebook Messenger Handler
  //    Payload: body.object === 'page'
  //    entry.messaging[] contains sender/recipient and message object.
  // ──────────────────────────────────────────────────────────────────────
  private async handleFacebookMessenger(entry: any) {
    const pageId = entry.id;

    // Resolve which SwiftsAI org owns this Facebook Page
    const orgId = await this.resolveOrganizationId(pageId, 'facebook');
    if (!orgId) {
      this.logger.warn(`No org found for Facebook Page ID: ${pageId}`);
      return;
    }

    for (const messagingEvent of entry.messaging || []) {
      // Skip echo messages (messages our page sent)
      if (messagingEvent.message?.is_echo) continue;

      const senderId = messagingEvent.sender?.id;
      if (!senderId || senderId === pageId) continue;

      let content = '[Unsupported]';
      if (messagingEvent.message?.text) {
        content = messagingEvent.message.text;
      } else if (messagingEvent.message?.attachments) {
        const att = messagingEvent.message.attachments[0];
        content = `[${att.type || 'Attachment'}]`;
      } else if (messagingEvent.postback?.title) {
        content = `[Postback: ${messagingEvent.postback.title}]`;
      }

      await this.inboxService.handleIncomingMessage(
        orgId,
        'facebook',
        pageId,
        senderId,
        content,
        { username: senderId }
      );

      this.logger.log(`FB Messenger msg from ${senderId} → org ${orgId.slice(0, 8)}...`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Instagram Direct Handler
  //    Payload: body.object === 'instagram'
  //    entry.messaging[] contains sender/recipient and message object.
  // ──────────────────────────────────────────────────────────────────────
  private async handleInstagram(entry: any) {
    const igAccountId = entry.id;

    // Resolve which SwiftsAI org owns this Instagram account
    const orgId = await this.resolveOrganizationId(igAccountId, 'instagram');
    if (!orgId) {
      this.logger.warn(`No org found for Instagram account ID: ${igAccountId}`);
      return;
    }

    for (const messagingEvent of entry.messaging || []) {
      // Skip echo messages
      if (messagingEvent.message?.is_echo) continue;

      const senderId = messagingEvent.sender?.id;
      if (!senderId || senderId === igAccountId) continue;

      let content = '[Unsupported]';
      if (messagingEvent.message?.text) {
        content = messagingEvent.message.text;
      } else if (messagingEvent.message?.attachments) {
        const att = messagingEvent.message.attachments[0];
        content = `[${att.type || 'Attachment'}]`;
      }

      await this.inboxService.handleIncomingMessage(
        orgId,
        'instagram',
        igAccountId,
        senderId,
        content,
        { username: senderId }
      );

      this.logger.log(`IG DM from ${senderId} → org ${orgId.slice(0, 8)}...`);
    }
  }
}
