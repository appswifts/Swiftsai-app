import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { MessageDirection, MessageStatus } from '@prisma/client';

@Injectable()
export class LeadMessageRepository {
  constructor(private prisma: PrismaService) {}

  async getMessages(
    leadId: string,
    options?: { page?: number; limit?: number }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await this.prisma.$transaction([
      this.prisma.leadMessage.findMany({
        where: { leadId },
        include: {
          leadIdentity: {
            select: {
              id: true,
              channel: true,
              displayName: true,
              avatarUrl: true,
              externalId: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.leadMessage.count({ where: { leadId } }),
    ]);

    return { messages, total, page, limit };
  }

  async createMessage(data: {
    organizationId: string;
    leadId: string;
    leadIdentityId: string;
    direction: MessageDirection;
    content?: string;
    attachmentsJson?: string;
    providerMessageId?: string;
    status?: MessageStatus;
    sentAt?: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Check for duplicate by providerMessageId
      if (data.providerMessageId) {
        const existing = await tx.leadMessage.findFirst({
          where: { providerMessageId: data.providerMessageId },
        });
        if (existing) {
          return existing;
        }
      }

      const message = await tx.leadMessage.create({
        data: {
          organizationId: data.organizationId,
          leadId: data.leadId,
          leadIdentityId: data.leadIdentityId,
          direction: data.direction,
          content: data.content,
          attachmentsJson: data.attachmentsJson,
          providerMessageId: data.providerMessageId,
          status: data.status || MessageStatus.QUEUED,
          sentAt: data.sentAt,
        },
      });

      // Touch the lead's updatedAt for sorting
      await tx.lead.update({
        where: { id: data.leadId },
        data: { updatedAt: new Date() },
      });

      // Update identity lastSeenAt
      if (data.direction === MessageDirection.INBOUND) {
        await tx.leadIdentity.update({
          where: { id: data.leadIdentityId },
          data: { lastSeenAt: new Date() },
        });
      }

      return message;
    });
  }

  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    extra?: {
      deliveredAt?: Date;
      readAt?: Date;
      errorReason?: string;
      sentAt?: Date;
      providerMessageId?: string;
    }
  ) {
    return this.prisma.leadMessage.update({
      where: { id: messageId },
      data: {
        status,
        ...extra,
      },
    });
  }

  async findByProviderMessageId(providerMessageId: string) {
    return this.prisma.leadMessage.findFirst({
      where: { providerMessageId },
    });
  }

  async getUnreadCount(leadId: string) {
    return this.prisma.leadMessage.count({
      where: {
        leadId,
        direction: MessageDirection.INBOUND,
        readAt: null,
      },
    });
  }

  async markAsRead(leadId: string) {
    return this.prisma.leadMessage.updateMany({
      where: {
        leadId,
        direction: MessageDirection.INBOUND,
        readAt: null,
      },
      data: {
        readAt: new Date(),
        status: MessageStatus.READ,
      },
    });
  }
}
