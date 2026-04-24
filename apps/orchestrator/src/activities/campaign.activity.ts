import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { LeadService } from '@gitroom/nestjs-libraries/database/prisma/leads/lead.service';
import { LeadMessagingService } from '@gitroom/nestjs-libraries/database/prisma/leads/lead-messaging.service';
import { CampaignService } from '@gitroom/nestjs-libraries/database/prisma/campaigns/campaign.service';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

export interface BroadcastTarget {
  leadId: string;
  leadIdentityId: string;
  externalId: string;
  channel: string;
  displayName?: string;
}

export interface BroadcastResult {
  leadId: string;
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

@Injectable()
@Activity()
export class CampaignActivity {
  constructor(
    private _leadService: LeadService,
    private _leadMessagingService: LeadMessagingService,
    private _campaignService: CampaignService,
    private _integrationService: IntegrationService,
    private _integrationManager: IntegrationManager
  ) {}

  @ActivityMethod()
  async getBroadcastTargets(
    organizationId: string,
    campaignId: string,
    channel: string,
    stageFilter?: string[]
  ): Promise<BroadcastTarget[]> {
    // Fetch all leads matching channel and optional stage filter
    const stageStatuses = stageFilter && stageFilter.length > 0
      ? stageFilter as any[]
      : undefined;

    const { leads } = await this._leadService.getLeads(organizationId, {
      channel,
      statuses: stageStatuses,
      limit: 10000,
    });

    const targets: BroadcastTarget[] = [];
    for (const lead of leads) {
      for (const identity of lead.identities || []) {
        if (identity.channel === channel) {
          targets.push({
            leadId: lead.id,
            leadIdentityId: identity.id,
            externalId: identity.externalId,
            channel: identity.channel,
            displayName: identity.displayName || lead.name,
          });
        }
      }
    }
    return targets;
  }

  @ActivityMethod()
  async sendSingleBroadcastMessage(
    organizationId: string,
    leadId: string,
    leadIdentityId: string,
    content: string,
    campaignId: string,
    providerMessageId?: string
  ): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
    try {
      const result = await this._leadMessagingService.sendMessage({
        organizationId,
        leadId,
        leadIdentityId,
        content,
      });

      return {
        success: true,
        providerMessageId: result?.providerMessageId || providerMessageId || makeId(10),
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  }

  @ActivityMethod()
  async updateCampaignMetrics(
    campaignId: string,
    metrics: {
      sent?: number;
      delivered?: number;
      failed?: number;
      totalTargets?: number;
    }
  ) {
    const existing = await this._campaignService.getCampaignByIdForMetrics(campaignId);
    if (!existing) return;

    const existingMetrics = existing.metrics ? JSON.parse(existing.metrics) : {};
    const updated = {
      ...existingMetrics,
      ...metrics,
      lastUpdated: new Date().toISOString(),
    };

    await this._campaignService.updateCampaignMetrics(campaignId, JSON.stringify(updated));
  }

  @ActivityMethod()
  async getCampaignIntegration(
    organizationId: string,
    channel: string
  ) {
    // Get the first integration for this channel
    const integrations = await this._integrationService.getIntegrationsList(organizationId);
    return integrations.find(i => i.providerIdentifier === channel) || null;
  }
}
