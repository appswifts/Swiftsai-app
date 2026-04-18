import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { CampaignService } from '@gitroom/nestjs-libraries/database/prisma/campaigns/campaign.service';
import { CampaignStatus } from '@prisma/client';

@ApiTags('Campaigns')
@Controller('/campaigns')
@UseGuards(PoliciesGuard)
export class CampaignsController {
  constructor(private readonly campaignService: CampaignService) {}

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
    return this.campaignService.updateCampaign(org.id, id, body);
  }

  @Delete('/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.CAMPAIGNS])
  async deleteCampaign(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.campaignService.deleteCampaign(org.id, id);
  }
}
