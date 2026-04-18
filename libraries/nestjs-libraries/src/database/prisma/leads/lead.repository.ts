import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class LeadRepository {
  constructor(private prisma: PrismaService) {}

  async findByOrgId(
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
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.ownerUserId) {
      where.ownerUserId = filters.ownerUserId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.channel) {
      where.identities = {
        some: { channel: filters.channel },
      };
    }

    const [leads, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        include: {
          identities: {
            select: {
              id: true,
              channel: true,
              externalId: true,
              displayName: true,
              avatarUrl: true,
              lastSeenAt: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              direction: true,
              createdAt: true,
              status: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { leads, total, page, limit };
  }

  async findById(organizationId: string, leadId: string) {
    return this.prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
        deletedAt: null,
      },
      include: {
        identities: true,
      },
    });
  }

  async findByIdentityId(organizationId: string, identityId: string) {
    return this.prisma.lead.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        identities: {
          some: {
            id: identityId,
          },
        },
      },
      include: {
        identities: true,
      },
    });
  }

  async create(data: {
    organizationId: string;
    name: string;
    email?: string;
    phone?: string;
    source?: string;
    ownerUserId?: string;
  }) {
    return this.prisma.lead.create({ data });
  }

  async update(
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
    return this.prisma.lead.update({
      where: { id: leadId, organizationId },
      data,
    });
  }

  async softDelete(organizationId: string, leadId: string) {
    return this.prisma.lead.update({
      where: { id: leadId, organizationId },
      data: { deletedAt: new Date() },
    });
  }

  async findByIdentity(
    organizationId: string,
    channel: string,
    externalId: string
  ) {
    const identity = await this.prisma.leadIdentity.findUnique({
      where: {
        organizationId_channel_externalId: {
          organizationId,
          channel,
          externalId,
        },
      },
      include: {
        lead: true,
      },
    });
    return identity;
  }

  async upsertIdentity(data: {
    leadId: string;
    organizationId: string;
    channel: string;
    externalId: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    integrationId?: string;
  }) {
    return this.prisma.leadIdentity.upsert({
      where: {
        organizationId_channel_externalId: {
          organizationId: data.organizationId,
          channel: data.channel,
          externalId: data.externalId,
        },
      },
      create: data,
      update: {
        username: data.username,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        integrationId: data.integrationId,
        lastSeenAt: new Date(),
      },
    });
  }

  async mergeLeads(primaryLeadId: string, duplicateLeadId: string) {
    return this.prisma.$transaction(async (tx) => {
      const duplicateIdentities = await tx.leadIdentity.findMany({
        where: { leadId: duplicateLeadId },
      });

      for (const duplicateIdentity of duplicateIdentities) {
        const existingPrimaryIdentity = await tx.leadIdentity.findFirst({
          where: {
            leadId: primaryLeadId,
            organizationId: duplicateIdentity.organizationId,
            channel: duplicateIdentity.channel,
            externalId: duplicateIdentity.externalId,
          },
        });

        if (existingPrimaryIdentity) {
          await tx.leadMessage.updateMany({
            where: { leadIdentityId: duplicateIdentity.id },
            data: { leadIdentityId: existingPrimaryIdentity.id },
          });

          await tx.leadIdentity.delete({
            where: { id: duplicateIdentity.id },
          });
          continue;
        }

        await tx.leadIdentity.update({
          where: { id: duplicateIdentity.id },
          data: { leadId: primaryLeadId },
        });
      }

      await tx.leadMessage.updateMany({
        where: { leadId: duplicateLeadId },
        data: { leadId: primaryLeadId },
      });

      // Soft-delete the duplicate
      await tx.lead.update({
        where: { id: duplicateLeadId },
        data: { deletedAt: new Date() },
      });

      return tx.lead.findUnique({
        where: { id: primaryLeadId },
        include: { identities: true },
      });
    });
  }
}
