import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class ProcessedWebhookRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a webhook event has already been processed.
   * Returns true if already processed (duplicate), false if new.
   */
  async isDuplicate(provider: string, eventId: string): Promise<boolean> {
    const existing = await this.prisma.processedWebhook.findUnique({
      where: {
        provider_eventId: { provider, eventId },
      },
    });
    return !!existing;
  }

  /**
   * Mark a webhook event as processed.
   * Uses upsert to handle race conditions gracefully.
   */
  async markProcessed(
    provider: string,
    eventId: string,
    eventType?: string
  ): Promise<void> {
    await this.prisma.processedWebhook.upsert({
      where: {
        provider_eventId: { provider, eventId },
      },
      create: {
        provider,
        eventId,
        eventType,
      },
      update: {}, // No-op if already exists
    });
  }

  /**
   * Clean up old processed webhook records (optional, for maintenance).
   */
  async cleanupOlderThan(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await this.prisma.processedWebhook.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });

    return result.count;
  }
}
