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
  const users = await prisma.user.findMany({
    where: { normalizedEmail: { in: normalizedEmails } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length > 0) {
    await prisma.athleteGameStatistic.deleteMany({
      where: { enteredByUserId: { in: userIds } },
    });
    await prisma.performanceTestResult.deleteMany({
      where: { enteredByUserId: { in: userIds } },
    });
    await prisma.game.deleteMany({
      where: { createdByUserId: { in: userIds } },
    });
  }
  await prisma.user.deleteMany({
    where: { normalizedEmail: { in: normalizedEmails } },
  });
}

/**
 * Stage 5 E2E API workflow (§42):
 * auth → athlete → season → games → stats → aggregates → performance → publish → public
 */
describe('Stage 5 E2E athlete performance workflow', () => {
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

    await prisma.position.upsert({
      where: { sportId_code: { sportId: sport.id, code: 'RB' } },
      update: { name: 'Running Back', displayOrder: 2 },
      create: { sportId: sport.id, code: 'RB', name: 'Running Back', displayOrder: 2 },
    });

    for (const def of [
      { code: 'RUSH_ATTEMPTS', name: 'Rush Attempts', shortName: 'ATT', category: 'RUSHING', dataType: 'INTEGER', aggregationType: 'SUM', displayOrder: 20 },
      { code: 'RUSHING_YARDS', name: 'Rushing Yards', shortName: 'YDS', category: 'RUSHING', dataType: 'INTEGER', aggregationType: 'SUM', unit: 'yd', displayOrder: 21 },
      { code: 'YARDS_PER_CARRY', name: 'Yards Per Carry', shortName: 'YPC', category: 'RUSHING', dataType: 'DECIMAL', aggregationType: 'DERIVED', unit: 'yd', displayOrder: 23 },
    ] as const) {
      await prisma.statisticDefinition.upsert({
        where: { sportId_code: { sportId: sport.id, code: def.code } },
        update: {
          name: def.name,
          shortName: def.shortName,
          category: def.category,
          dataType: def.dataType,
          aggregationType: def.aggregationType,
          unit: 'unit' in def ? def.unit : null,
          displayOrder: def.displayOrder,
          active: true,
        },
        create: {
          sportId: sport.id,
          code: def.code,
          name: def.name,
          shortName: def.shortName,
          category: def.category,
          dataType: def.dataType,
          aggregationType: def.aggregationType,
          unit: 'unit' in def ? def.unit : null,
          displayOrder: def.displayOrder,
          active: true,
        },
      });
    }

    await prisma.performanceTestDefinition.upsert({
      where: { code: 'FORTY_YARD_DASH' },
      update: {
        sportId: sport.id,
        name: '40-Yard Dash',
        measurementType: 'TIME',
        unit: 's',
        lowerIsBetter: true,
        active: true,
        displayOrder: 1,
      },
      create: {
        sportId: sport.id,
        code: 'FORTY_YARD_DASH',
        name: '40-Yard Dash',
        measurementType: 'TIME',
        unit: 's',
        lowerIsBetter: true,
        active: true,
        displayOrder: 1,
      },
    });
  });

  afterAll(async () => {
    await cleanupUsers(createdEmails);
    await app.close();
    await prisma.$disconnect();
  });

  it('runs full season/stats/performance/public workflow without fabricating verification', async () => {
    const email = uniqueEmail('s5-e2e');
    createdEmails.push(email);
    const agent = request.agent(app.getHttpServer());

    await agent.post('/auth/register').send({ email, password }).expect(200);
    const athlete = await agent
      .post('/athletes/me')
      .send({
        firstName: 'Stage',
        lastName: 'Five',
        displayName: 'Stage Five Runner',
        dateOfBirth: '2008-05-01',
        city: 'Austin',
        stateRegion: 'TX',
      })
      .expect(200);

    await agent.patch('/athletes/me/sport').send({ sportCode: 'FOOTBALL', isPrimary: true }).expect(200);
    await agent
      .patch('/athletes/me/positions')
      .send({ sportCode: 'FOOTBALL', positions: [{ positionCode: 'RB', isPrimary: true, displayOrder: 0 }] })
      .expect(200);
    await agent.patch('/athletes/me/academic').send({ graduationYear: 2027 }).expect(200);
    await agent.patch('/athletes/me/visibility').send({ profileVisibility: 'PUBLIC' }).expect(200);

    const season = await agent
      .post('/athletes/me/seasons/catalog')
      .send({ sportCode: 'FOOTBALL', name: `E2E Fall ${testRunId}`, year: 2026, status: 'ACTIVE' })
      .expect(200);
    await agent
      .patch(`/athletes/me/seasons/${season.body.id}`)
      .send({ selfReportedTeamName: 'North Field Demo' })
      .expect(200);

    const game1 = await agent
      .post('/athletes/me/games')
      .send({
        seasonId: season.body.seasonId,
        scheduledStart: '2026-09-05T18:00:00.000Z',
        homeTeamName: 'North Field Demo',
        awayTeamName: 'River City',
        athleteTeamSide: 'HOME',
        participationStatus: 'PARTICIPATED',
        athleteSeasonId: season.body.id,
        homeScore: 24,
        awayScore: 17,
      })
      .expect(200);
    expect(game1.body.game.participationStatus).toBe('PARTICIPATED');

    await agent
      .put(`/athletes/me/games/${game1.body.game.id}/statistics`)
      .send({
        statistics: [
          { statisticCode: 'RUSH_ATTEMPTS', numericValue: 15 },
          { statisticCode: 'RUSHING_YARDS', numericValue: 95 },
        ],
      })
      .expect(200);

    const game2 = await agent
      .post('/athletes/me/games')
      .send({
        seasonId: season.body.seasonId,
        scheduledStart: '2026-09-12T18:00:00.000Z',
        homeTeamName: 'Lakeview',
        awayTeamName: 'North Field Demo',
        athleteTeamSide: 'AWAY',
        participationStatus: 'PARTICIPATED',
        athleteSeasonId: season.body.id,
        homeScore: 14,
        awayScore: 21,
      })
      .expect(200);

    await agent
      .put(`/athletes/me/games/${game2.body.game.id}/statistics`)
      .send({
        statistics: [
          { statisticCode: 'RUSH_ATTEMPTS', numericValue: 10 },
          { statisticCode: 'RUSHING_YARDS', numericValue: 55 },
        ],
      })
      .expect(200);

    const aggregates = await agent
      .get(`/athletes/me/seasons/${season.body.id}/aggregates`)
      .expect(200);
    const rushing = aggregates.body.totals.find((t: { statisticCode: string }) => t.statisticCode === 'RUSHING_YARDS');
    expect(rushing.numericValue).toBe(150);
    const ypc = aggregates.body.totals.find((t: { statisticCode: string }) => t.statisticCode === 'YARDS_PER_CARRY');
    expect(ypc.numericValue).toBe(6);

    await agent
      .post('/athletes/me/performance/results')
      .send({ testCode: 'FORTY_YARD_DASH', numericValue: 4.71, performedAt: '2026-03-01T12:00:00.000Z' })
      .expect(200);
    await agent
      .post('/athletes/me/performance/results')
      .send({ testCode: 'FORTY_YARD_DASH', numericValue: 4.52, performedAt: '2026-08-10T12:00:00.000Z' })
      .expect(200);

    const bests = await agent.get('/athletes/me/performance/bests').expect(200);
    const forty = bests.body.find((b: { testCode: string }) => b.testCode === 'FORTY_YARD_DASH');
    expect(forty.bestAvailable.numericValue).toBe(4.52);
    expect(forty.bestVerified).toBeNull();

    await agent.post('/athletes/me/publish').expect(200);

    const publicPassport = await request(app.getHttpServer())
      .get(`/athletes/public/${athlete.body.slug}`)
      .expect(200);
    expect(publicPassport.body.dateOfBirth).toBeUndefined();
    expect(publicPassport.body.email).toBeUndefined();

    const publicPerf = await request(app.getHttpServer())
      .get(`/athletes/public/${athlete.body.slug}/performance`)
      .expect(200);
    expect(publicPerf.body.recentGames.length).toBeGreaterThan(0);
    expect(publicPerf.body.seasonSummaries.length).toBeGreaterThan(0);
    expect(
      publicPerf.body.performanceBests.some(
        (b: { testCode: string; value: number | null; verificationStatus: string | null }) =>
          b.testCode === 'FORTY_YARD_DASH' && b.value === 4.52 && b.verificationStatus === 'UNVERIFIED',
      ),
    ).toBe(true);
    expect(JSON.stringify(publicPerf.body)).not.toContain('passwordHash');
    expect(JSON.stringify(publicPerf.body)).not.toContain(email);
  });
});
