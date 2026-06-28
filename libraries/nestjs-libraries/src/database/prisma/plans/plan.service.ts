import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PlanRepository } from '@gitroom/nestjs-libraries/database/prisma/plans/plan.repository';
import { CreatePlanDto } from '@gitroom/nestjs-libraries/dtos/plans/create.plan.dto';
import { UpdatePlanDto } from '@gitroom/nestjs-libraries/dtos/plans/update.plan.dto';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

interface PlanLimits {
  id?: string;
  current: string;
  month_price: number;
  year_price: number;
  channel?: number;
  posts_per_month: number;
  team_members: boolean;
  max_organizations: number;
  max_platforms: number;
  community_features: boolean;
  featured_by_appswifts: boolean;
  ai: boolean;
  import_from_channels: boolean;
  image_generator?: boolean;
  image_generation_count: number;
  generate_videos: number;
  public_api: boolean;
  webhooks: number;
  autoPost: boolean;
  inbox: boolean;
  campaigns: boolean;
  leads: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}

const FREE_DEFAULTS: PlanLimits = {
  current: 'FREE',
  month_price: 0,
  year_price: 0,
  channel: 0,
  image_generation_count: 0,
  posts_per_month: 0,
  team_members: false,
  max_organizations: 1,
  max_platforms: 0,
  community_features: false,
  featured_by_appswifts: false,
  ai: false,
  import_from_channels: false,
  image_generator: false,
  public_api: false,
  webhooks: 0,
  autoPost: false,
  generate_videos: 0,
  inbox: false,
  campaigns: false,
  leads: false,
  isDefault: true,
  isActive: true,
};

interface SeedPlan {
  name: string;
  description: string;
  monthPrice: number;
  yearPrice: number;
  maxChannels: number;
  maxOrganizations: number;
  maxPlatforms: number;
  postsPerMonth: number;
  teamMembers: boolean;
  communityFeatures: boolean;
  featuredByAppswifts: boolean;
  ai: boolean;
  importFromChannels: boolean;
  imageGenerator: boolean;
  imageGenerationCount: number;
  generateVideos: number;
  publicApi: boolean;
  webhooks: number;
  autoPost: boolean;
  inbox: boolean;
  campaigns: boolean;
  leads: boolean;
  isDefault: boolean;
  isActive: boolean;
}

const SEED_PLANS: SeedPlan[] = [
  {
    name: 'FREE',
    description: 'FREE plan',
    monthPrice: 0,
    yearPrice: 0,
    maxChannels: 0,
    maxOrganizations: 1,
    maxPlatforms: 0,
    postsPerMonth: 0,
    teamMembers: false,
    communityFeatures: false,
    featuredByAppswifts: false,
    ai: false,
    importFromChannels: false,
    imageGenerator: false,
    imageGenerationCount: 0,
    generateVideos: 0,
    publicApi: false,
    webhooks: 0,
    autoPost: false,
    inbox: false,
    campaigns: false,
    leads: false,
    isDefault: false,
    isActive: true,
  },
  {
    name: 'STANDARD',
    description: 'STANDARD plan',
    monthPrice: 29,
    yearPrice: 278,
    maxChannels: 5,
    maxOrganizations: 1,
    maxPlatforms: 5,
    postsPerMonth: 400,
    teamMembers: false,
    communityFeatures: false,
    featuredByAppswifts: false,
    ai: true,
    importFromChannels: true,
    imageGenerator: false,
    imageGenerationCount: 20,
    generateVideos: 3,
    publicApi: true,
    webhooks: 2,
    autoPost: false,
    inbox: true,
    campaigns: false,
    leads: true,
    isDefault: true,
    isActive: true,
  },
  {
    name: 'TEAM',
    description: 'TEAM plan',
    monthPrice: 39,
    yearPrice: 374,
    maxChannels: 10,
    maxOrganizations: 3,
    maxPlatforms: 10,
    postsPerMonth: 1000000,
    teamMembers: true,
    communityFeatures: true,
    featuredByAppswifts: true,
    ai: true,
    importFromChannels: true,
    imageGenerator: true,
    imageGenerationCount: 100,
    generateVideos: 10,
    publicApi: true,
    webhooks: 10,
    autoPost: true,
    inbox: true,
    campaigns: true,
    leads: true,
    isDefault: false,
    isActive: true,
  },
  {
    name: 'PRO',
    description: 'PRO plan',
    monthPrice: 49,
    yearPrice: 470,
    maxChannels: 30,
    maxOrganizations: 5,
    maxPlatforms: 30,
    postsPerMonth: 1000000,
    teamMembers: true,
    communityFeatures: true,
    featuredByAppswifts: true,
    ai: true,
    importFromChannels: true,
    imageGenerator: true,
    imageGenerationCount: 300,
    generateVideos: 30,
    publicApi: true,
    webhooks: 30,
    autoPost: true,
    inbox: true,
    campaigns: true,
    leads: true,
    isDefault: false,
    isActive: true,
  },
  {
    name: 'ULTIMATE',
    description: 'ULTIMATE plan',
    monthPrice: 99,
    yearPrice: 950,
    maxChannels: 100,
    maxOrganizations: 10,
    maxPlatforms: 100,
    postsPerMonth: 1000000,
    teamMembers: true,
    communityFeatures: true,
    featuredByAppswifts: true,
    ai: true,
    importFromChannels: true,
    imageGenerator: true,
    imageGenerationCount: 500,
    generateVideos: 60,
    publicApi: true,
    webhooks: 10000,
    autoPost: true,
    inbox: true,
    campaigns: true,
    leads: true,
    isDefault: false,
    isActive: true,
  },
];

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
    const planMap: Record<string, any> = {};
    for (const plan of dbPlans) {
      planMap[plan.name] = this.planToLimits(plan);
    }
    return {
      plans: Object.keys(planMap).length > 0 ? planMap : {},
      isCustom: Object.keys(planMap).length > 0,
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

  getPlanByName(name: string) {
    return this._planRepository.getPlanByName(name);
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

  getPlanLimits(planId?: string | null): Promise<PlanLimits> {
    if (!planId) {
      return Promise.resolve({ ...FREE_DEFAULTS });
    }
    return this._planRepository.getPlanById(planId).then((plan) => {
      if (!plan) return { ...FREE_DEFAULTS };
      return this.planToLimits(plan);
    });
  }

  async seedDefaultPlans() {
    const existing = await this._planRepository.getPlans();
    if (existing.length > 0) return;

    for (const plan of SEED_PLANS) {
      await this._planRepository.createPlan(plan);
    }
  }

  private planToLimits(plan: any): PlanLimits {
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
