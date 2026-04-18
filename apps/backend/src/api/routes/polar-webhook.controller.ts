import { Controller, Post, Headers, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { BillingMappingService } from '@gitroom/nestjs-libraries/services/billing.mapping.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { ProcessedWebhookRepository } from '@gitroom/nestjs-libraries/database/prisma/webhooks/processed-webhook.repository';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
// @ts-ignore
import { validateEvent } from '@polar-sh/sdk/webhooks';

@Controller('billing/polar-webhook')
export class PolarWebhookController {
  private readonly logger = new Logger(PolarWebhookController.name);

  constructor(
    private readonly billingMapping: BillingMappingService,
    private readonly subscriptionService: SubscriptionService,
    private readonly organizationService: OrganizationService,
    private readonly processedWebhookRepo: ProcessedWebhookRepository
  ) {}

  private getHeaderValue(
    req: Request,
    headerName: string
  ): string | undefined {
    const value = req.headers[headerName];
    if (!value) return undefined;
    return Array.isArray(value) ? value[0] : value;
  }

  @Post()
  async handleWebhook(
    @Headers('webhook-signature') webhookSignature: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const signature =
      webhookSignature || this.getHeaderValue(req, 'webhook-signature');

    if (!signature) {
      return res.status(400).send('Missing signature');
    }

    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      this.logger.error('POLAR_WEBHOOK_SECRET is not configured');
      return res.status(500).send('Webhook secret not configured');
    }

    let payload: any;
    try {
      const rawBody = (req as any).rawBody;
      const body =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      payload = validateEvent(
        rawBody ? rawBody.toString('utf8') : body,
        {
          'webhook-id': this.getHeaderValue(req, 'webhook-id') as string,
          'webhook-timestamp': this.getHeaderValue(
            req,
            'webhook-timestamp'
          ) as string,
          'webhook-signature': signature,
        },
        webhookSecret
      );
    } catch (error) {
      this.logger.error('Webhook signature validation failed', error);
      return res.status(400).send(`Webhook Error: ${(error as any).message}`);
    }

    // ─── Idempotency check ──────────────────────────────────────
    const eventId = this.getHeaderValue(req, 'webhook-id');
    if (eventId) {
      const isDuplicate = await this.processedWebhookRepo.isDuplicate(
        'polar',
        eventId
      );
      if (isDuplicate) {
        this.logger.log(`Duplicate Polar webhook ignored: ${eventId}`);
        return res.status(200).send('Already processed');
      }
    }

    // ─── Event handling ─────────────────────────────────────────
    try {
      const eventType = payload.type;
      this.logger.log(`Processing Polar webhook: ${eventType}`);

      switch (eventType) {
        case 'subscription.created':
          await this.handleSubscriptionCreated(payload.data);
          break;

        case 'subscription.updated':
          await this.handleSubscriptionUpdated(payload.data);
          break;

        case 'subscription.canceled':
        case 'subscription.revoked':
          await this.handleSubscriptionCanceled(payload.data);
          break;

        case 'order.created':
          // Initial payment / order confirmation
          this.logger.log(`Order created: ${payload.data?.id}`);
          break;

        default:
          this.logger.log(`Unhandled Polar event type: ${eventType}`);
      }

      // Mark as processed after successful handling
      if (eventId) {
        await this.processedWebhookRepo.markProcessed(
          'polar',
          eventId,
          payload.type
        );
      }

      return res.status(200).send();
    } catch (error) {
      this.logger.error(
        `Error processing Polar webhook ${payload?.type}`,
        error
      );
      // Return 200 anyway to prevent Polar from retrying non-retryable errors
      // For truly transient errors you might want 500, but for data issues 200 is safer
      return res.status(200).send();
    }
  }

  // ─── Subscription Created ───────────────────────────────────────
  private async handleSubscriptionCreated(data: any) {
    const organizationId = data.metadata?.organizationId;
    if (!organizationId) {
      this.logger.error(
        'subscription.created: No organizationId in metadata',
        data
      );
      return;
    }

    const productId = data.product?.id || data.product_id;
    const mapping = this.billingMapping.getTierFromProductId(productId);

    if (!mapping) {
      this.logger.error(
        `subscription.created: Unknown product ID ${productId}`
      );
      return;
    }

    const { tier, period } = mapping;
    const totalChannels = pricing[tier]?.channel || 5;

    // Persist polarCustomerId on the organization
    const customerId = data.customer?.id || data.customer_id;
    if (customerId) {
      await this.organizationService.updateOrganization(organizationId, {
        polarCustomerId: customerId,
      });
    }

    // Create/update the subscription record
    await this.subscriptionService.createOrUpdateSubscription(
      false, // not trailing
      data.id, // Polar subscription ID as identifier
      customerId || organizationId, // customerId for lookup
      totalChannels,
      tier,
      period,
      null, // no cancel date
      undefined,
      organizationId,
      data.id
    );

    this.logger.log(
      `Subscription created: org=${organizationId}, tier=${tier}, period=${period}`
    );
  }

  // ─── Subscription Updated ───────────────────────────────────────
  private async handleSubscriptionUpdated(data: any) {
    const organizationId = data.metadata?.organizationId;
    if (!organizationId) {
      // Try reverse lookup from existing subscription
      this.logger.warn(
        'subscription.updated: No organizationId in metadata, skipping'
      );
      return;
    }

    const productId = data.product?.id || data.product_id;
    const mapping = this.billingMapping.getTierFromProductId(productId);

    if (!mapping) {
      this.logger.error(
        `subscription.updated: Unknown product ID ${productId}`
      );
      return;
    }

    const { tier, period } = mapping;
    const totalChannels = pricing[tier]?.channel || 5;
    const customerId = data.customer?.id || data.customer_id;

    const cancelAt = data.cancel_at_period_end
      ? new Date(data.current_period_end).getTime() / 1000
      : null;

    await this.subscriptionService.createOrUpdateSubscription(
      data.status !== 'active',
      data.id,
      customerId || organizationId,
      totalChannels,
      tier,
      period,
      cancelAt,
      undefined,
      organizationId,
      data.id
    );

    this.logger.log(
      `Subscription updated: org=${organizationId}, tier=${tier}, cancelAt=${cancelAt}`
    );
  }

  // ─── Subscription Canceled ──────────────────────────────────────
  private async handleSubscriptionCanceled(data: any) {
    const customerId = data.customer?.id || data.customer_id;
    const organizationId = data.metadata?.organizationId;

    if (customerId) {
      await this.subscriptionService.deleteSubscription(customerId);
      this.logger.log(
        `Subscription canceled: customer=${customerId}, org=${organizationId}`
      );
    } else if (organizationId) {
      // Fallback: downgrade by org ID
      await this.subscriptionService.modifySubscriptionByOrg(
        organizationId,
        0,
        'FREE'
      );
      this.logger.log(
        `Subscription canceled (by org): org=${organizationId}`
      );
    }
  }
}
