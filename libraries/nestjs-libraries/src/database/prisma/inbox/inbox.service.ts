import { Injectable } from '@nestjs/common';
import { LeadRepository } from '@gitroom/nestjs-libraries/database/prisma/leads/lead.repository';
import { LeadMessageRepository } from '@gitroom/nestjs-libraries/database/prisma/leads/lead-message.repository';
import { LeadMessagingService } from '@gitroom/nestjs-libraries/database/prisma/leads/lead-messaging.service';
import { LeadService } from '@gitroom/nestjs-libraries/database/prisma/leads/lead.service';

@Injectable()
export class InboxService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly leadMessageRepository: LeadMessageRepository,
    private readonly leadMessagingService: LeadMessagingService,
    private readonly leadService: LeadService
  ) {}

  async getConversations(organizationId: string) {
    const { leads } = await this.leadRepository.findByOrgId(organizationId, {
      page: 1,
      limit: 100,
    });

    return leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      status: lead.status,
      identities: lead.identities,
      lastMessage: lead.messages?.[0] || null,
      updatedAt: lead.updatedAt,
    }));
  }

  async getMessages(organizationId: string, leadOrIdentityId: string) {
    const lead =
      (await this.leadRepository.findById(organizationId, leadOrIdentityId)) ||
      (await this.leadRepository.findByIdentityId(
        organizationId,
        leadOrIdentityId
      ));

    if (!lead) {
      return { messages: [], total: 0, page: 1, limit: 50 };
    }

    return this.leadMessageRepository.getMessages(lead.id, {
      page: 1,
      limit: 100,
    });
  }

  async handleIncomingMessage(
    organizationId: string,
    platform: string,
    externalId: string,
    senderId: string,
    content: string,
    metadata?: any
  ) {
    return this.leadService.upsertLeadFromInboundMessage({
      organizationId,
      channel: platform,
      externalId,
      content,
      senderInfo: {
        username: metadata?.username || senderId,
        displayName: metadata?.name,
        avatarUrl: metadata?.avatarUrl,
      },
      integrationId: metadata?.integrationId,
    });
  }

  async handleOutgoingMessage(
    organizationId: string,
    leadId: string,
    leadIdentityId: string,
    content: string,
    metadata?: any
  ) {
    return this.leadMessagingService.sendMessage({
      organizationId,
      leadId,
      leadIdentityId,
      content,
      attachmentsJson: metadata ? JSON.stringify(metadata) : undefined,
    });
  }
}
