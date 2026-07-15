# ScoutAI Project Manifest

## Project Status

**Stage 5 — Games, Seasons, Statistics, and Performance Testing** (in progress on branch; not merged).

| Field | Value |
| --- | --- |
| **Stage 5 starting commit** | `c397ea4f02ce2720156525329fe896aefbc7ace6` |
| **Stage 4 merged commit** | `6a292854e878bed420a9122dae34b4071162a654` |
| **Stage 5 branch** | `cursor/stage5-games-stats-performance-b61c` |
| **Stage 5 PR** | https://github.com/jonniethorpe45-max/ScoutAI/pull/8 |
| **Completion report** | [STAGE5_COMPLETION_REPORT.md](./STAGE5_COMPLETION_REPORT.md) |

**Prior:** Stage 4 — Athlete Platform Foundation (merged to `main`, closed).

## Completed Work

### Stage 3

- Governing documentation set and six ADRs
- pnpm + Turborepo monorepo; web / api / worker apps
- Shared packages, Prisma foundations, auth sessions, health/ready, worker smoke, CI

### Stage 4

- Athlete Passport API/UI, sports catalog, guardians, completeness/publish, ESLint gate

### Stage 5 (branch)

- Seasons + AthleteSeason historical team context
- Games + explicit participation + soft duplicate warnings
- Definition-driven statistics + query-time season aggregation + derived metrics
- Performance tests + historical results + personal bests (available vs verified)
- Athlete Games / Stats / Performance UI + public Passport sections
- Docs: `GAMES_AND_SEASONS.md`, `STATISTICS_ARCHITECTURE.md`, `PERFORMANCE_TESTING.md`

## Current Architecture

Modular monolith:

- Next.js App Router web (`apps/web`)
- NestJS API (`apps/api`) — auth, athletes, sports, guardians, seasons, games, statistics, performance
- BullMQ worker (`apps/worker`)
- PostgreSQL + Prisma (`packages/database/prisma/`)
- Redis (queues + readiness)

## Test Status

Local gates on Stage 5 branch (2026-07-15):

| Command | Result |
| --- | --- |
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass |
| `pnpm test:integration` | Pass — API 23/23, worker 2/2 |
| `pnpm build` | Pass |

## Known Issues

1. Host Docker CLI may be unavailable in cloud agents — use `dev-infra-local.sh` fallback.
2. Browser Playwright E2E not wired.
3. Secure media upload deferred.
4. Verification review queue not built (provenance fields reserved).
5. `CONNECTIONS` visibility allows any authenticated user pending recruiter entitlements.
6. Minor-athlete legal/compliance review required before production PII collection.

## Pending Work (Stage 6+)

**Do not begin until Stage 5 is merged and explicitly authorized.**

Suggested themes: secure media, verification review UX, recruiter entitlements, ScoutAI Live viewing, AI-assisted insights (labeled).

## Last Builder Handoff

See `docs/AI_HANDOFF.md`.

Do not rebuild Stage 3/4/5 foundations. Extend with stage discipline. Update this manifest after every stage.
