import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { HermesService } from '@gitroom/backend/services/hermes/hermes.service';

type HermesApprovalMode = 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_SCHEDULE';

@Controller('/hermes')
export class HermesController {
  constructor(
    private readonly database: PrismaRepository<'organization'>,
    private readonly hermes: HermesService
  ) {}

  @Get('/config')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async config(@GetOrgFromRequest() organization: Organization) {
    const config = await this.database.model.organization.findUnique({
      where: { id: organization.id },
      select: {
        hermesEnabled: true,
        hermesBrandVoice: true,
        hermesGoals: true,
        hermesApprovalMode: true,
        hermesDailyPostLimit: true,
      },
    });
    return { ...config, service: await this.hermes.health() };
  }

  @Post('/config')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateConfig(
    @GetOrgFromRequest() organization: Organization,
    @Body()
    body: {
      enabled?: boolean;
      brandVoice?: string;
      goals?: string;
      approvalMode?: HermesApprovalMode;
      dailyPostLimit?: number;
    }
  ) {
    const allowedModes: HermesApprovalMode[] = [
      'DRAFT_ONLY',
      'REQUIRE_APPROVAL',
      'AUTO_SCHEDULE',
    ];
    const approvalMode = allowedModes.includes(body.approvalMode!)
      ? body.approvalMode
      : 'REQUIRE_APPROVAL';
    const dailyPostLimit = Math.max(
      1,
      Math.min(20, Number(body.dailyPostLimit) || 3)
    );
    return this.database.model.organization.update({
      where: { id: organization.id },
      data: {
        hermesEnabled: Boolean(body.enabled),
        hermesBrandVoice: String(body.brandVoice || '').slice(0, 2_000),
        hermesGoals: String(body.goals || '').slice(0, 4_000),
        hermesApprovalMode: approvalMode,
        hermesDailyPostLimit: dailyPostLimit,
      },
      select: {
        hermesEnabled: true,
        hermesBrandVoice: true,
        hermesGoals: true,
        hermesApprovalMode: true,
        hermesDailyPostLimit: true,
      },
    });
  }

  @Post('/runs')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async run(
    @GetOrgFromRequest() organization: Organization,
    @Body() body: { input?: string },
    @Headers('idempotency-key') idempotencyKey?: string
  ) {
    const current = await this.database.model.organization.findUniqueOrThrow({
      where: { id: organization.id },
    });
    return this.hermes.startRun(
      current,
      body.input || '',
      idempotencyKey?.slice(0, 160)
    );
  }

  @Get('/runs/:runId')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  runStatus(
    @GetOrgFromRequest() organization: Organization,
    @Param('runId') runId: string
  ) {
    return this.hermes.getRun(organization.id, runId);
  }
}
