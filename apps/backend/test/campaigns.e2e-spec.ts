import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

describe('Campaigns (e2e) - Tenant Isolation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let org1UserToken: string;
  let org2UserToken: string;
  let org1Id: string;
  let org2Id: string;
  let campaignId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();

    // Setup test data: 2 orgs, 2 users, 1 campaign in org1
    // (Mock auth/tokens as needed for your auth setup)
    // Create org1, user1 (org1), campaign1 (org1)
    // Create org2, user2 (org2)
    // Get tokens via login endpoints
  });

  it('Regular user cannot access other org campaigns', async () => {
    // Act as org2 user, GET /campaigns org1/campaign → 403/empty
    const response = await request(app.getHttpServer())
      .get('/campaigns')
      .set('Authorization', `Bearer ${org2UserToken}`)
      .expect(200);
    expect(response.body.length).toBe(0); // No campaigns visible
  });

  it('Owner can access own campaigns', async () => {
    const response = await request(app.getHttpServer())
      .get('/campaigns')
      .set('Authorization', `Bearer ${org1UserToken}`)
      .expect(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].id).toBe(campaignId);
  });

  it('Admin can access all campaigns', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    // Verify admin sees both orgs/campaigns
  });

  afterAll(async () => {
    await app.close();
    // Cleanup test data
  });
});
