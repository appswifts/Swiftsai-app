import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Organization } from '@prisma/client';

type HermesOrganization = Organization & {
  hermesEnabled?: boolean;
  hermesBrandVoice?: string | null;
  hermesGoals?: string | null;
  hermesApprovalMode?: string;
  hermesDailyPostLimit?: number;
};

@Injectable()
export class HermesService {
  private get baseUrl() {
    return (process.env.HERMES_API_URL || '').replace(/\/$/, '');
  }

  private get apiKey() {
    return process.env.HERMES_API_KEY || '';
  }

  isConfigured() {
    return (
      process.env.HERMES_ENABLED === 'true' &&
      Boolean(this.baseUrl) &&
      Boolean(this.apiKey)
    );
  }

  private headers(organizationId?: string) {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...(organizationId
        ? {
            'X-Hermes-Session-Key': `swiftsai:organization:${organizationId}`,
          }
        : {}),
    };
  }

  async health() {
    if (!this.isConfigured()) {
      return { configured: false, status: 'disabled' };
    }
    try {
      const response = await fetch(`${this.baseUrl}/health/detailed`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(5_000),
      });
      const body = await response.json();
      return {
        configured: true,
        status: response.ok ? body?.status || 'ok' : 'unavailable',
      };
    } catch {
      return { configured: true, status: 'unavailable' };
    }
  }

  async startRun(
    organization: HermesOrganization,
    input: string,
    idempotencyKey?: string
  ) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Hermes is not configured');
    }
    if (!organization.hermesEnabled) {
      throw new BadRequestException(
        'The AI worker is disabled for this organization'
      );
    }
    const task = input?.trim();
    if (!task || task.length > 4_000) {
      throw new BadRequestException(
        'A worker assignment between 1 and 4000 characters is required'
      );
    }

    const instructions = [
      'You are the private SwiftsAI content worker for one organization.',
      `Organization ID: ${organization.id}.`,
      `Organization name: ${organization.name}.`,
      `Brand voice: ${organization.hermesBrandVoice || 'Professional, clear, and helpful'}.`,
      `Goals: ${organization.hermesGoals || 'Create useful social media content that supports the organization goals'}.`,
      `Approval mode: ${organization.hermesApprovalMode || 'REQUIRE_APPROVAL'}.`,
      `Daily post limit: ${organization.hermesDailyPostLimit || 3}.`,
      'Never request, reveal, store, or print credentials, tokens, cookies, database details, or private data.',
      'Do not use terminal, shell, filesystem, browser, messaging, or publishing tools for SwiftsAI work.',
      'For this controlled first release, produce campaign plans and content drafts only.',
      'Never publish, schedule, delete, connect accounts, change billing, or contact external parties.',
      'Return a review-ready result with objective, audience, campaign outline, draft posts, channel suggestions, schedule suggestions, risks, and approval notes.',
    ].join('\n');

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/runs`, {
        method: 'POST',
        headers: {
          ...this.headers(organization.id),
          'Idempotency-Key': idempotencyKey || randomUUID(),
        },
        body: JSON.stringify({
          input: task,
          instructions,
          session_id: `swiftsai-${organization.id}`,
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new BadGatewayException('Hermes could not be reached');
    }
    if (!response.ok) {
      throw new BadGatewayException(
        `Hermes rejected the assignment (${response.status})`
      );
    }
    return response.json();
  }

  async getRun(organizationId: string, runId: string) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Hermes is not configured');
    }
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(runId)) {
      throw new BadRequestException('Invalid run identifier');
    }
    const response = await fetch(`${this.baseUrl}/v1/runs/${runId}`, {
      headers: this.headers(organizationId),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new BadGatewayException('Hermes run could not be loaded');
    }
    return response.json();
  }
}
