import { proxyActivities, sleep } from '@temporalio/workflow';
import type { CampaignActivity, BroadcastResult } from '../activities/campaign.activity';
import {
  CampaignStatus,
  LeadMessage,
} from '@prisma/client';

const {
  getBroadcastTargets,
  sendSingleBroadcastMessage,
  updateCampaignMetrics,
  getCampaignIntegration,
} = proxyActivities<CampaignActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 1,
    initialInterval: '1 minute',
  },
});

export interface BroadcastWorkflowArgs {
  campaignId: string;
  organizationId: string;
  channel: string;
  content: string;
  stageFilter?: string[];
  creative?: {
    headline?: string;
    primaryText?: string;
    destinationUrl?: string;
  };
}

export async function broadcastWorkflow(args: BroadcastWorkflowArgs): Promise<BroadcastResult[]> {
  const { campaignId, organizationId, channel, content, stageFilter, creative } = args;

  // Get integration for this channel
  const integration = await getCampaignIntegration(organizationId, channel);
  if (!integration) {
    throw new Error(`No integration found for channel: ${channel}`);
  }

  // Get all targets (leads matching the criteria)
  const targets = await getBroadcastTargets(organizationId, campaignId, channel, stageFilter);

  if (targets.length === 0) {
    await updateCampaignMetrics(organizationId, campaignId, { totalTargets: 0, sent: 0 });
    return [];
  }

  // Track results
  const results: BroadcastResult[] = [];
  let sent = 0;
  let failed = 0;

  // Rate limiting: send in batches with delays
  const BATCH_SIZE = 20; // WhatsApp rate limit
  const BATCH_DELAY_MS = 5000; // 5 seconds between batches

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];

    try {
      // Build personalized content (could expand this with merge fields)
      const personalizedContent = content; // TODO: support {{firstName}} etc.

      const result = await sendSingleBroadcastMessage(
        organizationId,
        target.leadId,
        target.leadIdentityId,
        personalizedContent,
        campaignId
      );

      results.push({
        leadId: target.leadId,
        success: result.success,
        providerMessageId: result.providerMessageId,
        error: result.error,
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    } catch (err) {
      results.push({
        leadId: target.leadId,
        success: false,
        error: (err as Error).message,
      });
      failed++;
    }

    // Update progress every batch
    if ((i + 1) % BATCH_SIZE === 0 || i === targets.length - 1) {
      await updateCampaignMetrics(campaignId, {
        sent,
        failed,
        totalTargets: targets.length,
      });

      // Rate limit delay between batches
      if (i < targets.length - 1) {
        await sleep(BATCH_DELAY_MS);
      }
    }
  }

  // Final metrics update
  await updateCampaignMetrics(organizationId, campaignId, {
    sent,
    failed,
    totalTargets: targets.length,
  });

  return results;
}

// Signal to pause the broadcast
export const pauseBroadcast = () => {
  // Signal name for pausing
};
