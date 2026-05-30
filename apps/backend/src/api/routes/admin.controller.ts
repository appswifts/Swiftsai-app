import { Controller, Get, Patch, Param, Query, UseGuards, HttpException, Post, Body, Put, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { User, SubscriptionTier, Period } from '@prisma/client';
import { AdminService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin.service';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';

@ApiTags('Admin')
@Controller('/admin')
@UseGuards(PoliciesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  // ─── Dashboard Stats ─────────────────────────────────────────

  @Get('/stats')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('/growth')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getGrowthData() {
    return this.adminService.getGrowthData();
  }

  // ─── Platform Settings ────────────────────────────────────────

  @Get('/settings')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getSettings() {
    return this.adminService.getPlatformSettings();
  }

  @Post('/settings')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async updateSettings(
    @GetUserFromRequest() user: User,
    @Body() body: Record<string, any>
  ) {
    return this.adminService.updatePlatformSettings(user.id, body);
  }

  // ─── Plan & Feature Management ────────────────────────────────

  @Get('/plans')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getPlans() {
    return this.adminService.getPlans();
  }

  @Put('/plans/:tier')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async updatePlan(
    @GetUserFromRequest() user: User,
    @Param('tier') tier: string,
    @Body() body: Record<string, any>
  ) {
    const result = await this.adminService.updatePlan(user.id, tier, body);
    if (result && (result as any).error) {
      throw new HttpException((result as any).error, 400);
    }
    return result;
  }

  // ─── Audit Log ────────────────────────────────────────────────

  @Get('/audit-log')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getAuditLog(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('action') action?: string
  ) {
    return this.adminService.getAuditLog(
      parseInt(page) || 1,
      Math.min(parseInt(limit) || 50, 100),
      action
    );
  }

  // ─── User Management ──────────────────────────────────────────

  @Get('/users')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string
  ) {
    return this.adminService.getUsers(
      parseInt(page) || 1,
      parseInt(limit) || 20,
      search
    );
  }

  @Get('/users/:id')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getUserById(@Param('id') id: string) {
    const user = await this.adminService.getUserById(id);
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
    return this.adminService.suspendUser(admin.id, id);
  }

  @Patch('/users/:id/activate')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async activateUser(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string
  ) {
    return this.adminService.activateUser(admin.id, id);
  }

  @Patch('/users/:id/toggle-admin')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async toggleSuperAdmin(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string
  ) {
    const result = await this.adminService.toggleSuperAdmin(admin.id, id);
    if (result && (result as any).error) {
      throw new HttpException((result as any).error, 404);
    }
    return result;
  }

  // ─── Recent Signups ───────────────────────────────────────────

  @Get('/recent-signups')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getRecentSignups(@Query('limit') limit: string = '10') {
    return this.adminService.getRecentSignups(parseInt(limit) || 10);
  }

  // ─── Organization Management ──────────────────────────────────

  @Get('/organizations')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getOrganizations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string
  ) {
    return this.adminService.getOrganizations(
      parseInt(page) || 1,
      parseInt(limit) || 20,
      search
    );
  }

  @Get('/organizations/:id')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getOrganizationById(@Param('id') id: string) {
    const org = await this.adminService.getOrganizationById(id);
    if (!org) {
      throw new HttpException('Organization not found', 404);
    }
    return org;
  }

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
    const result = await this.adminService.updateOrganizationSubscription(admin.id, id, body);
    if (result && (result as any).error) {
      throw new HttpException((result as any).error, 404);
    }
    return result;
  }

  @Post('/organizations/:id/trial')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async setOrganizationTrial(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string,
    @Body() body: { isTrailing: boolean; allowTrial: boolean }
  ) {
    return this.adminService.setOrganizationTrial(admin.id, id, body);
  }

  // ─── Subscription Management ──────────────────────────────────

  @Get('/subscriptions/overview')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getSubscriptionsOverview() {
    return this.adminService.getSubscriptionsOverview();
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
    return this.adminService.createManualSubscription(admin.id, body);
  }

  @Post('/subscriptions/bulk-cancel/:tier')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async bulkCancelSubscriptions(
    @GetUserFromRequest() admin: User,
    @Param('tier') tier: string
  ) {
    return this.adminService.bulkCancelSubscriptions(admin.id, tier);
  }

  @Patch('/subscriptions/:id/cancel')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async cancelSubscription(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string
  ) {
    const result = await this.adminService.cancelSubscription(admin.id, id);
    if (result && (result as any).error) {
      throw new HttpException((result as any).error, 404);
    }
    return result;
  }

  // ─── Integration Health Monitor ───────────────────────────────

  @Get('/integrations')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getIntegrations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('provider') provider?: string
  ) {
    return this.adminService.getIntegrations(
      parseInt(page) || 1,
      parseInt(limit) || 20,
      provider
    );
  }

  @Post('/integrations/:id/disable')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async disableIntegration(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string
  ) {
    return this.adminService.disableIntegration(admin.id, id);
  }

  @Post('/integrations/:id/enable')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async enableIntegration(
    @GetUserFromRequest() admin: User,
    @Param('id') id: string
  ) {
    return this.adminService.enableIntegration(admin.id, id);
  }

  // ─── Error Dashboard ──────────────────────────────────────────

  @Get('/errors/stats')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getErrorStats() {
    return this.adminService.getErrorStats();
  }

  @Get('/errors')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getErrors(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.adminService.getErrors(
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
  }
}
