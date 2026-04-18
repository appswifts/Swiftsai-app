import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { MessageDirection, MessageStatus } from '@prisma/client';

@Injectable()
export class InboxRepository {
  constructor(private prisma: PrismaService) {}

  async getConversations(organizationId: string) {
    return this.prisma.lead.findMany({
      where: { organizationId },
      include: {
        identities: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(leadId: string) {
    return this.prisma.leadMessage.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async upsertConversation(
    organizationId: string,
    platform: string,
    externalId: string,
    metadata?: string
  ) {
    const displayName = metadata ? JSON.parse(metadata)?.name : undefined;

    const existing = await this.prisma.leadIdentity.findUnique({
      where: {
        organizationId_channel_externalId: {
          organizationId,
          channel: platform,
          externalId,
        },
      },
      include: { lead: true },
    });

    if (existing?.lead) {
      return existing.lead;
    }

    const lead = await this.prisma.lead.create({
      data: {
        organizationId,
        name: displayName || externalId,
        source: platform,
      },
    });

    await this.prisma.leadIdentity.create({
      data: {
        leadId: lead.id,
        organizationId,
        channel: platform,
        externalId,
        displayName: displayName || undefined,
      },
    });

    return lead;
  }

  async createMessage(
    leadId: string,
    fromExternalId: string,
    content: string,
    isIncoming: boolean,
    metadata?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      let identity = await tx.leadIdentity.findFirst({
        where: {
          leadId,
          externalId: fromExternalId,
        },
      });

      if (!identity) {
        identity = await tx.leadIdentity.create({
          data: {
            leadId,
            organizationId: (await tx.lead.findUnique({ where: { id: leadId } }))
              ?.organizationId!,
            channel: 'unknown',
            externalId: fromExternalId,
            displayName: metadata ? JSON.parse(metadata)?.name : undefined,
          },
        });
      }

      const message = await tx.leadMessage.create({
        data: {
          leadId,
          organizationId: (await tx.lead.findUnique({ where: { id: leadId } }))
            ?.organizationId!,
          leadIdentityId: identity.id,
          direction: isIncoming
            ? MessageDirection.INBOUND
            : MessageDirection.OUTBOUND,
          content,
          attachmentsJson: metadata,
          status: MessageStatus.SENT,
          sentAt: new Date(),
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: { updatedAt: new Date() },
      });

      return message;
    });
  }
}
