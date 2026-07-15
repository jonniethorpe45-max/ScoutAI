# ScoutAI Project Manifest

## Project Status

**Stage 4 — Athlete Platform Foundation** (implemented on branch; pending merge).

**Prior:** Stage 3 — Repository Foundation (complete on `main`, PR #2 / `3c032d6`).

**Completion report:** [STAGE4_COMPLETION_REPORT.md](./STAGE4_COMPLETION_REPORT.md) · [STAGE3_COMPLETION_REPORT.md](./STAGE3_COMPLETION_REPORT.md)

## Completed Work

### Stage 3

- Governing documentation set + six ADRs
- pnpm workspaces + Turborepo monorepo
- Apps: web (Next.js), api (NestJS), worker (BullMQ)
- Auth (Argon2 + HTTP-only cookie sessions), health/ready, worker smoke, CI

### Stage 4

- Athlete profile CRUD with public / org / restricted / owner visibility tiers
- Guardian invite → accept → revoke workflow
- Organization roster view/manage (coach / org admin boundaries)
- Recruiter public-field read entitlement (role-based Stage 4 hook)
- Nest modules: `athletes`, `guardians`, `organizations`
- Extended Prisma schema + migration `20260715180000_stage4_athlete_platform`
- Seed users: athlete, guardian, coach, org admin, recruiter, ScoutAI admin
- Web UI: dashboard shell, profile editor, guardian management, athlete view, roster
- Integration tests for Stage 4 routes; authorization matrix updated

## Current Architecture

Modular monolith (unchanged topology):

- Next.js App Router web (`apps/web`)
- NestJS API (`apps/api`)
- BullMQ worker (`apps/worker`)
- PostgreSQL + Prisma (`packages/database`)
- Redis (queues + readiness)
- Provider adapters (mock/external-link) behind package contracts

Session strategy: database-backed sessions; raw token in HTTP-only cookie; SHA-256 token hash stored server-side.

## Environment Requirements

Required services: PostgreSQL 16+, Redis 7+.

Key variables (see `.env.example`): `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` (≥32 chars), `APP_URL`, `API_URL`, cookie/CORS settings.

## Test Status

Local verification (2026-07-15, Stage 4):

| Command | Result |
| --- | --- |
| `pnpm install` | Pass |
| Prisma migrate `20260715180000_stage4_athlete_platform` | Pass |
| `pnpm db:seed` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass |
| `pnpm test:integration` | Pass — API **16/16** (11 Stage 3 + 5 Stage 4), worker **2/2** |
| `pnpm lint` | Pass |
| `pnpm build` (web with `NODE_ENV=production`) | Pass |

## Known Issues

1. Host Docker CLI may be unavailable in some cloud environments — use `dev-infra-local.sh`.
2. Root ESLint remains minimal; typecheck + Next lint are the practical gates.
3. CI build step must use `NODE_ENV=production` (Next.js rejects `NODE_ENV=test` during prerender).
4. Full verified-recruiter contact reveal, billing entitlements, and native video remain deferred.

## Active Risks

- Cross-origin cookie auth between web and API requires correct CORS credentials in every environment.
- Minor-athlete privacy: legal counsel required before production PII collection.
- Stage 4 recruiter “entitlement” is role-based; do not treat as verified recruiting access.

## Pending Work (Stage 5+)

Suggested next stage themes (not started):

- Richer Athlete Passport / stats
- Verified recruiter workflow + contact reveal with consent
- Production billing entitlements (ADR-004)
- Video upload pipeline (out of Stage 4)
- Data export / deletion self-service

## Last Builder Handoff

Extend Stage 4; do not rebuild Stage 3 foundations. See `docs/AI_HANDOFF.md` (update for Stage 5 after merge).
