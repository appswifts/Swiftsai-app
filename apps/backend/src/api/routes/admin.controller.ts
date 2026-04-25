import { Controller, Get, Patch, Param, Query, UseGuards, HttpException, Post, Body, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { User, SubscriptionTier, Period } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';

@ApiTags('Admin')
@Controller('/admin')
@UseGuards(PoliciesGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly organizationRepository: OrganizationRepository
  ) { }

  @Get('/stats')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getStats(@GetUserFromRequest() user: User) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total counts
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

    // Subscriptions
    const subscriptions = await this.prisma.subscription.findMany({
      include: { organization: true },
    });

    const activeSubscriptions = subscriptions.filter(
      (s: any) => !s.deletedAt && (!s.cancelAt || new Date(s.cancelAt) > now)
    );

    // Growth: new users in last 30 days
    const newUsersLast30Days = await this.prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const newUsersLast7Days = await this.prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const newOrgsLast30Days = await this.prisma.organization.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // Revenue (from Stripe if available, otherwise estimate)
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
        organizations: user.organizations.map((userOrg: any) => ({
          id: userOrg.organization.id,
          name: userOrg.organization.name,
          subscriptionStatus: userOrg.organization.subscription?.status || null,
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
      return { error: 'User not found' };
    }

    return user;
  }

  @Patch('/users/:id/suspend')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async suspendUser(@Param('id') id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { activated: false },
    });
    return { success: true };
  }

  @Patch('/users/:id/activate')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async activateUser(@Param('id') id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { activated: true },
    });
    return { success: true };
  }

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

  @Post('/organizations/:id/subscription')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async updateOrganizationSubscription(
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

    // If organization already has a subscription, update it
    if (organization.subscription) {
      return this.prisma.subscription.update({
        where: { organizationId: id },
        data: {
          subscriptionTier: body.subscriptionTier,
          period: body.period,
          totalChannels: body.totalChannels,
          isLifetime: body.isLifetime || false,
        }
      });
    } else {
      // Create a new subscription
      return this.prisma.subscription.create({
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
  }

  @Post('/organizations/:id/trial')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async setOrganizationTrial(
    @Param('id') id: string,
    @Body() body: { isTrailing: boolean; allowTrial: boolean }
  ) {
    return this.prisma.organization.update({
      where: { id },
      data: {
        isTrailing: body.isTrailing,
        allowTrial: body.allowTrial,
      }
    });
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

    // Initialize counts
    tiers.forEach(tier => {
      counts[tier] = { count: 0, mrr: 0 };
    });

    // Count subscriptions by tier
    const activeSubscriptions = subscriptions.filter(
      (s: any) => !s.deletedAt && (!s.cancelAt || new Date(s.cancelAt) > now)
    );

    activeSubscriptions.forEach(sub => {
      counts[sub.subscriptionTier].count++;
      // Simple MRR calculation - you might want to use actual pricing
      const priceMap: Record<string, number> = {
        'STANDARD': 29,
        'TEAM': 39,
        'PRO': 49,
        'ULTIMATE': 99,
        'FREE': 0
      };
      counts[sub.subscriptionTier].mrr += priceMap[sub.subscriptionTier] || 0;
    });

    // Count FREE organizations (no subscription)
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
    @Body() body: {
      organizationId: string;
      subscriptionTier: SubscriptionTier;
      period: Period;
      totalChannels: number;
      isLifetime?: boolean;
    }
  ) {
    // Use existing subscription service to create subscription
    return this.subscriptionService.addSubscription(
      body.organizationId,
      'admin', // admin user ID placeholder
      body.subscriptionTier
    );
  }

  @Patch('/subscriptions/:id/cancel')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async cancelSubscription(@Param('id') id: string) {
    // Cancel subscription by organization ID
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: id }
    });

    if (!subscription) {
      throw new HttpException('Subscription not found', 404);
    }

    return this.prisma.subscription.update({
      where: { organizationId: id },
      data: {
        cancelAt: new Date(),
        deletedAt: new Date(),
      }
    });
  }
}
