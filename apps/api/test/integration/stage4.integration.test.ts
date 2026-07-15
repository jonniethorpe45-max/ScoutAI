import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import {
  OrganizationMemberRole,
  OrganizationType,
  UserRoleType,
  getPrismaClient,
} from '@scoutai/database';
import { Argon2PasswordHasher } from '@scoutai/auth';
import { loadEnv, resetEnvCache } from '@scoutai/config';
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
    where: { normalizedEmail: { in: normalizedEmails } },
  });
}

async function createUserWithRole(email: string, role: UserRoleType) {
  const passwordHash = await hasher.hash(password);
  return prisma.user.create({
    data: {
      email,
      normalizedEmail: email.trim().toLowerCase(),
      passwordHash,
      status: 'ACTIVE',
      roles: { create: [{ role }] },
    },
  });
}

describe('Stage 4 athlete platform integration', () => {
  let app: INestApplication;
  const createdEmails: string[] = [];
  let orgId = '';

  beforeAll(async () => {
    app = await createNestApp();
    await app.init();

    const org = await prisma.organization.create({
      data: {
        name: `Stage4 Org ${testRunId}`,
        slug: `stage4-org-${testRunId}`,
        type: OrganizationType.HIGH_SCHOOL,
        status: 'ACTIVE',
      },
    });
    orgId = org.id;
  });

  afterAll(async () => {
    await cleanupUsers(createdEmails);
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => undefined);
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('athlete can create and read own profile with restricted fields', async () => {
    const email = uniqueEmail('athlete-owner');
    createdEmails.push(email);
    await createUserWithRole(email, UserRoleType.ATHLETE);

    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password }).expect(200);

    const created = await agent
      .put('/athletes/me')
      .send({
        displayName: 'Integration Athlete',
        sport: 'football',
        position: 'QB',
        graduationYear: 2028,
        contactEmail: 'private@example.com',
        contactPhone: '555-0199',
        city: 'Dallas',
        state: 'TX',
      })
      .expect(200);

    expect(created.body.access).toBe('owner');
    expect(created.body.profile.contactEmail).toBe('private@example.com');
    expect(created.body.profile.displayName).toBe('Integration Athlete');

    const mine = await agent.get('/athletes/me').expect(200);
    expect(mine.body.profile.contactPhone).toBe('555-0199');
  });

  it('recruiter sees public fields only; unrelated athlete is denied', async () => {
    const athleteEmail = uniqueEmail('athlete-public');
    const recruiterEmail = uniqueEmail('recruiter-public');
    const otherEmail = uniqueEmail('other-athlete');
    createdEmails.push(athleteEmail, recruiterEmail, otherEmail);

    const athleteUser = await createUserWithRole(athleteEmail, UserRoleType.ATHLETE);
    await createUserWithRole(recruiterEmail, UserRoleType.RECRUITER);
    await createUserWithRole(otherEmail, UserRoleType.ATHLETE);

    void athleteUser;

    const athleteAgent = request.agent(app.getHttpServer());
    await athleteAgent.post('/auth/login').send({ email: athleteEmail, password }).expect(200);
    const profile = await athleteAgent
      .put('/athletes/me')
      .send({
        displayName: 'Public Demo',
        sport: 'football',
        position: 'RB',
        contactEmail: 'secret@example.com',
      })
      .expect(200);
    const athleteId = profile.body.profile.id as string;

    const recruiterAgent = request.agent(app.getHttpServer());
    await recruiterAgent.post('/auth/login').send({ email: recruiterEmail, password }).expect(200);
    const publicView = await recruiterAgent.get(`/athletes/${athleteId}`).expect(200);
    expect(publicView.body.access).toBe('public');
    expect(publicView.body.profile.displayName).toBe('Public Demo');
    expect(publicView.body.profile.contactEmail).toBeUndefined();

    const otherAgent = request.agent(app.getHttpServer());
    await otherAgent.post('/auth/login').send({ email: otherEmail, password }).expect(200);
    const denied = await otherAgent.get(`/athletes/${athleteId}`).expect(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
  });

  it('guardian invite/accept grants restricted access', async () => {
    const athleteEmail = uniqueEmail('athlete-guard');
    const guardianEmail = uniqueEmail('guardian-link');
    createdEmails.push(athleteEmail, guardianEmail);

    await createUserWithRole(athleteEmail, UserRoleType.ATHLETE);
    await createUserWithRole(guardianEmail, UserRoleType.GUARDIAN);

    const athleteAgent = request.agent(app.getHttpServer());
    await athleteAgent.post('/auth/login').send({ email: athleteEmail, password }).expect(200);
    const profile = await athleteAgent
      .put('/athletes/me')
      .send({
        displayName: 'Guarded Athlete',
        contactEmail: 'guarded@example.com',
        contactPhone: '555-0111',
      })
      .expect(200);
    const athleteId = profile.body.profile.id as string;

    const inviteResponse = await athleteAgent
      .post('/guardians/invites')
      .send({ guardianEmail, relationshipType: 'parent' })
      .expect(200);

    const linkId = inviteResponse.body.id as string;
    expect(inviteResponse.body.status).toBe('PENDING');

    const guardianAgent = request.agent(app.getHttpServer());
    await guardianAgent.post('/auth/login').send({ email: guardianEmail, password }).expect(200);
    await guardianAgent.post(`/guardians/invites/${linkId}/accept`).expect(200);

    const restricted = await guardianAgent.get(`/athletes/${athleteId}`).expect(200);
    expect(restricted.body.access).toBe('restricted');
    expect(restricted.body.profile.contactEmail).toBe('guarded@example.com');
  });

  it('coach can view org roster; member athlete cannot', async () => {
    const coachEmail = uniqueEmail('coach-roster');
    const athleteEmail = uniqueEmail('member-roster');
    createdEmails.push(coachEmail, athleteEmail);

    const coach = await createUserWithRole(coachEmail, UserRoleType.COACH);
    const athlete = await createUserWithRole(athleteEmail, UserRoleType.ATHLETE);

    await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: coach.id,
        role: OrganizationMemberRole.COACH,
        status: 'ACTIVE',
      },
    });
    await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: athlete.id,
        role: OrganizationMemberRole.MEMBER,
        status: 'ACTIVE',
      },
    });

    const coachAgent = request.agent(app.getHttpServer());
    await coachAgent.post('/auth/login').send({ email: coachEmail, password }).expect(200);
    const roster = await coachAgent.get(`/organizations/${orgId}/roster`).expect(200);
    expect(Array.isArray(roster.body)).toBe(true);
    expect(roster.body.some((row: { userId: string }) => row.userId === athlete.id)).toBe(true);

    const athleteAgent = request.agent(app.getHttpServer());
    await athleteAgent.post('/auth/login').send({ email: athleteEmail, password }).expect(200);
    const denied = await athleteAgent.get(`/organizations/${orgId}/roster`).expect(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
  });

  it('org admin can add a roster member', async () => {
    const adminEmail = uniqueEmail('orgadmin-roster');
    const newMemberEmail = uniqueEmail('new-member');
    createdEmails.push(adminEmail, newMemberEmail);

    const orgAdmin = await createUserWithRole(adminEmail, UserRoleType.ORGANIZATION_ADMIN);
    const newMember = await createUserWithRole(newMemberEmail, UserRoleType.ATHLETE);

    await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: orgAdmin.id,
        role: OrganizationMemberRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email: adminEmail, password }).expect(200);
    const added = await agent
      .post(`/organizations/${orgId}/roster`)
      .send({ userId: newMember.id, role: OrganizationMemberRole.MEMBER })
      .expect(200);

    expect(added.body.userId).toBe(newMember.id);
    expect(added.body.status).toBe('ACTIVE');
  });
});
