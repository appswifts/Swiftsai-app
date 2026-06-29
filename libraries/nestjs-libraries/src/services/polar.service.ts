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
    const server = (process.env.POLAR_SERVER || 'production') as 'production' | 'sandbox';
    
    this.polar = new Polar({
      accessToken,
      server,
    });
  }

  get isEnabled(): boolean {
    return !!process.env.POLAR_ACCESS_TOKEN;
  }

  async createCheckout(organizationId: string, productId: string, email?: string, trialDays?: number) {
    try {
      const params: any = {
        products: [productId],
        customerEmail: email,
        metadata: {
          organizationId,
        },
        successUrl: `${process.env.FRONTEND_URL}/billing/success?checkout_id={CHECKOUT_ID}`,
        returnUrl: `${process.env.FRONTEND_URL}/billing`
      };

      if (trialDays && trialDays > 0) {
        params.subscriptionTrialPeriodDays = trialDays;
      }

      const checkout = await this.polar.checkouts.create(params);

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

  async cancelSubscription(organizationId: string, feedback?: string) {
    const subscription = await this._subscriptionService.getSubscription(organizationId);
    if (!subscription?.polarSubscriptionId) {
      throw new Error('No Polar subscription found');
    }

    const body: any = {
      cancel_at_period_end: true,
    };

    if (feedback) {
      body.customer_cancellation_reason = 'other';
      body.customer_cancellation_comment = feedback;
    }

    const response = await fetch(
      `https://api.polar.sh/v1/subscriptions/${subscription.polarSubscriptionId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error('Error cancelling polar subscription', error);
      throw new Error('Failed to cancel subscription at Polar');
    }

    const data = await response.json();
    const currentPeriodEnd = new Date(data.current_period_end).getTime();
    return { cancel_at: currentPeriodEnd };
  }

  async reactivateSubscription(organizationId: string) {
    const subscription = await this._subscriptionService.getSubscription(organizationId);
    if (!subscription?.polarSubscriptionId) {
      throw new Error('No Polar subscription found');
    }

    const response = await fetch(
      `https://api.polar.sh/v1/subscriptions/${subscription.polarSubscriptionId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancel_at_period_end: false }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error('Error reactivating polar subscription', error);
      throw new Error('Failed to reactivate subscription at Polar');
    }

    return { cancel_at: null };
  }
}
