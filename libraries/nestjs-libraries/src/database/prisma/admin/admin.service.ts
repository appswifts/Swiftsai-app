import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { PlanService } from '@gitroom/nestjs-libraries/database/prisma/plans/plan.service';
import { Organization, User, SubscriptionTier, Period } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly planService: PlanService,
  ) {}

  async logAction(adminId: string, action: string, targetId?: string, details?: any) {
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetId: targetId || null,
        details: details || null,
      },
    });
  }

  async getStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalOrganizations,
      totalIntegrations,
      totalPosts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.integration.count({ where: { deletedAt: null } }),
      this.prisma.post.count(),
    ]);

    const subscriptions = await this.prisma.subscription.findMany({
      include: { organization: true },
    });

    const activeSubscriptions = subscriptions.filter(
      (s: any) => !s.deletedAt && (!s.cancelAt || new Date(s.cancelAt) > now)
    );

    const newUsersLast30Days = await this.prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const newUsersLast7Days = await this.prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const newOrgsLast30Days = await this.prisma.organization.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const plans = await this.planService.getPlans();
    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, s: any) => {
      const plan = plans.plans[s.subscriptionTier as string];
      return sum + (plan?.month_price || 0);
    }, 0);

    return {
      users: { total: totalUsers, newLast30Days: newUsersLast30Days, newLast7Days: newUsersLast7Days },
      organizations: { total: totalOrganizations, newLast30Days: newOrgsLast30Days },
      subscriptions: {
        total: subscriptions.length,
        active: activeSubscriptions.length,
        mrr: monthlyRecurringRevenue,
      },
      integrations: { total: totalIntegrations },
      posts: { total: totalPosts },
    };
  }

  async getGrowthData() {
    const now = new Date();
    const points: { date: string; users: number; organizations: number; revenue: number }[] = [];
    const plans = await this.planService.getPlans();

    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const [users, organizations, subscriptions] = await Promise.all([
        this.prisma.user.count({ where: { createdAt: { lt: end } } }),
        this.prisma.organization.count({ where: { createdAt: { lt: end } } }),
        this.prisma.subscription.findMany({
          where: { createdAt: { lt: end }, deletedAt: null },
        }),
      ]);

      const revenue = subscriptions.reduce((sum, s) => {
        const plan = plans.plans[s.subscriptionTier as string];
        return sum + (plan?.month_price || 0);
      }, 0);

      points.push({
        date: start.toISOString().slice(0, 7),
        users,
        organizations,
        revenue,
      });
    }

    return points;
  }

  async getPlatformSettings() {
    const record = await this.prisma.platformSettings.findUnique({
      where: { id: 'singleton' },
    });
    const defaultPlan = await this.prisma.plan.findFirst({
      where: { isDefault: true, deletedAt: null },
    });
    return record?.settings || {
      allowNewSignups: true,
      trialDays: 14,
      trialTier: 'FREE',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      maxChannelsFree: 3,
      defaultPlanId: defaultPlan?.id || null,
    };
  }

  async updatePlatformSettings(adminId: string, body: Record<string, any>) {
    const result = await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', settings: body },
      update: { settings: body },
    });
    await this.logAction(adminId, 'settings.update', undefined, body);
    return result.settings;
  }

  async getPlans() {
    return this.planService.getPlans();
  }

  async getPlansList() {
    const dbPlans = await this.planService.getActivePlans();
    return dbPlans.map((p: any) => ({
      id: p.id,
      name: p.name,
      monthPrice: p.monthPrice,
      yearPrice: p.yearPrice,
      maxChannels: p.maxChannels,
      isDefault: p.isDefault,
      isActive: p.isActive,
    }));
  }

  async updatePlan(adminId: string, tier: string, body: any) {
    const plan = await this.planService.getPlanById(tier);
    if (!plan) {
      const dbPlan = await this.prisma.plan.findFirst({
        where: { name: tier.toUpperCase(), deletedAt: null },
      });
      if (!dbPlan) return { error: 'Invalid tier' };

      const updated = await this.planService.updatePlan(dbPlan.id, body);
      await this.logAction(adminId, 'plan.update', dbPlan.id, body);
      return updated;
    }

    const updated = await this.planService.updatePlan(tier, body);
    await this.logAction(adminId, 'plan.update', tier, body);
    return updated;
  }

  async createPlan(adminId: string, body: any) {
    const plan = await this.planService.createPlan(body);
    await this.logAction(adminId, 'plan.create', plan.id, body);
    return plan;
  }

  async deletePlan(adminId: string, planId: string) {
    await this.planService.deletePlan(planId);
    await this.logAction(adminId, 'plan.delete', planId);
    return { success: true };
  }

  async setDefaultPlan(adminId: string, planId: string) {
    await this.planService.setDefaultPlan(planId);
    await this.logAction(adminId, 'plan.set_default', planId);
    return { success: true };
  }

  async getAuditLog(page: number, limit: number, action?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (action) {
      where.action = { contains: action };
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  async getUsers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizations: {
            include: {
              organization: {
                include: {
                  subscription: true,
                  Integration: { where: { deletedAt: null }, take: 5 },
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        isSuperAdmin: user.isSuperAdmin,
        activated: user.activated,
        lastOnline: user.lastOnline,
        organizations: user.organizations.map((userOrg: any) => {
          const sub = userOrg.organization.subscription;
          return {
            id: userOrg.organization.id,
            name: userOrg.organization.name,
            subscriptionTier: sub?.subscriptionTier || 'FREE',
            totalChannels: sub?.totalChannels || 0,
            maxOrganizations: sub?.maxOrganizations || 1,
            maxPlatforms: sub?.maxPlatforms || 0,
            period: sub?.period || null,
            isLifetime: sub?.isLifetime || false,
            integrationCount: userOrg.organization.Integration?.length || 0,
          };
        }),
      })),
      total,
      page,
      limit,
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                subscription: true,
                Integration: { where: { deletedAt: null } },
                post: { orderBy: { createdAt: 'desc' }, take: 10 },
              },
            },
          },
        },
      },
    });
    return user;
  }

  async suspendUser(adminId: string, userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { activated: false },
    });
    await this.logAction(adminId, 'user.suspend', userId);
    return { success: true };
  }

  async activateUser(adminId: string, userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { activated: true },
    });
    await this.logAction(adminId, 'user.activate', userId);
    return { success: true };
  }

  async toggleSuperAdmin(adminId: string, userId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) return { error: 'User not found' };

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isSuperAdmin: !target.isSuperAdmin },
    });
    await this.logAction(adminId, 'user.toggle-admin', userId, {
      isSuperAdmin: updated.isSuperAdmin,
    });
    return { success: true, isSuperAdmin: updated.isSuperAdmin };
  }

  async getRecentSignups(limit: number) {
    const users = await this.prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        organizations: { include: { organization: true }, take: 1 },
      },
    });

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        organizationName: user.organizations?.[0]?.organization?.name || null,
      })),
    };
  }

  async getOrganizations(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        {
          users: {
            some: {
              user: {
                email: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [organizations, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: true,
          Integration: { where: { deletedAt: null } },
          users: {
            where: { disabled: false },
            include: { user: { select: { id: true, email: true, name: true } } },
          },
          _count: { select: { post: { where: { deletedAt: null } } } },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      organizations: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        description: org.description,
        createdAt: org.createdAt,
        isTrailing: org.isTrailing,
        allowTrial: org.allowTrial,
        subscription: org.subscription
          ? {
              subscriptionTier: org.subscription.subscriptionTier,
              period: org.subscription.period,
              totalChannels: org.subscription.totalChannels,
              isLifetime: org.subscription.isLifetime,
              cancelAt: org.subscription.cancelAt,
            }
          : null,
        integrationCount: org.Integration.length,
        postCount: org._count.post,
        teamMembers: org.users.map((userOrg) => ({
          id: userOrg.user.id,
          email: userOrg.user.email,
          name: userOrg.user.name,
          role: userOrg.role,
        })),
      })),
      total,
      page,
      limit,
    };
  }

  async getOrganizationById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        subscription: true,
        Integration: {
          where: { deletedAt: null },
          include: { customer: true },
        },
        users: {
          where: { disabled: false },
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        media: {
          where: { deletedAt: null },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        post: {
          where: { deletedAt: null },
          take: 20,
          orderBy: { publishDate: 'desc' },
          include: {
            integration: { select: { name: true, providerIdentifier: true } },
          },
        },
      },
    });
    return organization;
  }

  async updateOrganizationSubscription(
    adminId: string,
    orgId: string,
    body: { subscriptionTier: SubscriptionTier; period: Period; totalChannels: number; maxOrganizations?: number; maxPlatforms?: number; isLifetime?: boolean }
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true },
    });

    if (!organization) {
      return { error: 'Organization not found' };
    }

    let result;
    if (organization.subscription) {
      result = await this.prisma.subscription.update({
        where: { organizationId: orgId },
        data: {
          subscriptionTier: body.subscriptionTier,
          period: body.period,
          totalChannels: body.totalChannels,
          maxOrganizations: body.maxOrganizations,
          maxPlatforms: body.maxPlatforms,
          isLifetime: body.isLifetime || false,
          deletedAt: null,
          cancelAt: null,
        },
      });
    } else {
      result = await this.prisma.subscription.create({
        data: {
          organizationId: orgId,
          subscriptionTier: body.subscriptionTier,
          period: body.period,
          totalChannels: body.totalChannels,
          maxOrganizations: body.maxOrganizations,
          maxPlatforms: body.maxPlatforms,
          isLifetime: body.isLifetime || false,
          identifier: `admin_${Date.now()}`,
        },
      });
    }

    await this.logAction(adminId, 'subscription.update', orgId, body);
    return result;
  }

  async setOrganizationTrial(adminId: string, orgId: string, body: { isTrailing: boolean; allowTrial: boolean }) {
    const result = await this.prisma.organization.update({
      where: { id: orgId },
      data: { isTrailing: body.isTrailing, allowTrial: body.allowTrial },
    });
    await this.logAction(adminId, 'organization.trial', orgId, body);
    return result;
  }

  async getSubscriptionsOverview() {
    const now = new Date();
    const subscriptions = await this.prisma.subscription.findMany({
      where: { deletedAt: null },
      include: { organization: true },
    });

    const tiers = ['FREE', 'STANDARD', 'TEAM', 'PRO', 'ULTIMATE'] as const;
    const counts: Record<string, { count: number; mrr: number }> = {};
    tiers.forEach((tier) => {
      counts[tier] = { count: 0, mrr: 0 };
    });

    const activeSubscriptions = subscriptions.filter(
      (s: any) => !s.deletedAt && (!s.cancelAt || new Date(s.cancelAt) > now)
    );

    const plans = await this.planService.getPlans();
    activeSubscriptions.forEach((sub) => {
      counts[sub.subscriptionTier].count++;
      const plan = plans.plans[sub.subscriptionTier as string];
      counts[sub.subscriptionTier].mrr += plan?.month_price || 0;
    });

    const freeOrgs = await this.prisma.organization.count({
      where: { subscription: null },
    });
    counts['FREE'].count += freeOrgs;

    return {
      tiers: Object.entries(counts).map(([tier, data]) => ({
        tier,
        count: data.count,
        mrr: data.mrr,
        percentage:
          activeSubscriptions.length + freeOrgs > 0
            ? (data.count / (activeSubscriptions.length + freeOrgs)) * 100
            : 0,
      })),
      totalSubscriptions: activeSubscriptions.length,
      totalOrganizations: activeSubscriptions.length + freeOrgs,
      totalMRR: Object.values(counts).reduce((sum, data) => sum + data.mrr, 0),
    };
  }

  async createManualSubscription(adminId: string, body: {
    organizationId: string;
    subscriptionTier: SubscriptionTier;
    period: Period;
    totalChannels: number;
    isLifetime?: boolean;
  }) {
    const org = await this.prisma.organization.findUnique({
      where: { id: body.organizationId },
      include: { users: { where: { disabled: false }, take: 1 } },
    });

    const userId = org?.users?.[0]?.userId || adminId;

    const result = await this.subscriptionService.addSubscription(
      body.organizationId,
      userId,
      body.subscriptionTier,
    );
    await this.logAction(adminId, 'subscription.create', body.organizationId, body);
    return result;
  }

  async bulkCancelSubscriptions(adminId: string, tier: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { subscriptionTier: tier as SubscriptionTier, deletedAt: null },
    });

    await this.prisma.subscription.updateMany({
      where: { subscriptionTier: tier as SubscriptionTier, deletedAt: null },
      data: { cancelAt: new Date(), deletedAt: new Date() },
    });

    await this.logAction(adminId, 'subscription.bulk_cancel', undefined, { tier, count: subscriptions.length });
    return { success: true, count: subscriptions.length, tier };
  }

  async cancelSubscription(adminId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: subscriptionId },
    });

    if (!subscription) {
      return { error: 'Subscription not found' };
    }

    const result = await this.prisma.subscription.update({
      where: { organizationId: subscriptionId },
      data: { cancelAt: new Date(), deletedAt: new Date() },
    });
    await this.logAction(adminId, 'subscription.cancel', subscriptionId);
    return result;
  }

  async getIntegrations(page: number, limit: number, provider?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (provider) {
      where.providerIdentifier = provider;
    }

    const [integrations, total] = await this.prisma.$transaction([
      this.prisma.integration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          _count: { select: { posts: true } },
        },
      }),
      this.prisma.integration.count({ where }),
    ]);

    return {
      integrations: integrations.map((int: any) => ({
        id: int.id,
        name: int.name,
        provider: int.providerIdentifier,
        organizationId: int.organizationId,
        organizationName: int.organization?.name,
        createdAt: int.createdAt,
        disabled: int.disabled,
        refreshNeeded: int.refreshNeeded,
        profile: int.profile,
        postCount: int._count.posts,
      })),
      total,
      page,
      limit,
    };
  }

  async disableIntegration(adminId: string, integrationId: string) {
    const integration = await this.prisma.integration.update({
      where: { id: integrationId },
      data: { disabled: true },
    });
    await this.logAction(adminId, 'integration.disable', integrationId);
    return { success: true, id: integration.id };
  }

  async enableIntegration(adminId: string, integrationId: string) {
    const integration = await this.prisma.integration.update({
      where: { id: integrationId },
      data: { disabled: false },
    });
    await this.logAction(adminId, 'integration.enable', integrationId);
    return { success: true, id: integration.id };
  }

  async getErrorStats() {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [last24h, last7d, total] = await Promise.all([
      this.prisma.errors.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
      this.prisma.errors.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.errors.count(),
    ]);

    return { last24h, last7d, total };
  }

  async getErrors(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [errors, total] = await this.prisma.$transaction([
      this.prisma.errors.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { organization: { select: { name: true } } },
      }),
      this.prisma.errors.count(),
    ]);

    return { errors, total, page, limit };
  }
}
