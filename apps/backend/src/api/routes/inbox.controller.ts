import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { InboxService } from '@gitroom/nestjs-libraries/database/prisma/inbox/inbox.service';

@ApiTags('Inbox')
@Controller('/inbox')
@UseGuards(PoliciesGuard)
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  @CheckPolicies([AuthorizationActions.Read, Sections.INBOX])
  async getInboxIntegrations(@GetOrgFromRequest() org: Organization) {
    return this.inboxService.getConversations(org.id);
  }

  @Get('/:integrationId/messages')
  @CheckPolicies([AuthorizationActions.Read, Sections.INBOX])
  async getMessages(
    @GetOrgFromRequest() org: Organization,
    @Param('integrationId') integrationId: string
  ) {
    return this.inboxService.getMessages(org.id, integrationId);
  }

  @Post('/:integrationId/messages')
  @CheckPolicies([AuthorizationActions.Create, Sections.INBOX])
  async sendMessage(
    @GetOrgFromRequest() org: Organization,
    @Param('integrationId') integrationId: string,
    @Body()
    body: { leadIdentityId: string; content: string; attachmentsJson?: string }
  ) {
    return this.inboxService.handleOutgoingMessage(
      org.id,
      integrationId,
      body.leadIdentityId,
      body.content,
      body.attachmentsJson
    );
  }
}
