import { AuthMiddleware } from './auth.middleware';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { TenantContext } from '@gitroom/nestjs-libraries/tenant-context/tenant.context';

describe('AuthMiddleware tenant isolation', () => {
  const activeUser = {
    id: 'user-1',
    activated: true,
    isSuperAdmin: false,
    password: 'secret',
  };
  const orgA = {
    id: 'org-a',
    createdAt: new Date(),
    users: [{ role: 'ADMIN', disabled: false }],
  };
  const orgB = {
    id: 'org-b',
    createdAt: new Date(),
    users: [{ role: 'USER', disabled: false }],
  };

  let tenantContext: TenantContext;
  let organizationService: {
    getOrgsByUserId: jest.Mock;
    getUserOrg: jest.Mock;
  };
  let userService: {
    getUserById: jest.Mock;
  };
  let middleware: AuthMiddleware;

  beforeEach(() => {
    tenantContext = new TenantContext();
    organizationService = {
      getOrgsByUserId: jest.fn().mockResolvedValue([orgA, orgB]),
      getUserOrg: jest.fn(),
    };
    userService = {
      getUserById: jest.fn().mockResolvedValue({ ...activeUser }),
    };
    middleware = new AuthMiddleware(
      organizationService as never,
      userService as never,
      tenantContext
    );
    jest.spyOn(AuthService, 'verifyJWT').mockReturnValue({
      id: activeUser.id,
    } as never);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createRequest(options?: {
    showorg?: string;
    impersonate?: string;
  }) {
    return {
      headers: { auth: 'valid-token' },
      cookies: {
        ...(options?.showorg ? { showorg: options.showorg } : {}),
        ...(options?.impersonate
          ? { impersonate: options.impersonate }
          : {}),
      },
    } as any;
  }

  function createResponse() {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as any;
  }

  it('selects only a requested organization that belongs to the user', async () => {
    const request = createRequest({ showorg: orgB.id });
    let contextOrganizationId: string | undefined;

    await middleware.use(request, createResponse(), () => {
      contextOrganizationId = tenantContext.getOrganizationId();
    });

    expect(request.org.id).toBe(orgB.id);
    expect(request.user.id).toBe(activeUser.id);
    expect(contextOrganizationId).toBe(orgB.id);
  });

  it('never accepts a forged organization identifier', async () => {
    const request = createRequest({ showorg: 'org-from-another-tenant' });
    let contextOrganizationId: string | undefined;

    await middleware.use(request, createResponse(), () => {
      contextOrganizationId = tenantContext.getOrganizationId();
    });

    expect(request.org.id).toBe(orgA.id);
    expect(contextOrganizationId).toBe(orgA.id);
    expect(request.org.id).not.toBe('org-from-another-tenant');
  });

  it('does not select a disabled organization membership', async () => {
    organizationService.getOrgsByUserId.mockResolvedValue([
      {
        ...orgA,
        users: [{ role: 'ADMIN', disabled: true }],
      },
      orgB,
    ]);
    const request = createRequest({ showorg: orgA.id });

    await middleware.use(request, createResponse(), jest.fn());

    expect(request.org.id).toBe(orgB.id);
  });

  it('rejects a regular user without an active organization', async () => {
    organizationService.getOrgsByUserId.mockResolvedValue([]);

    await expect(
      middleware.use(createRequest(), createResponse(), jest.fn())
    ).rejects.toBeDefined();
  });

  it('keeps impersonated request identity and tenant context synchronized', async () => {
    userService.getUserById.mockResolvedValue({
      ...activeUser,
      isSuperAdmin: true,
    });
    organizationService.getUserOrg.mockResolvedValue({
      user: {
        id: 'impersonated-user',
        activated: true,
        isSuperAdmin: false,
        password: 'secret',
      },
      organization: orgB,
      role: 'ADMIN',
    });
    const request = createRequest({ impersonate: 'membership-id' });
    let contextOrganizationId: string | undefined;

    await middleware.use(request, createResponse(), () => {
      contextOrganizationId = tenantContext.getOrganizationId();
    });

    expect(request.user.id).toBe('impersonated-user');
    expect(request.user.password).toBeUndefined();
    expect(request.user.isSuperAdmin).toBe(true);
    expect(request.org.id).toBe(orgB.id);
    expect(request.org.users[0].role).toBe('ADMIN');
    expect(contextOrganizationId).toBe(orgB.id);
  });
});
