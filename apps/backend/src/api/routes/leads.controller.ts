import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { LeadService } from '@gitroom/nestjs-libraries/database/prisma/leads/lead.service';
import { LeadMessagingService } from '@gitroom/nestjs-libraries/database/prisma/leads/lead-messaging.service';
import { LeadStatus } from '@prisma/client';

@ApiTags('Leads')
@Controller('/leads')
@UseGuards(PoliciesGuard)
export class LeadsController {
  constructor(
    private readonly leadService: LeadService,
    private readonly leadMessagingService: LeadMessagingService
  ) {}

  // ─── List leads with filters ──────────────────────────────────
  @Get()
  @CheckPolicies([AuthorizationActions.Read, Sections.LEADS])
  async getLeads(
    @GetOrgFromRequest() org: Organization,
    @Query('status') status?: LeadStatus,
    @Query('channel') channel?: string,
    @Query('owner') ownerUserId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.leadService.getLeads(org.id, {
      status,
      channel,
      ownerUserId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ─── Get lead details ─────────────────────────────────────────
  @Get('/:id')
  @CheckPolicies([AuthorizationActions.Read, Sections.LEADS])
  async getLeadById(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    const lead = await this.leadService.getLeadById(org.id, id);
    const unreadCount = await this.leadService.getUnreadCount(id);
    return { ...lead, unreadCount };
  }

  // ─── Get lead message timeline ────────────────────────────────
  @Get('/:id/messages')
  @CheckPolicies([AuthorizationActions.Read, Sections.LEADS])
  async getLeadMessages(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    // Verify lead belongs to org first
    await this.leadService.getLeadById(org.id, id);
    // Mark messages as read when viewing
    await this.leadService.markMessagesAsRead(id);
    return this.leadService.getLeadMessages(id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ─── Update lead (status, owner, info) ────────────────────────
  @Patch('/:id')
  @CheckPolicies([AuthorizationActions.Update, Sections.LEADS])
  async updateLead(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      status?: LeadStatus;
      ownerUserId?: string | null;
    }
  ) {
    return this.leadService.updateLead(org.id, id, body);
  }

  // ─── Send outbound message ────────────────────────────────────
  @Post('/:id/send')
  @CheckPolicies([AuthorizationActions.Create, Sections.LEADS])
  async sendMessage(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body()
    body: {
      leadIdentityId: string;
      content: string;
      attachmentsJson?: string;
    }
  ) {
    return this.leadMessagingService.sendMessage({
      organizationId: org.id,
      leadId: id,
      leadIdentityId: body.leadIdentityId,
      content: body.content,
      attachmentsJson: body.attachmentsJson,
    });
  }

  // ─── Merge duplicate leads ────────────────────────────────────
  @Post('/:id/merge')
  @CheckPolicies([AuthorizationActions.Update, Sections.LEADS])
  async mergeLeads(
    @GetOrgFromRequest() org: Organization,
    @Param('id') primaryId: string,
    @Body() body: { duplicateLeadId: string }
  ) {
    return this.leadService.mergeLeads(org.id, primaryId, body.duplicateLeadId);
  }
}
