import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, Optional } from '@nestjs/common';
import { Organization, User } from '@prisma/client';

export interface TenantContextData {
  organization?: Organization;
  user?: User;
  skipFiltering?: boolean; // For super admin queries
}

const tenantStorage = new AsyncLocalStorage<TenantContextData>();

/**
 * Get current tenant context (for use outside dependency injection)
 */
export function getCurrentTenantContext(): TenantContextData | undefined {
  return tenantStorage.getStore();
}

/**
 * Get current organization ID (for use outside dependency injection)
 */
export function getCurrentOrganizationId(): string | undefined {
  return tenantStorage.getStore()?.organization?.id;
}

/**
 * Check if tenant filtering should be skipped (for super admin queries)
 */
export function shouldSkipTenantFiltering(): boolean {
  return tenantStorage.getStore()?.skipFiltering === true;
}

@Injectable()
export class TenantContext {
  /**
   * Run a function with tenant context
   */
  run<T>(context: TenantContextData, fn: () => Promise<T> | T): Promise<T> | T {
    return tenantStorage.run(context, fn);
  }

  /**
   * Get current tenant context
   */
  get(): TenantContextData | undefined {
    return tenantStorage.getStore();
  }

  /**
   * Get current organization ID
   */
  getOrganizationId(): string | undefined {
    return tenantStorage.getStore()?.organization?.id;
  }

  /**
   * Get current organization
   */
  getOrganization(): Organization | undefined {
    return tenantStorage.getStore()?.organization;
  }

  /**
   * Get current user
   */
  getUser(): User | undefined {
    return tenantStorage.getStore()?.user;
  }

  /**
   * Check if filtering should be skipped (for super admin queries)
   */
  shouldSkipFiltering(): boolean {
    return tenantStorage.getStore()?.skipFiltering === true;
  }

  /**
   * Create a context for super admin (skips filtering)
   */
  createSuperAdminContext(user: User): TenantContextData {
    return {
      user,
      skipFiltering: true,
    };
  }

  /**
   * Create a context for regular tenant access
   */
  createTenantContext(organization: Organization, user: User): TenantContextData {
    return {
      organization,
      user,
      skipFiltering: false,
    };
  }
}