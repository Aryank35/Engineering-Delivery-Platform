import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config/app-config.service';

/**
 * Full auth-flow e2e. Requires a migrated + seeded database, so it is skipped
 * unless RUN_E2E=1. Run with:
 *   docker compose up -d postgres redis && pnpm db:migrate && pnpm db:seed
 *   RUN_E2E=1 pnpm --filter @eop/api test:e2e
 */
const describeE2E = process.env.RUN_E2E ? describe : describe.skip;

describeE2E('Auth (e2e)', () => {
  let app: INestApplication;
  const unique = `e2e_${Date.now()}@eop.dev`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    const config = app.get(AppConfigService);
    app.setGlobalPrefix(config.globalPrefix);
    app.use(cookieParser(config.cookie.secret));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/health is public and reports ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects unauthenticated access to /api/users', async () => {
    await request(app.getHttpServer()).get('/api/users').expect(401);
  });

  it('registers, then authorizes with the access token', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: unique, password: 'Secret123!', firstName: 'E2E', lastName: 'User' })
      .expect(201);

    expect(register.body.accessToken).toBeDefined();
    expect(register.body.user.roles).toContain('VIEWER');

    const token = register.body.accessToken as string;
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body.email).toBe(unique);
  });
});
