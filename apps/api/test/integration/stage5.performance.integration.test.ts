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

const FOOTBALL_STAT_DEFINITIONS = [
  { code: 'RUSH_ATTEMPTS', name: 'Rush Attempts', shortName: 'ATT', category: 'RUSHING' as const, dataType: 'INTEGER' as const, aggregationType: 'SUM' as const, higherIsBetter: true, displayOrder: 20 },
  { code: 'RUSHING_YARDS', name: 'Rushing Yards', shortName: 'YDS', category: 'RUSHING' as const, dataType: 'INTEGER' as const, aggregationType: 'SUM' as const, unit: 'yd', higherIsBetter: true, displayOrder: 21 },
  { code: 'YARDS_PER_CARRY', name: 'Yards Per Carry', shortName: 'YPC', category: 'RUSHING' as const, dataType: 'DECIMAL' as const, aggregationType: 'DERIVED' as const, unit: 'yd', higherIsBetter: true, displayOrder: 23 },
  { code: 'PASS_ATTEMPTS', name: 'Pass Attempts', shortName: 'ATT', category: 'PASSING' as const, dataType: 'INTEGER' as const, aggregationType: 'SUM' as const, higherIsBetter: true, displayOrder: 10 },
  { code: 'PASS_COMPLETIONS', name: 'Pass Completions', shortName: 'COMP', category: 'PASSING' as const, dataType: 'INTEGER' as const, aggregationType: 'SUM' as const, higherIsBetter: true, displayOrder: 11 },
];

const FOOTBALL_PERFORMANCE_TESTS = [
  { code: 'FORTY_YARD_DASH', name: '40-Yard Dash', measurementType: 'TIME' as const, unit: 's', lowerIsBetter: true, displayOrder: 1 },
  { code: 'VERTICAL_JUMP', name: 'Vertical Jump', measurementType: 'HEIGHT' as const, unit: 'cm', lowerIsBetter: false, displayOrder: 5 },
];


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

