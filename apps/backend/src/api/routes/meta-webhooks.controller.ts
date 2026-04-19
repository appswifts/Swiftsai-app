import { Controller, Get, Post, Body, Query, HttpCode, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InboxService } from '@gitroom/nestjs-libraries/database/prisma/inbox/inbox.service';
import { Request } from 'express';

@ApiTags('MetaWebhooks')
@Controller('/webhooks/meta')
export class MetaWebhooksController {
  constructor(private readonly inboxService: InboxService) {}

  // 1. Meta Webhook Verification (Challenge)
  // When you add the webhook URL in the Meta Dashboard, Meta pings this to ensure you own it.
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string, 
    @Query('hub.challenge') challenge: string, 
    @Query('hub.verify_token') token: string
  ) {
    // You should set META_VERIFY_TOKEN in your .env equal to whatever string you put in the Meta dashboard.
    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      return challenge;
    }
    return '';
  }

  // 2. Receiving Inbound Messages
  @Post()
  @HttpCode(200)
  async handleWebhook(@Body() body: any, @Req() req: Request) {
    try {
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              const value = change.value;
              const metadata = value.metadata;
              // E.g., incoming phone number is the sender, business phone number is the recipient/externalId.
              const phoneId = metadata.phone_number_id;

              if (value.messages && value.messages.length > 0) {
                for (const msg of value.messages) {
                  await this.inboxService.handleIncomingMessage(
                    process.env.DEFAULT_ORG_ID || 'SYSTEM_WEBHOOK', 
                    'whatsapp',
                    phoneId,
                    msg.from, 
                    msg.text?.body || '[Media/Attachment]',
                    { name: value.contacts?.[0]?.profile?.name }
                  );
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Webhook error:', e);
    }
    
    // Meta requires a 200 OK fast or they will disable the webhook
    return { status: 'OK' };
  }
}
