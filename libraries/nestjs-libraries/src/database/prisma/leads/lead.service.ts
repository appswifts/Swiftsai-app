import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LeadRepository } from '@gitroom/nestjs-libraries/database/prisma/leads/lead.repository';
import { LeadMessageRepository } from '@gitroom/nestjs-libraries/database/prisma/leads/lead-message.repository';
import { LeadStatus, MessageDirection, MessageStatus } from '@prisma/client';

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    private readonly leadRepo: LeadRepository,
    private readonly messageRepo: LeadMessageRepository
  ) {}

  async getLeads(
    organizationId: string,
    filters?: {
      status?: LeadStatus;
      channel?: string;
      ownerUserId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    return this.leadRepo.findByOrgId(organizationId, filters);
  }

  async getLeadById(organizationId: string, leadId: string) {
    const lead = await this.leadRepo.findById(organizationId, leadId);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }

  async getLeadMessages(
    leadId: string,
    options?: { page?: number; limit?: number }
  ) {
    return this.messageRepo.getMessages(leadId, options);
  }

  async updateLead(
    organizationId: string,
    leadId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      status?: LeadStatus;
      ownerUserId?: string | null;
    }
  ) {
    // Verify lead exists
    await this.getLeadById(organizationId, leadId);
    return this.leadRepo.update(organizationId, leadId, data);
  }

  async mergeLeads(
    organizationId: string,
    primaryLeadId: string,
    duplicateLeadId: string
  ) {
    // Verify both leads belong to the org
    await this.getLeadById(organizationId, primaryLeadId);
    await this.getLeadById(organizationId, duplicateLeadId);
    return this.leadRepo.mergeLeads(primaryLeadId, duplicateLeadId);
  }

  async markMessagesAsRead(leadId: string) {
    return this.messageRepo.markAsRead(leadId);
  }

  async getUnreadCount(leadId: string) {
    return this.messageRepo.getUnreadCount(leadId);
  }

  /**
   * Core inbound message handler: resolves identity -> upserts lead -> persists message.
   * Called by webhook controllers when a message arrives from any channel.
   */
  async upsertLeadFromInboundMessage(params: {
    organizationId: string;
    channel: string;
    externalId: string;
    content?: string;
    providerMessageId?: string;
    attachmentsJson?: string;
    senderInfo?: {
      username?: string;
      displayName?: string;
      avatarUrl?: string;
    };
    integrationId?: string;
  }) {
    const {
      organizationId,
      channel,
      externalId,
      content,
      providerMessageId,
      attachmentsJson,
      senderInfo,
      integrationId,
    } = params;

    // 1. Try to find existing identity
    const existingIdentity = await this.leadRepo.findByIdentity(
      organizationId,
      channel,
      externalId
    );

    let leadId: string;
    let leadIdentityId: string;

    if (existingIdentity) {
      // Existing lead — update identity info if we have new data
      leadId = existingIdentity.leadId;
      const upsertedIdentity = await this.leadRepo.upsertIdentity({
        leadId,
        organizationId,
        channel,
        externalId,
        username: senderInfo?.username,
        displayName: senderInfo?.displayName,
        avatarUrl: senderInfo?.avatarUrl,
        integrationId,
      });
      leadIdentityId = upsertedIdentity.id;

      // Update lead status to CONTACTED if it was NEW
      const lead = existingIdentity.lead;
      if (lead.status === LeadStatus.NEW) {
        await this.leadRepo.update(organizationId, leadId, {
          status: LeadStatus.CONTACTED,
        });
      }
    } else {
      // 2. Create new lead + identity
      const name =
        senderInfo?.displayName || senderInfo?.username || externalId;
      const newLead = await this.leadRepo.create({
        organizationId,
        name,
        source: channel,
      });
      leadId = newLead.id;

      const createdIdentity = await this.leadRepo.upsertIdentity({
        leadId,
        organizationId,
        channel,
        externalId,
        username: senderInfo?.username,
        displayName: senderInfo?.displayName,
        avatarUrl: senderInfo?.avatarUrl,
        integrationId,
      });
      leadIdentityId = createdIdentity.id;
    }

    // 3. Persist the message
    const message = await this.messageRepo.createMessage({
      organizationId,
      leadId,
      leadIdentityId,
      direction: MessageDirection.INBOUND,
      content,
      attachmentsJson,
      providerMessageId,
      status: MessageStatus.DELIVERED,
      sentAt: new Date(),
    });

    this.logger.log(
      `Inbound message persisted: lead=${leadId}, channel=${channel}, msgId=${message.id}`
    );

    return { lead: { id: leadId }, leadIdentityId, message };
  }
}
