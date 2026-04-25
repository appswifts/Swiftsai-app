import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from './tenant.context';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContext) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Check if auth middleware has set org and user
    const org = (req as any).org;
    const user = (req as any).user;

    if (org && user) {
      // Regular tenant access
      const context = this.tenantContext.createTenantContext(org, user);
      this.tenantContext.run(context, () => next());
    } else if (user && (user as any).isSuperAdmin) {
      // Super admin access (no org context, skip filtering)
      const context = this.tenantContext.createSuperAdminContext(user);
      this.tenantContext.run(context, () => next());
    } else {
      // No auth or missing context, run without tenant context
      next();
    }
  }
}