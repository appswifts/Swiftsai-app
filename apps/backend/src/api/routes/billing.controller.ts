import { Body, Controller, Get, HttpException, Param, Post } from '@nestjs/common';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization, User } from '@prisma/client';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { Nowpayments } from '@gitroom/nestjs-libraries/crypto/nowpayments';
import { PolarService } from '@gitroom/nestjs-libraries/services/polar.service';
import { BillingMappingService } from '@gitroom/nestjs-libraries/services/billing.mapping.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@ApiTags('Billing')
@Controller('/billing')
export class BillingController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _polarService: PolarService,
    private _billingMapping: BillingMappingService,
    private _notificationService: NotificationService,
    private _nowpayments: Nowpayments,
    private _prisma: PrismaService
  ) {}

  private async getTrialDays(): Promise<number | undefined> {
    const settings = await this._prisma.platformSettings.findUnique({
      where: { id: 'singleton' },
    });
    const trialDays = (settings?.settings as any)?.trialDays;
    return trialDays && trialDays > 0 ? trialDays : undefined;
  }

  @Get('/check/:id')
  async checkId(
    @GetOrgFromRequest() org: Organization,
    @Param('id') body: string
  ) {
    return {
      status: await this._subscriptionService.checkSubscription(org.id, body),
    };
  }

  @Get('/is-trial-finished')
  async isTrialFinished(@GetOrgFromRequest() org: Organization) {
    return { finished: !org.isTrailing };
  }

  @Post('/embedded')
  async embedded(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: BillingSubscribeDto
  ) {
    const productId = this._billingMapping.getProductId(body.billing, body.period);
    const trialDays = await this.getTrialDays();
    const checkout = await this._polarService.createCheckout(org.id, productId, user.email, trialDays);
    return { polarUrl: checkout.url };
  }

  @Post('/subscribe')
  async subscribe(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: BillingSubscribeDto
  ) {
    const productId = this._billingMapping.getProductId(body.billing, body.period);
    const trialDays = await this.getTrialDays();
    const checkout = await this._polarService.createCheckout(org.id, productId, user.email, trialDays);
    return { url: checkout.url };
  }

  @Get('/portal')
  async modifyPayment(@GetOrgFromRequest() org: Organization) {
    const portal = await this._polarService.getCustomerPortal(org.id);
    if (portal.url) return { portal: portal.url };
    return { portal: null };
  }

  @Get('/')
  getCurrentBilling(@GetOrgFromRequest() org: Organization) {
    return this._subscriptionService.getSubscriptionByOrganizationId(org.id);
  }

  @Post('/cancel')
  async cancel(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: { feedback: string }
  ) {
    const subscription = await this._subscriptionService.getSubscription(org.id);

    if (subscription?.cancelAt) {
      if (subscription?.polarSubscriptionId) {
        await this._polarService.reactivateSubscription(org.id);
      }
      await this._subscriptionService.setCancelAt(org.id, null);
      return { success: true, cancel_at: null };
    }

    const freePlan = await this._prisma.plan.findFirst({ where: { name: 'FREE' } });

    await this._subscriptionService.modifySubscriptionByOrg(
      org.id,
      freePlan?.maxChannels ?? 0,
      'FREE'
    );

    let cancelAt: number | null = null;

    if (subscription?.polarSubscriptionId) {
      const result = await this._polarService.cancelSubscription(org.id, body.feedback);
      cancelAt = result.cancel_at;
      await this._subscriptionService.setCancelAt(org.id, new Date(cancelAt));
    } else {
      cancelAt = Date.now();
      await this._subscriptionService.setCancelAt(org.id, new Date(cancelAt));
    }

    await this._notificationService.sendEmail(
      process.env.EMAIL_FROM_ADDRESS,
      'Subscription Cancelled',
      `Organization ${org.name} has cancelled their subscription because: ${body.feedback}`,
      user.email
    );

    return { success: true, cancel_at: cancelAt };
  }

  @Post('/prorate')
  async prorate(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { period: string; billing: string }
  ) {
    const currentSub = await this._subscriptionService.getSubscription(org.id);
    if (!currentSub) {
      return { price: 0 };
    }

    const currentPlan = await this._prisma.plan.findFirst({
      where: { name: currentSub.subscriptionTier },
    });
    const newPlan = await this._prisma.plan.findFirst({
      where: { name: body.billing },
    });
    if (!currentPlan || !newPlan) {
      return { price: 0 };
    }

    const isYearly = body.period === 'YEARLY';
    const currentPrice = isYearly ? (currentPlan as any).yearPrice || 0 : (currentPlan as any).monthPrice || 0;
    const newPrice = isYearly ? (newPlan as any).yearPrice || 0 : (newPlan as any).monthPrice || 0;

    if (newPrice <= currentPrice) {
      return { price: 0 };
    }

    const daysInPeriod = isYearly ? 365 : 30;
    const createdAt = currentSub.createdAt || new Date();
    const periodEnd = new Date(createdAt.getTime() + daysInPeriod * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    const priceDiff = newPrice - currentPrice;
    const prorated = Math.round((priceDiff * daysRemaining) / daysInPeriod);

    return { price: prorated };
  }

  @Get('/check-discount')
  async checkDiscount() {
    return { offerCoupon: false };
  }

  @Post('/cancel-subscription')
  async cancelSubscription(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    await this._subscriptionService.deleteSubscription(org.id);
    return { success: true };
  }

  @Post('/add-subscription')
  async addSubscription(
    @Body() body: { subscription: string },
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    if (!user.isSuperAdmin) {
      throw new Error('Unauthorized');
    }

    await this._subscriptionService.addSubscription(
      org.id,
      user.id,
      body.subscription
    );
  }

  @Get('/crypto')
  async crypto(@GetOrgFromRequest() org: Organization) {
    return this._nowpayments.createPaymentPage(org.id);
  }
}
