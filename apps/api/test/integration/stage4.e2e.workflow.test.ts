import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { loadEnv, resetEnvCache } from '@scoutai/config';
import { getPrismaClient } from '@scoutai/database';
import request from 'supertest';
import { createNestApp } from '../../src/app.factory';

loadDotenv({ path: resolve(__dirname, '../../../../.env') });
resetEnvCache();
loadEnv();

const prisma = getPrismaClient();
const testRunId = randomUUID().slice(0, 8);
const password = 'ValidPass1!';

function uniqueEmail(label: string): string {
  return `${label}-${testRunId}@integration.test`;
}

async function cleanupUsers(emails: string[]): Promise<void> {
  const normalizedEmails = emails.map((email) => email.trim().toLowerCase());
  if (normalizedEmails.length === 0) {
    return;
  }

  await prisma.user.deleteMany({
    where: {
      normalizedEmail: { in: normalizedEmails },
    },
  });
}

/**
 * Stage 4 E2E-ish API workflow (prompt §27):
 * register → create athlete (auto-grant ATHLETE) → onboarding patches → publish → public view
 */
describe('Stage 4 E2E athlete workflow', () => {
  let app: INestApplication;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    app = await createNestApp();
    await app.init();

    const sport = await prisma.sport.upsert({
      where: { code: 'FOOTBALL' },
      update: { name: 'Football', status: 'ACTIVE' },
      create: { code: 'FOOTBALL', name: 'Football', status: 'ACTIVE' },
    });

    for (const position of [
      { code: 'QB', name: 'Quarterback', displayOrder: 1 },
      { code: 'WR', name: 'Wide Receiver', displayOrder: 2 },
    ]) {
      await prisma.position.upsert({
        where: { sportId_code: { sportId: sport.id, code: position.code } },
        update: { name: position.name, displayOrder: position.displayOrder },
        create: {
          sportId: sport.id,
          code: position.code,
          name: position.name,
          displayOrder: position.displayOrder,
        },
      });
    }
  });

  afterAll(async () => {
    await cleanupUsers(createdEmails);
    await app.close();
    await prisma.$disconnect();
  });

  it('registers a user with no roles, creates athlete (grants ATHLETE), onboards, publishes, and exposes public Passport', async () => {
    const email = uniqueEmail('e2e-register');
    createdEmails.push(email);
    const agent = request.agent(app.getHttpServer());

    const registered = await agent
      .post('/auth/register')
      .send({ email, password })
      .expect(200);

    expect(registered.body.user.email).toBe(email.trim().toLowerCase());
    expect(registered.body.user.roles).toEqual([]);

    const created = await agent
      .post('/athletes/me')
      .send({
        firstName: 'Casey',
        lastName: 'Runner',
        displayName: 'Casey Runner',
        dateOfBirth: '2007-09-15',
        city: 'Austin',
        stateRegion: 'TX',
      })
      .expect(200);

    expect(created.body.slug).toMatch(/casey-runner-[a-f0-9]{4}/);
    expect(created.body.profileStatus).toBe('DRAFT');
    expect(created.body.onboardingStage).toBe('IDENTITY');

    const meAfterCreate = await agent.get('/me').expect(200);
    expect(meAfterCreate.body.user.roles).toContain('ATHLETE');

    const roleGrant = await prisma.auditEvent.findFirst({
      where: {
        actorId: meAfterCreate.body.user.id,
        action: 'user.role.granted',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(roleGrant).toBeTruthy();

    await agent
      .patch('/athletes/me/identity')
      .send({
        firstName: 'Casey',
        lastName: 'Runner',
        displayName: 'Casey Runner',
        city: 'Austin',
        stateRegion: 'TX',
      })
      .expect(200);

    await agent
      .patch('/athletes/me/sport')
      .send({ sportCode: 'FOOTBALL', isPrimary: true, startYear: 2023 })
      .expect(200);

    await agent
      .patch('/athletes/me/positions')
      .send({
        sportCode: 'FOOTBALL',
        positions: [{ positionCode: 'WR', isPrimary: true }],
      })
      .expect(200);

    await agent
      .patch('/athletes/me/school-team')
      .send({
        schoolNameReported: 'E2E High',
        teamNameReported: 'Eagles',
      })
      .expect(200);

    await agent
      .patch('/athletes/me/physical')
      .send({ heightCm: 178, weightKg: 72 })
      .expect(200);

    await agent
      .patch('/athletes/me/academic')
      .send({
        schoolName: 'E2E High',
        graduationYear: 2026,
        intendedMajor: 'Kinesiology',
      })
      .expect(200);

    await agent
      .patch('/athletes/me/recruiting')
      .send({
        recruitingStatus: 'OPEN',
        commitmentStatus: 'NONE',
        recruitingBiography: 'Looking for the right fit.',
      })
      .expect(200);

    await agent
      .patch('/athletes/me/biography')
      .send({ biography: 'Multi-sport athlete focused on academics and football.' })
      .expect(200);

    await agent
      .patch('/athletes/me/visibility')
      .send({ profileVisibility: 'PUBLIC' })
      .expect(200);

    await agent.patch('/athletes/me/onboarding').send({ stage: 'VISIBILITY' }).expect(200);

    const onboarding = await agent.get('/athletes/me/onboarding').expect(200);
    expect(onboarding.body.stage).toBe('VISIBILITY');
    expect(onboarding.body.completeness.readyToPublish).toBe(true);

    const completeness = await agent.get('/athletes/me/completeness').expect(200);
    expect(completeness.body.readyToPublish).toBe(true);
    expect(completeness.body.score).toBeGreaterThanOrEqual(70);

    const published = await agent.post('/athletes/me/publish').expect(200);
    expect(published.body.published).toBe(true);
    expect(published.body.profileStatus).toBe('PUBLISHED');

    const slug = created.body.slug as string;
    const publicView = await request(app.getHttpServer())
      .get(`/athletes/public/${slug}`)
      .expect(200);

    expect(publicView.body.displayName).toBe('Casey Runner');
    expect(publicView.body.sports.some((s: { sportCode: string }) => s.sportCode === 'FOOTBALL')).toBe(
      true,
    );
    expect(publicView.body.positions.some((p: { code: string }) => p.code === 'WR')).toBe(true);
    expect(publicView.body.dateOfBirth).toBeUndefined();
    expect(publicView.body.email).toBeUndefined();
    expect(publicView.body.postalCode).toBeUndefined();
    expect(publicView.body.recruitingProfile?.contactPolicy).toBeUndefined();

    await agent.post('/athletes/me/unpublish').expect(200);
    await request(app.getHttpServer()).get(`/athletes/public/${slug}`).expect(403);
  });
});