async function ensureFootballCatalog(): Promise<string> {
  const sport = await prisma.sport.upsert({
    where: { code: 'FOOTBALL' },
    update: { name: 'Football', status: 'ACTIVE' },
    create: { code: 'FOOTBALL', name: 'Football', status: 'ACTIVE' },
  });

  for (const position of [
    { code: 'RB', name: 'Running Back', displayOrder: 2 },
    { code: 'QB', name: 'Quarterback', displayOrder: 1 },
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

  for (const def of FOOTBALL_STAT_DEFINITIONS) {
    await prisma.statisticDefinition.upsert({
      where: { sportId_code: { sportId: sport.id, code: def.code } },
      update: {
        name: def.name,
        shortName: def.shortName,
        dataType: def.dataType,
        aggregationType: def.aggregationType,
        category: def.category,
        unit: def.unit ?? null,
        higherIsBetter: def.higherIsBetter ?? null,
        displayOrder: def.displayOrder,
        active: true,
      },
      create: {
        sportId: sport.id,
        code: def.code,
        name: def.name,
        shortName: def.shortName,
        dataType: def.dataType,
        aggregationType: def.aggregationType,
        category: def.category,
        unit: def.unit ?? null,
        higherIsBetter: def.higherIsBetter ?? null,
        displayOrder: def.displayOrder,
        active: true,
      },
    });
  }

  for (const test of FOOTBALL_PERFORMANCE_TESTS) {
    await prisma.performanceTestDefinition.upsert({
      where: { code: test.code },
      update: {
        sportId: sport.id,
        name: test.name,
        measurementType: test.measurementType,
        unit: test.unit,
        lowerIsBetter: test.lowerIsBetter,
        displayOrder: test.displayOrder,
        active: true,
      },
      create: {
        sportId: sport.id,
        code: test.code,
        name: test.name,
        measurementType: test.measurementType,
        unit: test.unit,
        lowerIsBetter: test.lowerIsBetter,
        displayOrder: test.displayOrder,
        active: true,
      },
    });
  }

  return sport.id;
}

async function registerAthlete(app: INestApplication, label: string) {
  const email = uniqueEmail(label);
  const agent = request.agent(app.getHttpServer());
  await agent.post('/auth/register').send({ email, password }).expect(200);
  await agent
    .post('/athletes/me')
    .send({
      firstName: 'Stage',
      lastName: label.slice(0, 20),
      displayName: `Stage5 ${label}`,
      dateOfBirth: '2008-05-01',
      city: 'Austin',
      stateRegion: 'TX',
    })
    .expect(200);
  await agent
    .patch('/athletes/me/sport')
    .send({ sportCode: 'FOOTBALL', isPrimary: true })
    .expect(200);
  await agent
    .patch('/athletes/me/positions')
    .send({
      sportCode: 'FOOTBALL',
      positions: [{ positionCode: 'RB', isPrimary: true, displayOrder: 0 }],
    })
    .expect(200);
  await agent
    .patch('/athletes/me/academic')
    .send({ graduationYear: 2027, schoolName: 'Demo HS' })
    .expect(200);
  await agent
    .patch('/athletes/me/visibility')
    .send({ profileVisibility: 'PUBLIC' })
    .expect(200);
  return { email, agent };
}

describe('Stage 5 games stats performance integration', () => {
  let app: INestApplication;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    app = await createNestApp();
    await app.init();
    await ensureFootballCatalog();
  });

  afterAll(async () => {
    await cleanupUsers(createdEmails);
    await app.close();
    await prisma.$disconnect();
  });

  it('lists football statistic and performance definitions', async () => {
    const stats = await request(app.getHttpServer())
      .get('/sports/FOOTBALL/statistics')
      .expect(200);
    expect(stats.body.some((s: { code: string }) => s.code === 'RUSHING_YARDS')).toBe(true);
    expect(stats.body.some((s: { code: string; aggregationType: string }) => s.code === 'YARDS_PER_CARRY' && s.aggregationType === 'DERIVED')).toBe(true);

    const { agent, email } = await registerAthlete(app, 'defs');
    createdEmails.push(email);
    const defs = await agent.get('/athletes/me/performance/definitions').expect(200);
    expect(defs.body.some((d: { code: string }) => d.code === 'FORTY_YARD_DASH')).toBe(true);
  });

  it('enforces season ownership and denies cross-athlete game stat edits', async () => {
    const a = await registerAthlete(app, 'owner-a');
    const b = await registerAthlete(app, 'owner-b');
    createdEmails.push(a.email, b.email);

    const seasonA = await a.agent
      .post('/athletes/me/seasons/catalog')
      .send({
        sportCode: 'FOOTBALL',
        name: `Fall A ${testRunId}`,
        year: 2026,
        status: 'ACTIVE',
      })
      .expect(200);

    const denied = await b.agent.get(`/athletes/me/seasons/${seasonA.body.id}`);
    expect([403, 404]).toContain(denied.status);

    const game = await a.agent
      .post('/athletes/me/games')
      .send({
        seasonId: seasonA.body.seasonId,
        scheduledStart: '2026-09-12T18:00:00.000Z',
        homeTeamName: 'North Field',
        awayTeamName: 'River City',
        athleteTeamSide: 'HOME',
        participationStatus: 'PARTICIPATED',
        athleteSeasonId: seasonA.body.id,
        homeScore: 21,
        awayScore: 14,
      })
      .expect(200);

    const crossStat = await b.agent
      .put(`/athletes/me/games/${game.body.game.id}/statistics`)
      .send({
        statistics: [{ statisticCode: 'RUSHING_YARDS', numericValue: 99 }],
      });
    expect([403, 404]).toContain(crossStat.status);

    await request(app.getHttpServer()).get('/athletes/me/games').expect(401);
  });

  it('rejects derived codes, negatives, and verification self-elevation', async () => {
    const { agent, email } = await registerAthlete(app, 'validation');
    createdEmails.push(email);

    const season = await agent
      .post('/athletes/me/seasons/catalog')
      .send({
        sportCode: 'FOOTBALL',
        name: `Fall V ${testRunId}`,
        year: 2026,
        status: 'ACTIVE',
      })
      .expect(200);

    const game = await agent
      .post('/athletes/me/games')
      .send({
        seasonId: season.body.seasonId,
        scheduledStart: '2026-09-19T18:00:00.000Z',
        homeTeamName: 'North Field',
        awayTeamName: 'Lakeview',
        athleteTeamSide: 'HOME',
        participationStatus: 'PARTICIPATED',
        athleteSeasonId: season.body.id,
      })
      .expect(200);

    await agent
      .put(`/athletes/me/games/${game.body.game.id}/statistics`)
      .send({
        statistics: [{ statisticCode: 'YARDS_PER_CARRY', numericValue: 5 }],
      })
      .expect(400);

    await agent
      .put(`/athletes/me/games/${game.body.game.id}/statistics`)
      .send({
        statistics: [{ statisticCode: 'RUSHING_YARDS', numericValue: -5 }],
      })
      .expect(400);

    const ok = await agent
      .put(`/athletes/me/games/${game.body.game.id}/statistics`)
      .send({
        statistics: [
          { statisticCode: 'RUSH_ATTEMPTS', numericValue: 10 },
          { statisticCode: 'RUSHING_YARDS', numericValue: 85 },
        ],
      })
      .expect(200);

    expect(ok.body.every((s: { sourceType: string; verificationStatus: string }) => s.sourceType === 'SELF_REPORTED' && s.verificationStatus === 'UNVERIFIED')).toBe(true);
  });

  it('aggregates season totals, updates on edit, and soft-warns duplicates', async () => {
    const { agent, email } = await registerAthlete(app, 'agg');
    createdEmails.push(email);

    const season = await agent
      .post('/athletes/me/seasons/catalog')
      .send({
        sportCode: 'FOOTBALL',
        name: `Fall Agg ${testRunId}`,
        year: 2026,
        status: 'ACTIVE',
      })
      .expect(200);

    await agent
      .patch(`/athletes/me/seasons/${season.body.id}`)
      .send({ selfReportedTeamName: 'North Field' })
      .expect(200);

    const game1 = await agent
      .post('/athletes/me/games')
      .send({
        seasonId: season.body.seasonId,
        scheduledStart: '2026-09-05T18:00:00.000Z',
        homeTeamName: 'North Field',
        awayTeamName: 'Eastside',
        athleteTeamSide: 'HOME',
        participationStatus: 'PARTICIPATED',
        athleteSeasonId: season.body.id,
        homeScore: 28,
        awayScore: 14,
      })
      .expect(200);

    const dup = await agent
      .post('/athletes/me/games')
      .send({
        seasonId: season.body.seasonId,
        scheduledStart: '2026-09-05T19:00:00.000Z',
        homeTeamName: 'North Field',
        awayTeamName: 'Eastside',
        athleteTeamSide: 'HOME',
        participationStatus: 'PARTICIPATED',
        athleteSeasonId: season.body.id,
      })
      .expect(200);
    expect(dup.body.duplicateWarning).toBe(true);
    expect(dup.body.possibleDuplicates.length).toBeGreaterThan(0);

    await agent
      .put(`/athletes/me/games/${game1.body.game.id}/statistics`)
      .send({
        statistics: [
          { statisticCode: 'RUSH_ATTEMPTS', numericValue: 12 },
          { statisticCode: 'RUSHING_YARDS', numericValue: 80 },
        ],
      })
      .expect(200);

    const game2 = await agent
      .post('/athletes/me/games')
      .send({
        seasonId: season.body.seasonId,
        scheduledStart: '2026-09-12T18:00:00.000Z',
        homeTeamName: 'Westbrook',
        awayTeamName: 'North Field',
        athleteTeamSide: 'AWAY',
        participationStatus: 'PARTICIPATED',
        athleteSeasonId: season.body.id,
        homeScore: 10,
        awayScore: 17,
      })
      .expect(200);

    await agent
      .put(`/athletes/me/games/${game2.body.game.id}/statistics`)
      .send({
        statistics: [
          { statisticCode: 'RUSH_ATTEMPTS', numericValue: 8 },
          { statisticCode: 'RUSHING_YARDS', numericValue: 45 },
        ],
      })
      .expect(200);

    let aggregates = await agent
      .get(`/athletes/me/seasons/${season.body.id}/aggregates`)
      .expect(200);
    const rushing = aggregates.body.totals.find((t: { statisticCode: string }) => t.statisticCode === 'RUSHING_YARDS');
    expect(rushing.numericValue).toBe(125);
    const ypc = aggregates.body.totals.find((t: { statisticCode: string }) => t.statisticCode === 'YARDS_PER_CARRY');
    expect(ypc.numericValue).toBeCloseTo(6.25, 5);
    expect(ypc.derived).toBe(true);

    await agent
      .put(`/athletes/me/games/${game1.body.game.id}/statistics`)
      .send({
        statistics: [
          { statisticCode: 'RUSH_ATTEMPTS', numericValue: 12 },
          { statisticCode: 'RUSHING_YARDS', numericValue: 100 },
        ],
      })
      .expect(200);

    aggregates = await agent
      .get(`/athletes/me/seasons/${season.body.id}/aggregates`)
      .expect(200);
    const updated = aggregates.body.totals.find((t: { statisticCode: string }) => t.statisticCode === 'RUSHING_YARDS');
    expect(updated.numericValue).toBe(145);
  });

  it('preserves performance history and distinguishes verified vs available bests', async () => {
    const { agent, email } = await registerAthlete(app, 'perf');
    createdEmails.push(email);

    await agent
      .post('/athletes/me/performance/results')
      .send({
        testCode: 'FORTY_YARD_DASH',
        numericValue: 4.71,
        performedAt: '2026-03-01T12:00:00.000Z',
      })
      .expect(200);

    await agent
      .post('/athletes/me/performance/results')
      .send({
        testCode: 'FORTY_YARD_DASH',
        numericValue: 4.52,
        performedAt: '2026-06-15T12:00:00.000Z',
      })
      .expect(200);

    await agent
      .post('/athletes/me/performance/results')
      .send({
        testCode: 'VERTICAL_JUMP',
        numericValue: 85,
        performedAt: '2026-06-15T12:00:00.000Z',
      })
      .expect(200);

    const history = await agent.get('/athletes/me/performance/results').expect(200);
    expect(history.body.filter((r: { testCode: string }) => r.testCode === 'FORTY_YARD_DASH')).toHaveLength(2);

    const bests = await agent.get('/athletes/me/performance/bests').expect(200);
    const forty = bests.body.find((b: { testCode: string }) => b.testCode === 'FORTY_YARD_DASH');
    expect(forty.bestAvailable.numericValue).toBe(4.52);
    expect(forty.bestVerified).toBeNull();

    const vertical = bests.body.find((b: { testCode: string }) => b.testCode === 'VERTICAL_JUMP');
    expect(vertical.bestAvailable.numericValue).toBe(85);
  });
});
