import { Injectable, Logger } from '@nestjs/common';
import { Polar } from '@polar-sh/sdk';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';

@Injectable()
export class PolarService {
  private polar: Polar;
  private readonly logger = new Logger(PolarService.name);

  constructor(private _subscriptionService: SubscriptionService) {
    const accessToken = process.env.POLAR_ACCESS_TOKEN || '';
    // Optional: detect if it's production or sandbox based on your environment
    const server = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
    
    this.polar = new Polar({
      accessToken,
      server,
    });
  }

  get isEnabled(): boolean {
    return !!process.env.POLAR_ACCESS_TOKEN;
  }

  async createCheckout(organizationId: string, productId: string, email?: string) {
    try {
      const checkout = await this.polar.checkouts.create({
        products: [productId],
        customerEmail: email,
        metadata: {
          organizationId,
        },
        successUrl: `${process.env.FRONTEND_URL}/billing/success?checkout_id={CHECKOUT_ID}`,
        returnUrl: `${process.env.FRONTEND_URL}/billing`
      });

      return { url: checkout.url };
    } catch (error) {
      this.logger.error('Error creating polar checkout', error);
      throw error;
    }
  }

  async getCustomerPortal(organizationId: string) {
    try {
      const subscription = await this._subscriptionService.getSubscription(organizationId);
      if (!subscription || !(subscription as any).organization?.polarCustomerId) {
        return { url: null };
      }

      const portal = await this.polar.customerSessions.create({
        customerId: (subscription as any).organization.polarCustomerId,
      });

      return { url: portal.customerPortalUrl };
    } catch (error) {
      this.logger.error('Error creating polar customer portal', error);
      throw error;
    }
  }
}
