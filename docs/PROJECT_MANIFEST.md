# ScoutAI Project Manifest

## Project Status

**Stage 5 — Games, Seasons, Statistics, and Performance Testing** (closing; PR #8).

| Field | Value |
| --- | --- |
| **Stage 5 starting commit** | `c397ea4f02ce2720156525329fe896aefbc7ace6` |
| **Stage 4 merged commit** | `6a292854e878bed420a9122dae34b4071162a654` |
| **Stage 5 branch** | `cursor/stage5-games-stats-performance-b61c` |
| **Stage 5 PR** | https://github.com/jonniethorpe45-max/ScoutAI/pull/8 |
| **Final PR tip** | `acf6d771ba3f2bb0cb35e8bd2329378386db8ad1` |
| **CI (final tip)** | https://github.com/jonniethorpe45-max/ScoutAI/actions/runs/29456616852 — **success** |
| **Completion report** | [STAGE5_COMPLETION_REPORT.md](./STAGE5_COMPLETION_REPORT.md) |
| **Closure report** | [STAGE5_CLOSURE_REPORT.md](./STAGE5_CLOSURE_REPORT.md) |

**Prior:** Stage 4 — Athlete Platform Foundation (merged to `main`, closed).

## Completed Work

### Stage 3

- Governing documentation set and six ADRs
- pnpm + Turborepo monorepo; web / api / worker apps
- Shared packages, Prisma foundations, auth sessions, health/ready, worker smoke, CI

### Stage 4

- Athlete Passport API/UI, sports catalog, guardians, completeness/publish, ESLint gate

### Stage 5

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

| Command | Result |
| --- | --- |
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass |
| `pnpm test:integration` | Pass — API 23/23, worker 2/2 |
| `pnpm build` | Pass |
| GitHub Actions CI (PR tip) | Pass |

## CI maintenance

GitHub Actions warns that `actions/checkout@v4`, `actions/setup-node@v4`, and `pnpm/action-setup@v4` target the deprecated **Node.js 20** action runtime and are being forced onto **Node.js 24**. Job application Node remains **22** via `setup-node`. This is **not a Stage 5 product blocker**. Schedule a dedicated CI maintenance change to Node-24-native action majors (e.g. `actions/checkout@v5+`, `actions/setup-node@v5+`, and a matching `pnpm/action-setup` release) without mixing into product stages. See comment in `.github/workflows/ci.yml` and https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/

## Known Issues

1. Host Docker CLI may be unavailable in cloud agents — use `dev-infra-local.sh` fallback.
2. Browser Playwright E2E not wired.
3. Secure media upload deferred.
4. Verification review queue not built (provenance fields reserved).
5. `CONNECTIONS` visibility allows any authenticated user pending recruiter entitlements.
6. Minor-athlete legal/compliance review required before production PII collection.
7. CI Actions Node.js 20 runtime deprecation warnings (maintenance item above).

## Pending Work (Stage 6+)

**Do not begin until Stage 5 is merged and the closure report is reviewed and Stage 6 is explicitly authorized.**

Suggested themes: secure media, verification review UX, recruiter entitlements, ScoutAI Live viewing, AI-assisted insights (labeled), CI action major bumps.

## Last Builder Handoff

See `docs/AI_HANDOFF.md`.

Do not rebuild Stage 3/4/5 foundations. Extend with stage discipline. Update this manifest after every stage.
