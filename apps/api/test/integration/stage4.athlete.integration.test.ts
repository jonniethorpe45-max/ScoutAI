import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Argon2PasswordHasher } from '@scoutai/auth';
import { loadEnv, resetEnvCache } from '@scoutai/config';
import { getPrismaClient, UserRoleType } from '@scoutai/database';
import request from 'supertest';
import { createNestApp } from '../../src/app.factory';

loadDotenv({ path: resolve(__dirname, '../../../../.env') });
resetEnvCache();
loadEnv();

const prisma = getPrismaClient();
const hasher = new Argon2PasswordHasher();
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

async function createRoleUser(email: string, role: UserRoleType) {
  const passwordHash = await hasher.hash(password);
  return prisma.user.create({
    data: {
      email,
      normalizedEmail: email.trim().toLowerCase(),
      passwordHash,
      status: 'ACTIVE',
      roles: {
        create: [{ role }],
      },
    },
  });
}

describe('Stage 4 athlete platform integration', () => {
  let app: INestApplication;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    app = await createNestApp();
    await app.init();

    // Ensure football sport exists for tests (seed may or may not have run).
    const sport = await prisma.sport.upsert({
      where: { code: 'FOOTBALL' },
      update: { name: 'Football', status: 'ACTIVE' },
      create: { code: 'FOOTBALL', name: 'Football', status: 'ACTIVE' },
    });

    const positions = [
      { code: 'QB', name: 'Quarterback', displayOrder: 1 },
      { code: 'WR', name: 'Wide Receiver', displayOrder: 2 },
    ];
    for (const position of positions) {
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

  it('lists sports and football positions', async () => {
    const sports = await request(app.getHttpServer()).get('/sports').expect(200);
    expect(sports.body.some((s: { code: string }) => s.code === 'FOOTBALL')).toBe(true);

    const positions = await request(app.getHttpServer())
      .get('/sports/FOOTBALL/positions')
      .expect(200);
    expect(positions.body.some((p: { code: string }) => p.code === 'QB')).toBe(true);
  });

  it('denies athlete profile creation without athlete role', async () => {
    const email = uniqueEmail('recruiter-deny');
    createdEmails.push(email);
    await createRoleUser(email, UserRoleType.RECRUITER);

    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password }).expect(200);

    const response = await agent
      .post('/athletes/me')
      .send({ firstName: 'No', lastName: 'Access' })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('creates athlete profile, sets sport/position, tracks completeness, publishes, and protects public privacy', async () => {
    const email = uniqueEmail('athlete-flow');
    createdEmails.push(email);
    await createRoleUser(email, UserRoleType.ATHLETE);

    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password }).expect(200);

    const created = await agent
      .post('/athletes/me')
      .send({
        firstName: 'Taylor',
        lastName: 'Scout',
        displayName: 'Taylor Scout',
        dateOfBirth: '2008-06-01',
      })
      .expect(200);

    expect(created.body.slug).toMatch(/taylor-scout-[a-f0-9]{4}/);
    expect(created.body.profileStatus).toBe('DRAFT');
    expect(created.body.dateOfBirth).toBeTruthy();
    expect(created.body.passwordHash).toBeUndefined();

    await agent
      .patch('/athletes/me/sport')
      .send({ sportCode: 'FOOTBALL', isPrimary: true, startYear: 2024 })
      .expect(200);

    await agent
      .patch('/athletes/me/positions')
      .send({
        sportCode: 'FOOTBALL',
        positions: [{ positionCode: 'QB', isPrimary: true }],
      })
      .expect(200);

    await agent
      .patch('/athletes/me/academic')
      .send({ graduationYear: 2027, schoolName: 'Integration High' })
      .expect(200);

    const incomplete = await agent.get('/athletes/me/completeness').expect(200);
    expect(incomplete.body.readyToPublish).toBe(false);
    expect(
      incomplete.body.checks.find((c: { key: string }) => c.key === 'visibilityChosen')
        .satisfied,
    ).toBe(false);

    const publishDenied = await agent.post('/athletes/me/publish').expect(400);
    expect(publishDenied.body.error.code).toBe('PROFILE_INCOMPLETE');

    await agent
      .patch('/athletes/me/visibility')
      .send({ profileVisibility: 'PUBLIC' })
      .expect(200);

    const complete = await agent.get('/athletes/me/completeness').expect(200);
    expect(complete.body.readyToPublish).toBe(true);

    const published = await agent.post('/athletes/me/publish').expect(200);
    expect(published.body.published).toBe(true);
    expect(published.body.profileStatus).toBe('PUBLISHED');

    const slug = created.body.slug as string;
    const publicView = await request(app.getHttpServer())
      .get(`/athletes/public/${slug}`)
      .expect(200);

    expect(publicView.body.displayName).toBe('Taylor Scout');
    expect(publicView.body.dateOfBirth).toBeUndefined();
    expect(publicView.body.postalCode).toBeUndefined();
    expect(publicView.body.email).toBeUndefined();
    expect(publicView.body.recruitingProfile?.contactPolicy).toBeUndefined();
    expect(publicView.body.passwordHash).toBeUndefined();

    await agent.post('/athletes/me/unpublish').expect(200);

    await request(app.getHttpServer()).get(`/athletes/public/${slug}`).expect(403);
  });

  it('supports guardian invite accept revoke workflow', async () => {
    const athleteEmail = uniqueEmail('athlete-guard');
    const guardianEmail = uniqueEmail('guardian-guard');
    createdEmails.push(athleteEmail, guardianEmail);

    await createRoleUser(athleteEmail, UserRoleType.ATHLETE);
    await createRoleUser(guardianEmail, UserRoleType.GUARDIAN);

    const athleteAgent = request.agent(app.getHttpServer());
    await athleteAgent.post('/auth/login').send({ email: athleteEmail, password }).expect(200);

    await athleteAgent
      .post('/athletes/me')
      .send({ firstName: 'Guard', lastName: 'Athlete', displayName: 'Guard Athlete' })
      .expect(200);

    const invite = await athleteAgent
      .post('/guardians/invites')
      .send({
        guardianEmail,
        relationshipType: 'PARENT',
      })
      .expect(200);

    expect(invite.body.inviteStatus).toBe('PENDING');
    expect(invite.body.status).toBe('PENDING');

    const strangerEmail = uniqueEmail('stranger-guard');
    createdEmails.push(strangerEmail);
    await createRoleUser(strangerEmail, UserRoleType.RECRUITER);
    const strangerAgent = request.agent(app.getHttpServer());
    await strangerAgent.post('/auth/login').send({ email: strangerEmail, password }).expect(200);
    await strangerAgent.post(`/guardians/invites/${invite.body.id}/accept`).expect(403);

    const guardianAgent = request.agent(app.getHttpServer());
    await guardianAgent.post('/auth/login').send({ email: guardianEmail, password }).expect(200);

    const accepted = await guardianAgent
      .post(`/guardians/invites/${invite.body.id}/accept`)
      .expect(200);
    expect(accepted.body.inviteStatus).toBe('ACCEPTED');
    expect(accepted.body.status).toBe('ACTIVE');

    const links = await guardianAgent.get('/guardians/links').expect(200);
    expect(links.body.asGuardian.some((l: { id: string }) => l.id === invite.body.id)).toBe(
      true,
    );

    const revoked = await athleteAgent
      .post(`/guardians/invites/${invite.body.id}/revoke`)
      .expect(200);
    expect(revoked.body.inviteStatus).toBe('REVOKED');
    expect(revoked.body.status).toBe('REVOKED');
  });

  it('rejects unauthenticated athlete me access', async () => {
    const response = await request(app.getHttpServer()).get('/athletes/me').expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
