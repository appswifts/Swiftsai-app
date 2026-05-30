import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';

@ApiTags('Comments')
@Controller('/comments')
@UseGuards(PoliciesGuard)
export class CommentsController {
  constructor(
    private readonly _integrationService: IntegrationService,
    private readonly _integrationManager: IntegrationManager
  ) {}

  @Get('/integrations')
  @CheckPolicies([AuthorizationActions.Read, Sections.INBOX])
  async getCommentIntegrations(@GetOrgFromRequest() org: Organization) {
    const integrations = await this._integrationService.getIntegrationsList(org.id);
    return integrations.filter(
      (i) => i.providerIdentifier === 'facebook' || i.providerIdentifier === 'instagram'
    );
  }

  @Get('/:integrationId/posts')
  @CheckPolicies([AuthorizationActions.Read, Sections.INBOX])
  async getPosts(
    @GetOrgFromRequest() org: Organization,
    @Param('integrationId') integrationId: string
  ) {
    const integration = await this._integrationService.getIntegrationById(org.id, integrationId);
    if (!integration) throw new Error('Integration not found');

    const provider = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
    if (!provider) throw new Error('Provider not found');

    if (integration.providerIdentifier === 'facebook') {
      return (provider as any).getPagePosts(integration.token, {}, integration.internalId);
    }
    if (integration.providerIdentifier === 'instagram') {
      return (provider as any).getInstagramMedia(integration.token, {}, integration.internalId);
    }
    return [];
  }

  @Get('/:integrationId/:postId')
  @CheckPolicies([AuthorizationActions.Read, Sections.INBOX])
  async getComments(
    @GetOrgFromRequest() org: Organization,
    @Param('integrationId') integrationId: string,
    @Param('postId') postId: string
  ) {
    const integration = await this._integrationService.getIntegrationById(org.id, integrationId);
    if (!integration) throw new Error('Integration not found');

    const provider = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
    if (!provider) throw new Error('Provider not found');

    if (integration.providerIdentifier === 'facebook') {
      return (provider as any).getPostComments(integration.token, { postId });
    }
    if (integration.providerIdentifier === 'instagram') {
      return (provider as any).getMediaComments(integration.token, { mediaId: postId });
    }
    return [];
  }

  @Post('/:integrationId/:postId/reply')
  @CheckPolicies([AuthorizationActions.Create, Sections.INBOX])
  async replyToPost(
    @GetOrgFromRequest() org: Organization,
    @Param('integrationId') integrationId: string,
    @Param('postId') postId: string,
    @Body() body: { message: string }
  ) {
    const integration = await this._integrationService.getIntegrationById(org.id, integrationId);
    if (!integration) throw new Error('Integration not found');

    const provider = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
    if (!provider) throw new Error('Provider not found');

    if (integration.providerIdentifier === 'facebook') {
      return (provider as any).replyToPost(integration.token, { postId, message: body.message });
    }
    if (integration.providerIdentifier === 'instagram') {
      return (provider as any).replyToInstagramPost(integration.token, { postId, message: body.message });
    }
    throw new Error('Unsupported provider');
  }

  @Delete('/:integrationId/:commentId')
  @CheckPolicies([AuthorizationActions.Delete, Sections.INBOX])
  async deleteComment(
    @GetOrgFromRequest() org: Organization,
    @Param('integrationId') integrationId: string,
    @Param('commentId') commentId: string
  ) {
    const integration = await this._integrationService.getIntegrationById(org.id, integrationId);
    if (!integration) throw new Error('Integration not found');

    const provider = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
    if (!provider) throw new Error('Provider not found');

    if (integration.providerIdentifier === 'facebook') {
      return (provider as any).deleteComment(integration.token, { commentId });
    }
    if (integration.providerIdentifier === 'instagram') {
      return (provider as any).deleteInstagramComment(integration.token, { commentId });
    }
    throw new Error('Unsupported provider');
  }
}
