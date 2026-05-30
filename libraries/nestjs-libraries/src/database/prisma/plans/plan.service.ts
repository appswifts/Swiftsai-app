import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PlanRepository } from '@gitroom/nestjs-libraries/database/prisma/plans/plan.repository';
import { CreatePlanDto } from '@gitroom/nestjs-libraries/dtos/plans/create.plan.dto';
import { UpdatePlanDto } from '@gitroom/nestjs-libraries/dtos/plans/update.plan.dto';
import { pricing, PricingInnerInterface } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class PlanService implements OnApplicationBootstrap {
  constructor(
    private readonly _planRepository: PlanRepository,
    private readonly _prisma: PrismaService
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaultPlans();
  }

  async getPlans() {
    const dbPlans = await this._planRepository.getPlans();
    const plans: Record<string, any> = {};
    for (const plan of dbPlans) {
      plans[plan.name] = this.planToPricing(plan);
    }
    return {
      plans: Object.keys(plans).length > 0 ? plans : pricing,
      isCustom: Object.keys(plans).length > 0,
    };
  }

  getActivePlans() {
    return this._planRepository.getActivePlans();
  }

  getPlanById(id: string) {
    return this._planRepository.getPlanById(id);
  }

  getDefaultPlan() {
    return this._planRepository.getDefaultPlan();
  }

  createPlan(data: CreatePlanDto) {
    return this._planRepository.createPlan(data);
  }

  updatePlan(id: string, data: UpdatePlanDto) {
    return this._planRepository.updatePlan(id, data);
  }

  deletePlan(id: string) {
    return this._planRepository.deletePlan(id);
  }

  setDefaultPlan(id: string) {
    return this._planRepository.setDefaultPlan(id);
  }

  getPlanByName(name: string) {
    return this._planRepository.getPlanByName(name);
  }

  async getEffectivePlanForUser(userId: string) {
    const subscriptions = await this._prisma.subscription.findMany({
      where: {
        organization: {
          users: { some: { userId } },
        },
        deletedAt: null,
        planId: { not: null },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (subscriptions.length === 0) {
      return (await this.getDefaultPlan()) || null;
    }

    const plans = subscriptions
      .filter((s) => s.plan)
      .map((s) => s.plan!)
      .sort((a, b) => (b.maxOrganizations || 0) - (a.maxOrganizations || 0));

    return plans[0] || (await this.getDefaultPlan()) || null;
  }

  getPlanLimits(planId?: string | null) {
    if (!planId) {
      return pricing.FREE;
    }
    return this._planRepository.getPlanById(planId).then((plan) => {
      if (!plan) return pricing.FREE;
      return this.planToPricing(plan);
    });
  }

  async seedDefaultPlans() {
    const existing = await this._planRepository.getPlans();
    if (existing.length > 0) return;

    const defaultPlans = Object.entries(pricing);
    for (const [name, config] of defaultPlans) {
      await this._planRepository.createPlan({
        name,
        description: `${name} plan`,
        monthPrice: config.month_price,
        yearPrice: config.year_price,
        maxChannels: config.channel || 0,
        maxOrganizations: config.max_organizations,
        maxPlatforms: config.max_platforms,
        postsPerMonth: config.posts_per_month,
        teamMembers: config.team_members,
        communityFeatures: config.community_features,
        featuredByAppswifts: config.featured_by_appswifts,
        ai: config.ai,
        importFromChannels: config.import_from_channels,
        imageGenerator: config.image_generator || false,
        imageGenerationCount: config.image_generation_count,
        generateVideos: config.generate_videos,
        publicApi: config.public_api,
        webhooks: config.webhooks,
        autoPost: config.autoPost,
        inbox: config.inbox,
        campaigns: config.campaigns,
        leads: config.leads,
        isDefault: name === 'STANDARD',
        isActive: true,
      });
    }
  }

  private planToPricing(plan: any): PricingInnerInterface {
    return {
      id: plan.id,
      current: plan.name,
      month_price: plan.monthPrice,
      year_price: plan.yearPrice,
      channel: plan.maxChannels,
      posts_per_month: plan.postsPerMonth,
      team_members: plan.teamMembers,
      max_organizations: plan.maxOrganizations,
      max_platforms: plan.maxPlatforms,
      community_features: plan.communityFeatures,
      featured_by_appswifts: plan.featuredByAppswifts,
      ai: plan.ai,
      import_from_channels: plan.importFromChannels,
      image_generator: plan.imageGenerator,
      image_generation_count: plan.imageGenerationCount,
      generate_videos: plan.generateVideos,
      public_api: plan.publicApi,
      webhooks: plan.webhooks,
      autoPost: plan.autoPost,
      inbox: plan.inbox,
      campaigns: plan.campaigns,
      leads: plan.leads,
      isDefault: plan.isDefault,
      isActive: plan.isActive,
    };
  }
}
