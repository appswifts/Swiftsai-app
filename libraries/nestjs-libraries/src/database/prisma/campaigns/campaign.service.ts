import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { CampaignRepository } from '@gitroom/nestjs-libraries/database/prisma/campaigns/campaign.repository';

const ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['REVIEW', 'ACTIVE', 'ERROR'],
  REVIEW: ['ACTIVE', 'DRAFT', 'ERROR'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'ERROR'],
  PAUSED: ['ACTIVE', 'COMPLETED', 'ERROR'],
  COMPLETED: [],
  ERROR: ['DRAFT', 'REVIEW', 'ACTIVE'],
};

@Injectable()
export class CampaignService {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  getCampaigns(organizationId: string) {
    return this.campaignRepository.getByOrg(organizationId);
  }

  async createCampaign(
    organizationId: string,
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
    const created = await this.campaignRepository.create(organizationId, body);
    await this.campaignRepository.createAudit(created.id, {
      action: 'campaign_created',
      newValue: JSON.stringify({ status: created.status, ...body }),
    });
    return created;
  }

  async updateCampaign(
    organizationId: string,
    id: string,
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
    const existing = await this.campaignRepository.getById(organizationId, id);
    if (!existing) {
      throw new NotFoundException('Campaign not found');
    }

    if (body.status && body.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(body.status)) {
        throw new BadRequestException(
          `Invalid campaign status transition from ${existing.status} to ${body.status}`
        );
      }
    }

    const updated = await this.campaignRepository.update(organizationId, id, body);

    await this.campaignRepository.createAudit(id, {
      action: body.status ? 'status_change' : 'campaign_updated',
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(body),
    });

    return updated;
  }

  async deleteCampaign(organizationId: string, id: string) {
    const existing = await this.campaignRepository.getById(organizationId, id);
    if (!existing) {
      throw new NotFoundException('Campaign not found');
    }

    await this.campaignRepository.softDelete(organizationId, id);
    await this.campaignRepository.createAudit(id, {
      action: 'campaign_deleted',
      oldValue: JSON.stringify(existing),
    });

    return { success: true };
  }

  async launchCampaign(organizationId: string, id: string) {
    return this.updateCampaign(organizationId, id, { status: 'ACTIVE' as CampaignStatus });
  }

  async pauseCampaign(organizationId: string, id: string) {
    return this.updateCampaign(organizationId, id, { status: 'PAUSED' as CampaignStatus });
  }

  async completeCampaign(organizationId: string, id: string) {
    return this.updateCampaign(organizationId, id, { status: 'COMPLETED' as CampaignStatus });
  }

  async getCampaignByIdForMetrics(organizationId: string, campaignId: string) {
    return this.campaignRepository.getByIdSimple(organizationId, campaignId);
  }

  async updateCampaignMetrics(organizationId: string, campaignId: string, metrics: string) {
    return this.campaignRepository.updateMetrics(organizationId, campaignId, metrics);
  }
}
