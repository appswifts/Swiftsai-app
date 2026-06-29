import { Controller, Get, Param, Query } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { ApiTags } from '@nestjs/swagger';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@ApiTags('Analytics')
@Controller('/analytics')
export class AnalyticsController {
  constructor(
    private _integrationService: IntegrationService,
    private _postsService: PostsService,
    private _prisma: PrismaService
  ) {}

  @Get('/')
  async getDashboardAnalytics(
    @GetOrgFromRequest() org: Organization
  ) {
    const [totalPosts, totalIntegrations] = await Promise.all([
      this._prisma.post.count({
        where: {
          organizationId: org.id,
          deletedAt: null,
        },
      }),
      this._prisma.integration.count({
        where: {
          organizationId: org.id,
          deletedAt: null,
          disabled: false,
        },
      }),
    ]);

    return {
      totalPosts,
      audience: totalIntegrations,
      engagement: 0,
    };
  }

  @Get('/:integration')
  async getIntegration(
    @GetOrgFromRequest() org: Organization,
    @Param('integration') integration: string,
    @Query('date') date: string
  ) {
    return this._integrationService.checkAnalytics(org, integration, date);
  }

  @Get('/post/:postId')
  async getPostAnalytics(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string,
    @Query('date') date: string
  ) {
    return this._postsService.checkPostAnalytics(org.id, postId, +date);
  }
}
