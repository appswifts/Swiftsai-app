import { Controller, Get, Patch, Param, Query, UseGuards, HttpException, Post, Body, Put, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { User, SubscriptionTier, Period } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

@ApiTags('Admin')
@Controller('/admin')
@UseGuards(PoliciesGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly organizationRepository: OrganizationRepository
  ) { }

  // ─── Private Helpers ─────────────────────────────────────────

  private async logAction(adminId: string, action: string, targetId?: string, details?: any) {
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetId: targetId || null,
        details: details || null,
      },
    });
  }

  // ─── Dashboard Stats ─────────────────────────────────────────

  @Get('/stats')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getStats(@GetUserFromRequest() user: User) {
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

    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, s: any) => {
      const priceMap: Record<string, number> = {
        'STANDARD': 29,
        'TEAM': 39,
        'PRO': 49,
        'ULTIMATE': 99,
        'FREE': 0
      };
      return sum + (priceMap[s.subscriptionTier] || 0);
    }, 0);

    return {
      users: {
        total: totalUsers,
        newLast30Days: newUsersLast30Days,
        newLast7Days: newUsersLast7Days,
      },
      organizations: {
        total: totalOrganizations,
        newLast30Days: newOrgsLast30Days,
      },
      subscriptions: {
        total: subscriptions.length,
        active: activeSubscriptions.length,
        mrr: monthlyRecurringRevenue,
      },
      integrations: {
        total: totalIntegrations,
      },
      posts: {
        total: totalPosts,
      },
    };
  }

  // ─── Platform Settings ────────────────────────────────────────

  @Get('/settings')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getSettings() {
    const record = await this.prisma.platformSettings.findUnique({
      where: { id: 'singleton' },
    });
    return record?.settings || {
      allowNewSignups: true,
      trialDays: 14,
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      maxChannelsFree: 3,
    };
  }

  @Post('/settings')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async updateSettings(
    @GetUserFromRequest() user: User,
    @Body() body: Record<string, any>
  ) {
    const result = await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', settings: body },
      update: { settings: body },
    });
    await this.logAction(user.id, 'settings.update', undefined, body);
    return result.settings;
  }

  // ─── Plan & Feature Management ────────────────────────────────

  @Get('/plans')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getPlans() {
    // Try to load from DB first, fall back to hardcoded
    const record = await this.prisma.platformSettings.findUnique({
      where: { id: 'singleton' },
    });
    const settings = (record?.settings as any) || {};
    const customPlans = settings.customPlans || null;

    return {
      plans: customPlans || pricing,
      isCustom: !!customPlans,
    };
  }

  @Put('/plans/:tier')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async updatePlan(
    @GetUserFromRequest() user: User,
    @Param('tier') tier: string,
    @Body() body: {
      month_price?: number;
      year_price?: number;
      channel?: number;
      posts_per_month?: number;
      team_members?: boolean;
      community_features?: boolean;
      featured_by_appswifts?: boolean;
      ai?: boolean;
      import_from_channels?: boolean;
      image_generator?: boolean;
      image_generation_count?: number;
      generate_videos?: number;
      public_api?: boolean;
      webhooks?: number;
      autoPost?: boolean;
      inbox?: boolean;
      campaigns?: boolean;
      leads?: boolean;
    }
  ) {
    const validTiers = ['FREE', 'STANDARD', 'TEAM', 'PRO', 'ULTIMATE'];
    if (!validTiers.includes(tier.toUpperCase())) {
      throw new HttpException('Invalid tier', 400);
    }

    const record = await this.prisma.platformSettings.findUnique({
      where: { id: 'singleton' },
    });
    const settings = (record?.settings as any) || {};
    const customPlans = settings.customPlans || { ...pricing };

    // Merge updates into the tier
    customPlans[tier.toUpperCase()] = {
      ...customPlans[tier.toUpperCase()],
      ...body,
      current: tier.toUpperCase(),
    };

    await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', settings: { ...settings, customPlans } },
      update: { settings: { ...settings, customPlans } },
    });

    await this.logAction(user.id, 'plan.update', tier.toUpperCase(), body);

    return customPlans[tier.toUpperCase()];
  }

  // ─── Audit Log ────────────────────────────────────────────────

  @Get('/audit-log')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getAuditLog(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('action') action?: string
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (action) {
      where.action = { contains: action };
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return { logs, total, page: pageNum, limit: limitNum };
  }

  // ─── User Management ──────────────────────────────────────────

  @Get('/users')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

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
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          organizations: {
            include: {
              organization: {
                include: {
                  subscription: true,
                  Integration: {
                    where: { deletedAt: null },
                    take: 5,
                  },
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
        organizations: user.organizations.map((userOrg: any) => ({
          id: userOrg.organization.id,
          name: userOrg.organization.name,
          subscriptionTier: userOrg.organization.subscription?.subscriptionTier || 'FREE',
          integrationCount: userOrg.organization.Integration?.length || 0,
        })),
      })),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('/users/:id')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getUserById(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                subscription: true,
                Integration: {
                  where: { deletedAt: null },
                },
                post: {
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    return user;
  }

  @Patch('/users/:id/suspend')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async suspendUser(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string
  ) {
    await this.prisma.user.update({
      where: { id },
      data: { activated: false },
    });
    await this.logAction(admin.id, 'user.suspend', id);
    return { success: true };
  }

  @Patch('/users/:id/activate')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async activateUser(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string
  ) {
    await this.prisma.user.update({
      where: { id },
      data: { activated: true },
    });
    await this.logAction(admin.id, 'user.activate', id);
    return { success: true };
  }

  @Patch('/users/:id/toggle-admin')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async toggleSuperAdmin(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string
  ) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new HttpException('User not found', 404);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isSuperAdmin: !target.isSuperAdmin },
    });
    await this.logAction(admin.id, 'user.toggle-admin', id, {
      isSuperAdmin: updated.isSuperAdmin,
    });
    return { success: true, isSuperAdmin: updated.isSuperAdmin };
  }

  // ─── Recent Signups ───────────────────────────────────────────

  @Get('/recent-signups')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getRecentSignups(@Query('limit') limit: string = '10') {
    const limitNum = parseInt(limit) || 10;

    const users = await this.prisma.user.findMany({
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        organizations: {
          include: {
            organization: true,
          },
          take: 1,
        },
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

  // ─── Organization Management ──────────────────────────────────

  @Get('/organizations')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getOrganizations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        {
          users: {
            some: {
              user: {
                email: { contains: search, mode: 'insensitive' }
              }
            }
          }
        }
      ];
    }

    const [organizations, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: true,
          Integration: {
            where: { deletedAt: null },
          },
          users: {
            where: { disabled: false },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                }
              }
            }
          },
          _count: {
            select: {
              post: {
                where: { deletedAt: null }
              }
            }
          }
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
        subscription: org.subscription ? {
          subscriptionTier: org.subscription.subscriptionTier,
          period: org.subscription.period,
          totalChannels: org.subscription.totalChannels,
          isLifetime: org.subscription.isLifetime,
          cancelAt: org.subscription.cancelAt,
        } : null,
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
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('/organizations/:id')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getOrganizationById(@Param('id') id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        subscription: true,
        Integration: {
          where: { deletedAt: null },
          include: {
            customer: true,
          }
        },
        users: {
          where: { disabled: false },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              }
            }
          }
        },
        media: {
          where: { deletedAt: null },
          take: 20,
          orderBy: { createdAt: 'desc' }
        },
        post: {
          where: { deletedAt: null },
          take: 20,
          orderBy: { publishDate: 'desc' },
          include: {
            integration: {
              select: {
                name: true,
                providerIdentifier: true,
              }
            }
          }
        }
      },
    });

    if (!organization) {
      throw new HttpException('Organization not found', 404);
    }

    return organization;
  }

  // ─── Subscription Management ──────────────────────────────────

  @Post('/organizations/:id/subscription')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async updateOrganizationSubscription(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string,
    @Body() body: {
      subscriptionTier: SubscriptionTier;
      period: Period;
      totalChannels: number;
      isLifetime?: boolean;
    }
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: { subscription: true }
    });

    if (!organization) {
      throw new HttpException('Organization not found', 404);
    }

    let result;
    if (organization.subscription) {
      result = await this.prisma.subscription.update({
        where: { organizationId: id },
        data: {
          subscriptionTier: body.subscriptionTier,
          period: body.period,
          totalChannels: body.totalChannels,
          isLifetime: body.isLifetime || false,
          deletedAt: null,
          cancelAt: null,
        }
      });
    } else {
      result = await this.prisma.subscription.create({
        data: {
          organizationId: id,
          subscriptionTier: body.subscriptionTier,
          period: body.period,
          totalChannels: body.totalChannels,
          isLifetime: body.isLifetime || false,
          identifier: `admin_${Date.now()}`,
        }
      });
    }

    await this.logAction(admin.id, 'subscription.update', id, body);
    return result;
  }

  @Post('/organizations/:id/trial')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async setOrganizationTrial(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string,
    @Body() body: { isTrailing: boolean; allowTrial: boolean }
  ) {
    const result = await this.prisma.organization.update({
      where: { id },
      data: {
        isTrailing: body.isTrailing,
        allowTrial: body.allowTrial,
      }
    });
    await this.logAction(admin.id, 'organization.trial', id, body);
    return result;
  }

  @Get('/subscriptions/overview')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getSubscriptionsOverview() {
    const now = new Date();
    const subscriptions = await this.prisma.subscription.findMany({
      where: { deletedAt: null },
      include: {
        organization: true,
      }
    });

    const tiers = ['FREE', 'STANDARD', 'TEAM', 'PRO', 'ULTIMATE'] as const;
    const counts: Record<string, { count: number; mrr: number }> = {};

    tiers.forEach(tier => {
      counts[tier] = { count: 0, mrr: 0 };
    });

    const activeSubscriptions = subscriptions.filter(
      (s: any) => !s.deletedAt && (!s.cancelAt || new Date(s.cancelAt) > now)
    );

    activeSubscriptions.forEach(sub => {
      counts[sub.subscriptionTier].count++;
      const priceMap: Record<string, number> = {
        'STANDARD': 29,
        'TEAM': 39,
        'PRO': 49,
        'ULTIMATE': 99,
        'FREE': 0
      };
      counts[sub.subscriptionTier].mrr += priceMap[sub.subscriptionTier] || 0;
    });

    const freeOrgs = await this.prisma.organization.count({
      where: {
        subscription: null
      }
    });
    counts['FREE'].count = freeOrgs;

    return {
      tiers: Object.entries(counts).map(([tier, data]) => ({
        tier,
        count: data.count,
        mrr: data.mrr,
        percentage: (activeSubscriptions.length + freeOrgs) > 0 ? (data.count / (activeSubscriptions.length + freeOrgs)) * 100 : 0
      })),
      totalSubscriptions: activeSubscriptions.length,
      totalOrganizations: activeSubscriptions.length + freeOrgs,
      totalMRR: Object.values(counts).reduce((sum, data) => sum + data.mrr, 0)
    };
  }

  @Post('/subscriptions/manual')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createManualSubscription(
    @GetUserFromRequest() admin: User,
    @Body() body: {
      organizationId: string;
      subscriptionTier: SubscriptionTier;
      period: Period;
      totalChannels: number;
      isLifetime?: boolean;
    }
  ) {
    const result = await this.subscriptionService.addSubscription(
      body.organizationId,
      'admin',
      body.subscriptionTier
    );
    await this.logAction(admin.id, 'subscription.create', body.organizationId, body);
    return result;
  }

  @Patch('/subscriptions/:id/cancel')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async cancelSubscription(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: id }
    });

    if (!subscription) {
      throw new HttpException('Subscription not found', 404);
    }

    const result = await this.prisma.subscription.update({
      where: { organizationId: id },
      data: {
        cancelAt: new Date(),
        deletedAt: new Date(),
      }
    });
    await this.logAction(admin.id, 'subscription.cancel', id);
    return result;
  }
}