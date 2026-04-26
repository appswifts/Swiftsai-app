import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getCurrentOrganizationId, shouldSkipTenantFiltering } from '../../tenant-context/tenant.context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
      ],
    });

    // Add tenant filtering middleware
    this.$use(async (params, next) => {
      // Skip filtering if explicitly disabled or no tenant context
      if (shouldSkipTenantFiltering()) {
        return next(params);
      }

      const organizationId = getCurrentOrganizationId();
      if (!organizationId) {
        return next(params);
      }

      // Models that should be filtered by organizationId/orgId
      const tenantScopedModels = [
        'Organization',
        'Tags',
        'UserOrganization',
        'GitHub',
        'Media',
        'Credits',
        'Subscription',
        'Customer',
        'Integration',
        'Signatures',
        'Comments',
        'Post',
        'Notifications',
        'MessagesGroup',
        'Plugs',
        'Sets',
        'ThirdParty',
        'Errors',
        'Webhooks',
        'AutoPost',
        'OAuthApp',
        'OAuthAuthorization',
        'Lead',
        'Campaign',
        'LeadIdentity',
        'LeadMessage',
        'CampaignAudit',
        'ProcessedWebhook',
        'UsedCodes',
      ];

      const model = params.model;
      if (!model || !tenantScopedModels.includes(model)) {
        return next(params);
      }

      // Determine the organization field name for this model
      let organizationField: string;
      if (['Tags', 'Customer', 'UsedCodes'].includes(model)) {
        organizationField = 'orgId';
      } else if (model === 'Organization') {
        organizationField = 'id';
      } else if (model === 'UserOrganization') {
        organizationField = 'organizationId';
      } else if (model === 'Subscription') {
        organizationField = 'organizationId';
      } else {
        organizationField = 'organizationId';
      }

      // Modify query to add organization filter
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        if (params.args?.where) {
          params.args.where[organizationField] = organizationId;
        } else {
          params.args = { ...params.args, where: { [organizationField]: organizationId } };
        }
      } else if (
        params.action === 'findMany' ||
        params.action === 'count' ||
        params.action === 'aggregate' ||
        params.action === 'groupBy'
      ) {
        if (params.args?.where) {
          // Combine with existing where using AND
          params.args.where = {
            AND: [
              params.args.where,
              { [organizationField]: organizationId },
            ],
          };
        } else {
          params.args = { ...params.args, where: { [organizationField]: organizationId } };
        }
      } else if (
        params.action === 'update' ||
        params.action === 'updateMany' ||
        params.action === 'delete' ||
        params.action === 'deleteMany'
      ) {
        if (params.args?.where) {
          params.args.where = {
            AND: [
              params.args.where,
              { [organizationField]: organizationId },
            ],
          };
        } else {
          params.args = { ...params.args, where: { [organizationField]: organizationId } };
        }
      }
      // Note: create actions don't need filtering, but we should ensure organizationId is set
      // This is typically done in the service layer

      return next(params);
    });
  }
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Injectable()
export class PrismaRepository<T extends keyof PrismaService> {
  public model: Pick<PrismaService, T>;
  constructor(private _prismaService: PrismaService) {
    this.model = this._prismaService;
  }
}

@Injectable()
export class PrismaTransaction {
  public model: Pick<PrismaService, '$transaction'>;
  constructor(private _prismaService: PrismaService) {
    this.model = this._prismaService;
  }
}
