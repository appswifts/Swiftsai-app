import { Injectable } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class CampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  getByOrg(organizationId: string) {
    return this.prisma.campaign.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  getById(organizationId: string, id: string) {
    return this.prisma.campaign.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });
  }

  create(
    organizationId: string,
    data: {
      name: string;
      platform: string;
      type: string;
      budget?: number;
      config?: string;
      creative?: string;
      targeting?: string;
    }
  ) {
    return this.prisma.campaign.create({
      data: {
        organizationId,
        name: data.name,
        platform: data.platform,
        type: data.type,
        budget: data.budget,
        config: data.config,
        creative: data.creative,
        targeting: data.targeting,
      },
    });
  }

  update(
    organizationId: string,
    id: string,
    data: {
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
    return this.prisma.$transaction(async (tx) => {
      await tx.campaign.updateMany({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
        data,
      });

      return tx.campaign.findUnique({
        where: { id },
      });
    });
  }

  softDelete(organizationId: string, id: string) {
    return this.prisma.campaign.updateMany({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
  }

  getByIdSimple(organizationId: string, id: string) {
    return this.prisma.campaign.findUnique({
      where: { id, organizationId },
      select: {
        id: true,
        name: true,
        platform: true,
        type: true,
        status: true,
        organizationId: true,
        config: true,
        creative: true,
        targeting: true,
        metrics: true,
      },
    });
  }

  updateMetrics(organizationId: string, id: string, metrics: string) {
    return this.prisma.campaign.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { metrics },
    });
  }

  createAudit(
    campaignId: string,
    data: { userId?: string; action: string; oldValue?: string; newValue?: string }
  ) {
    return this.prisma.campaignAudit.create({
      data: {
        campaignId,
        userId: data.userId,
        action: data.action,
        oldValue: data.oldValue,
        newValue: data.newValue,
      },
    });
  }
}
