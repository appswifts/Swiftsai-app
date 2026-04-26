import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { User } from '@prisma/client';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import { HttpForbiddenException } from '@gitroom/nestjs-libraries/services/exception.filter';
import { TenantContext } from '@gitroom/nestjs-libraries/tenant-context/tenant.context';

export const removeAuth = (res: Response) => {
  res.cookie('auth', '', {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    ...(!process.env.NOT_SECURED
      ? {
        secure: true,
        httpOnly: true,
        sameSite: 'none',
      }
      : {}),
    expires: new Date(0),
    maxAge: -1,
  });
  res.header('logout', 'true');
};

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private _organizationService: OrganizationService,
    private _userService: UsersService,
    private _tenantContext: TenantContext
  ) { }
  async use(req: Request, res: Response, next: NextFunction) {
    const auth = req.headers.auth || req.cookies.auth;
    if (!auth) {
      throw new HttpForbiddenException();
    }
    try {
      let user = AuthService.verifyJWT(auth) as User | null;
      const orgHeader = req.cookies.showorg || req.headers.showorg;

      if (!user) {
        throw new HttpForbiddenException();
      }

      if (!user.activated) {
        throw new HttpForbiddenException();
      }

      const impersonate = req.cookies.impersonate || req.headers.impersonate;
      if (user?.isSuperAdmin && impersonate) {
        try {
          const loadImpersonate = await this._organizationService.getUserOrg(
            impersonate
          );

          if (loadImpersonate) {
            user = loadImpersonate.user;
            user.isSuperAdmin = true;
            delete user.password;

            // @ts-ignore
            req.org = loadImpersonate.organization as any;
            // @ts-ignore
            req.org.users = [
              {
                // @ts-ignore
                role: loadImpersonate.role,
              },
            ];

            // Set tenant context for impersonated user
            this._tenantContext.run(
              this._tenantContext.createTenantContext(
                loadImpersonate.organization as any,
                user
              ),
              () => next()
            );
            return;
          }
        } catch (err) {
          console.error('Impersonation error:', err);
        }
      }

      delete user.password;
      // @ts-ignore
      req.user = user;

      const organization = (
        await this._organizationService.getOrgsByUserId(user.id)
      ).filter((f) => !f.users?.[0]?.disabled);

      const setOrg =
        organization.find((org) => org.id === orgHeader) || organization[0];

      if (!organization.length || !setOrg) {
        // If the user is a global superadmin, allow them to enter without an organization
        if (user.isSuperAdmin) {
          this._tenantContext.run(
            this._tenantContext.createSuperAdminContext(user),
            () => next()
          );
          return;
        }
        throw new HttpForbiddenException();
      }

      // @ts-ignore
      req.org = setOrg;

      this._tenantContext.run(
        this._tenantContext.createTenantContext(setOrg as any, user),
        () => next()
      );
    } catch (err) {
      console.error('AuthMiddleware error:', err);
      removeAuth(res);
      throw new HttpForbiddenException();
    }
  }
}
