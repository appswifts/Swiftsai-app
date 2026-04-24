import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { CampaignService } from '@gitroom/nestjs-libraries/database/prisma/campaigns/campaign.service';
import { CampaignStatus } from '@prisma/client';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import { organizationId } from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
import { broadcastWorkflow } from '@gitroom/orchestrator/workflows/broadcast.workflow';

@ApiTags('Campaigns')
@Controller('/campaigns')
@UseGuards(PoliciesGuard)
export class CampaignsController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly temporalService: TemporalService
  ) {}

  @Get()
  @CheckPolicies([AuthorizationActions.Read, Sections.CAMPAIGNS])
  async getCampaigns(@GetOrgFromRequest() org: Organization) {
    return this.campaignService.getCampaigns(org.id);
  }

  @Post()
  @CheckPolicies([AuthorizationActions.Create, Sections.CAMPAIGNS])
  async createCampaign(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      name: string;
      platform: string;
      type: string;
      budget?: number;
      config?: string;
      creative?: string;
      targeting?: string;
    }
  ) {
    return this.campaignService.createCampaign(org.id, body);
  }

  @Put('/:id')
  @CheckPolicies([AuthorizationActions.Update, Sections.CAMPAIGNS])
  async updateCampaign(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      platform?: string;
      type?: string;
      status?: CampaignStatus;
      budget?: number;
      config?: string;
      creative?: string;
      targeting?: string;
      metrics?: string;
    }
  ) {
    const updated = await this.campaignService.updateCampaign(org.id, id, body);

    // If campaign was activated, start the broadcast workflow
    if (body.status === 'ACTIVE') {
      await this.startBroadcastWorkflow(org.id, id);
    }

    return updated;
  }

  @Delete('/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.CAMPAIGNS])
  async deleteCampaign(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.campaignService.deleteCampaign(org.id, id);
  }

  private async startBroadcastWorkflow(orgId: string, campaignId: string) {
    const campaign = await this.campaignService.getCampaignByIdForMetrics(campaignId);
    if (!campaign) return;

    const config = campaign.config ? JSON.parse(campaign.config) : {};
    const creative = campaign.creative ? JSON.parse(campaign.creative) : {};
    const targeting = campaign.targeting ? JSON.parse(campaign.targeting) : {};

    // For broadcast-type campaigns, start the broadcast workflow
    if (campaign.type === 'broadcast' || campaign.platform === 'whatsapp' || campaign.platform === 'sms') {
      try {
        await this.temporalService.client
          .getRawClient()
          ?.workflow.start('broadcastWorkflow', {
            workflowId: `campaign_${campaignId}`,
            taskQueue: 'main',
            workflowIdConflictPolicy: 'TERMINATE_EXISTING',
            args: [{
              campaignId,
              organizationId: orgId,
              channel: campaign.platform === 'sms' ? 'sms' : campaign.platform,
              content: creative.primaryText || '',
              stageFilter: targeting.audienceTags || [],
            }],
            typedSearchAttributes: new TypedSearchAttributes([
              {
                key: organizationId,
                value: orgId,
              },
            ]),
          });
      } catch (err) {
        // Log but don't fail - workflow might already be running
        console.error(`Failed to start broadcast workflow for campaign ${campaignId}:`, err);
      }
    }
  }
}
