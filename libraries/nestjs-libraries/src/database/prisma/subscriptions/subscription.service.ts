import { Injectable } from '@nestjs/common';
import { SubscriptionRepository } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { PlanService } from '@gitroom/nestjs-libraries/database/prisma/plans/plan.service';
import { Organization } from '@prisma/client';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly _subscriptionRepository: SubscriptionRepository,
    private readonly _integrationService: IntegrationService,
    private readonly _organizationService: OrganizationService,
    private readonly _planService: PlanService
  ) {}

  getSubscriptionByOrganizationId(organizationId: string) {
    return this._subscriptionRepository.getSubscriptionByOrganizationId(
      organizationId
    );
  }

  useCredit<T>(
    organization: Organization,
    type = 'ai_images',
    func: () => Promise<T>
  ): Promise<T> {
    return this._subscriptionRepository.useCredit(organization, type, func);
  }

  getCode(code: string) {
    return this._subscriptionRepository.getCode(code);
  }

  async deleteSubscription(customerId: string) {
    const freePlan = await this._planService.getPlanByName('FREE');
    await this.modifySubscription(
      customerId,
      freePlan?.maxChannels ?? 0,
      'FREE'
    );
    return this._subscriptionRepository.deleteSubscriptionByCustomerId(
      customerId
    );
  }

  updateCustomerId(organizationId: string, customerId: string) {
    return this._subscriptionRepository.updateCustomerId(
      organizationId,
      customerId
    );
  }

  async checkSubscription(organizationId: string, subscriptionId: string) {
    return await this._subscriptionRepository.checkSubscription(
      organizationId,
      subscriptionId
    );
  }

  async modifySubscriptionByOrg(
    organizationId: string,
    totalChannels: number,
    billing: 'FREE' | 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE'
  ) {
    if (!organizationId) {
      return false;
    }

    const getCurrentSubscription =
      (await this._subscriptionRepository.getSubscriptionByOrgId(
        organizationId
      ))!;

    const fromPlan = getCurrentSubscription?.subscriptionTier
      ? await this._planService.getPlanByName(getCurrentSubscription.subscriptionTier)
      : null;
    const toPlan = await this._planService.getPlanByName(billing);
    const fromTeamMembers = fromPlan?.teamMembers ?? false;
    const toTeamMembers = toPlan?.teamMembers ?? false;

    const currentTotalChannels = (
      await this._integrationService.getIntegrationsList(organizationId)
    ).filter((f) => !f.disabled);

    if (currentTotalChannels.length > totalChannels) {
      await this._integrationService.disableIntegrations(
        organizationId,
        currentTotalChannels.length - totalChannels
      );
    }

    if (fromTeamMembers && !toTeamMembers) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        organizationId,
        true
      );
    }

    if (!fromTeamMembers && toTeamMembers) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        organizationId,
        false
      );
    }

    if (billing === 'FREE') {
      await this._integrationService.changeActiveCron(organizationId);
    }

    return true;
  }

  async modifySubscription(
    customerId: string,
    totalChannels: number,
    billing: 'FREE' | 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE'
  ) {
    if (!customerId) {
      return false;
    }

    const getOrgByCustomerId =
      await this._subscriptionRepository.getOrganizationByCustomerId(
        customerId
      );

    const getCurrentSubscription =
      (await this._subscriptionRepository.getSubscriptionByCustomerId(
        customerId
      ))!;

    if (
      !getOrgByCustomerId ||
      (getCurrentSubscription && getCurrentSubscription?.isLifetime)
    ) {
      return false;
    }

    const fromPlan = getCurrentSubscription?.subscriptionTier
      ? await this._planService.getPlanByName(getCurrentSubscription.subscriptionTier)
      : null;
    const toPlan = await this._planService.getPlanByName(billing);
    const fromTeamMembers = fromPlan?.teamMembers ?? false;
    const toTeamMembers = toPlan?.teamMembers ?? false;

    const currentTotalChannels = (
      await this._integrationService.getIntegrationsList(
        getOrgByCustomerId?.id!
      )
    ).filter((f) => !f.disabled);

    if (currentTotalChannels.length > totalChannels) {
      await this._integrationService.disableIntegrations(
        getOrgByCustomerId?.id!,
        currentTotalChannels.length - totalChannels
      );
    }

    if (fromTeamMembers && !toTeamMembers) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        getOrgByCustomerId?.id!,
        true
      );
    }

    if (!fromTeamMembers && toTeamMembers) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        getOrgByCustomerId?.id!,
        false
      );
    }

    if (billing === 'FREE') {
      await this._integrationService.changeActiveCron(getOrgByCustomerId?.id!);
    }

    return true;
  }

  async createOrUpdateSubscription(
    isTrailing: boolean,
    identifier: string,
    customerId: string,
    totalChannels: number,
    billing: 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE',
    period: 'MONTHLY' | 'YEARLY',
    cancelAt: number | null,
    code?: string,
    org?: string,
    polarSubscriptionId?: string
  ) {
    if (!code) {
      try {
        const load = await this.modifySubscription(
          customerId,
          totalChannels,
          billing
        );
        if (!load) {
          return {};
        }
      } catch (e) {
        return {};
      }
    }

    const plan = await this._planService.getPlanByName(billing);

    return this._subscriptionRepository.createOrUpdateSubscription(
      isTrailing,
      identifier,
      customerId,
      totalChannels,
      billing,
      period,
      cancelAt,
      code,
      org ? { id: org } : undefined,
      polarSubscriptionId,
      plan?.id,
      plan?.maxOrganizations,
      plan?.maxPlatforms
    );
  }

  getSubscriptionByIdentifier(identifier: string) {
    return this._subscriptionRepository.getSubscriptionByIdentifier(identifier);
  }

  async getSubscription(organizationId: string) {
    return this._subscriptionRepository.getSubscription(organizationId);
  }

  async checkCredits(organization: Organization, checkType = 'ai_images') {
    // @ts-ignore
    const type: string = organization?.subscription?.subscriptionTier || 'FREE';

    if (type === 'FREE') {
      return { credits: 0 };
    }

    // @ts-ignore
    let date = dayjs(organization.subscription.createdAt);
    while (date.isBefore(dayjs())) {
      date = date.add(1, 'month');
    }

    const checkFromMonth = date.subtract(1, 'month');
    const plan = await this._planService.getPlanByName(type);
    const imageGenerationCount =
      checkType === 'ai_images'
        ? (plan?.imageGenerationCount ?? 0)
        : (plan?.generateVideos ?? 0);

    const totalUse = await this._subscriptionRepository.getCreditsFrom(
      organization.id,
      checkFromMonth,
      checkType
    );

    return {
      credits: imageGenerationCount - totalUse,
    };
  }

  async lifeTime(orgId: string, identifier: string, subscription: any) {
    const plan = await this._planService.getPlanByName(subscription);
    return this.createOrUpdateSubscription(
      false,
      identifier,
      identifier,
      plan?.maxChannels ?? 0,
      subscription,
      'YEARLY',
      null,
      identifier,
      orgId
    );
  }

  async addSubscription(orgId: string, userId: string, subscription: any) {
    const plan = await this._planService.getPlanByName(subscription);
    await this._subscriptionRepository.setCustomerId(orgId, userId);
    return this.createOrUpdateSubscription(
      false,
      makeId(5),
      userId,
      plan?.maxChannels ?? 0,
      subscription,
      'MONTHLY',
      null,
      undefined,
      orgId
    );
  }

  async setCancelAt(organizationId: string, cancelAt: Date | null) {
    return this._subscriptionRepository.setCancelAt(organizationId, cancelAt);
  }
}
