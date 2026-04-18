import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { LeadMessageRepository } from '@gitroom/nestjs-libraries/database/prisma/leads/lead-message.repository';
import { LeadRepository } from '@gitroom/nestjs-libraries/database/prisma/leads/lead.repository';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { MessageDirection, MessageStatus } from '@prisma/client';
import { SocialProvider } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';

@Injectable()
export class LeadMessagingService {
  private readonly logger = new Logger(LeadMessagingService.name);

  constructor(
    private readonly leadRepo: LeadRepository,
    private readonly messageRepo: LeadMessageRepository,
    private readonly integrationManager: IntegrationManager,
    private readonly integrationService: IntegrationService
  ) {}

  /**
   * Send an outbound message from a lead's identity channel.
   * Queue -> call provider -> update status.
   */
  async sendMessage(params: {
    organizationId: string;
    leadId: string;
    leadIdentityId: string;
    content: string;
    attachmentsJson?: string;
  }) {
    const { organizationId, leadId, leadIdentityId, content, attachmentsJson } =
      params;

    // Verify lead belongs to org
    const lead = await this.leadRepo.findById(organizationId, leadId);
    if (!lead) {
      throw new BadRequestException('Lead not found');
    }

    // Find the identity to get channel + integrationId
    const identity = lead.identities.find((i) => i.id === leadIdentityId);
    if (!identity) {
      throw new BadRequestException('Identity not found on this lead');
    }

    if (!identity.integrationId) {
      throw new BadRequestException(
        'No integration linked to this identity. Connect the channel first.'
      );
    }

    // 1. Persist as QUEUED
    const message = await this.messageRepo.createMessage({
      organizationId,
      leadId,
      leadIdentityId,
      direction: MessageDirection.OUTBOUND,
      content,
      attachmentsJson,
      status: MessageStatus.QUEUED,
    });

    // 2. Attempt send via provider
    try {
      const integration = await this.integrationService.getIntegrationById(
        organizationId,
        identity.integrationId
      );

      if (!integration) {
        await this.messageRepo.updateMessageStatus(
          message.id,
          MessageStatus.FAILED,
          { errorReason: 'Integration not found or disconnected' }
        );
        throw new BadRequestException('Integration not found or disconnected');
      }

      // Get the provider adapter
      const provider = this.integrationManager.getSocialIntegration(
        integration.providerIdentifier
      ) as SocialProvider | undefined;

      if (!provider) {
        await this.messageRepo.updateMessageStatus(
          message.id,
          MessageStatus.FAILED,
          { errorReason: `No provider for ${integration.providerIdentifier}` }
        );
        throw new BadRequestException(
          `Provider ${integration.providerIdentifier} not supported for messaging`
        );
      }

      if (!provider?.sendDirectMessage) {
        await this.messageRepo.updateMessageStatus(
          message.id,
          MessageStatus.FAILED,
          {
            errorReason: `Provider ${integration.providerIdentifier} does not support direct messaging`,
          }
        );
        throw new BadRequestException(
          `Provider ${integration.providerIdentifier} does not support direct messaging`
        );
      }

      const sendResult = await provider.sendDirectMessage(
        integration,
        identity.externalId,
        content,
        attachmentsJson
      );

      await this.messageRepo.updateMessageStatus(
        message.id,
        MessageStatus.SENT,
        {
          sentAt: new Date(),
          ...(sendResult?.providerMessageId
            ? { providerMessageId: sendResult.providerMessageId }
            : {}),
        } as any
      );

      this.logger.log(
        `Outbound message sent: lead=${leadId}, channel=${identity.channel}, msgId=${message.id}`
      );

      return {
        ...message,
        status: MessageStatus.SENT,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send message: lead=${leadId}, error=${(error as Error).message}`
      );

      if (message.status === MessageStatus.QUEUED) {
        await this.messageRepo.updateMessageStatus(
          message.id,
          MessageStatus.FAILED,
          { errorReason: (error as Error).message }
        );
      }

      throw error;
    }
  }

  /**
   * Update delivery status from provider webhook callbacks
   */
  async handleDeliveryUpdate(params: {
    providerMessageId: string;
    status: 'delivered' | 'read' | 'failed';
    errorReason?: string;
  }) {
    const message = await this.messageRepo.findByProviderMessageId(
      params.providerMessageId
    );

    if (!message) {
      this.logger.warn(
        `Delivery update for unknown message: ${params.providerMessageId}`
      );
      return;
    }

    const statusMap: Record<string, MessageStatus> = {
      delivered: MessageStatus.DELIVERED,
      read: MessageStatus.READ,
      failed: MessageStatus.FAILED,
    };

    await this.messageRepo.updateMessageStatus(
      message.id,
      statusMap[params.status],
      {
        deliveredAt:
          params.status === 'delivered' ? new Date() : undefined,
        readAt: params.status === 'read' ? new Date() : undefined,
        errorReason: params.errorReason,
      }
    );
  }
}
