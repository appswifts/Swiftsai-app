import { Global, Module } from '@nestjs/common';
import { TenantContext } from './tenant.context';
import { TenantContextMiddleware } from './tenant-context.middleware';

@Global()
@Module({
  providers: [TenantContext, TenantContextMiddleware],
  exports: [TenantContext, TenantContextMiddleware],
})
export class TenantContextModule {}