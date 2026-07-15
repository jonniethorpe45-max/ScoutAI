# ScoutAI Project Manifest

## Project Status

**Stage 4 — Athlete Platform Foundation** (**CI green** on PR #5; merging to `main`).

**Stage 3 verified base commit:** `3c032d62990402ebf72c4736cf8257ef85bef681`  
**Stage 4 branch:** `cursor/stage4-athlete-platform-foundation-b61c`  
**Stage 4 PR:** https://github.com/jonniethorpe45-max/ScoutAI/pull/5  
**CI (pre-merge):** https://github.com/jonniethorpe45-max/ScoutAI/actions/runs/29447058705 — **success**

**Prior:** Stage 3 — Repository Foundation (complete on `main`).

**Completion reports:** [STAGE3_COMPLETION_REPORT.md](./STAGE3_COMPLETION_REPORT.md), [STAGE4_COMPLETION_REPORT.md](./STAGE4_COMPLETION_REPORT.md)

## Completed Work

### Stage 3

- Governing documentation set and six ADRs
- pnpm + Turborepo monorepo; web / api / worker apps
- Shared packages, Prisma foundations, auth sessions, health/ready, worker smoke, CI

### Stage 4

- Athlete Passport API (owner + public), sports catalog, guardian links
- Completeness / onboarding / publish gates
- Web athlete experience (dashboard, onboarding, Passport, settings, public slug)
- `createMine` grants `ATHLETE` when user has no roles
- ESLint hardening (root flat config + typescript-eslint)
- Docs: `ATHLETE_PLATFORM.md`, `ATHLETE_DATA_MODEL.md`, Stage 4 completion report
- Integration + E2E-ish workflow tests; completeness unit tests
- Stage 3 regression suite retained and passing (auth/health/admin integration tests)

## Current Architecture

Modular monolith:

- Next.js App Router web (`apps/web`) — foundation + athlete Passport UI
- NestJS API (`apps/api`) — auth, athletes, sports, guardians, health
- BullMQ worker (`apps/worker`)
- PostgreSQL + Prisma (`packages/database/prisma/`)
- Redis (queues + readiness)

Session strategy unchanged: HTTP-only cookie + SHA-256 token hash; Argon2 passwords.

## Environment Requirements

Required services: PostgreSQL 16+, Redis 7+.

Key variables (see `.env.example`):

- `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` (≥32 chars)
- `APP_URL`, `API_URL`, `WEB_PORT`, `API_PORT`
- `COOKIE_SECURE`, `COOKIE_SAMESITE`, `LOG_LEVEL`, `NODE_ENV`
- `NEXT_PUBLIC_API_URL` for web

## Test Status

Local + CI gates on 2026-07-15 (Stage 4 PR #5):

| Command | Result |
| --- | --- |
| `pnpm lint` (`eslint .`) | Pass |
| `pnpm typecheck` | Pass (27 tasks) |
| `pnpm test` | Pass |
| `pnpm test:integration` | Pass — API 17/17 (Stage 3 + Stage 4), worker 2/2 |
| `pnpm build` | Pass (`NODE_ENV=production` for Next) |
| GitHub Actions CI | Pass |

## ESLint limitations (documented)

- Flat config uses `typescript-eslint` recommended rules without type-aware `project` service (faster CI; weaker analysis).
- Rules emphasize `no-unused-vars` (ignore `_`), `no-explicit-any` (warn), `prefer-const`, `no-debugger`.
- Web uses shared root ESLint on `app` / `lib` / `components` rather than only `next lint`.
- Generated Prisma client, `.next`, and `dist` are ignored.

## Known Issues

1. Host Docker CLI may be unavailable in cloud agents — use `dev-infra-local.sh` fallback.
2. Browser Playwright E2E not wired; API workflow tests cover Stage 4 §27 flow.
3. Secure media upload deferred (placeholder avatar only).
4. `CONNECTIONS` visibility allows any authenticated user pending recruiter entitlements.
5. Minor-athlete legal/compliance review required before production PII collection.

## Active Risks

- Cross-origin cookie auth between `:3000` and `:4000` requires correct CORS credentials.
- Minor-athlete privacy / DOB gating needs legal review before production.
- Media and stats stages must not leak restricted fields into public mappers.

## Pending Work (Stage 5+)

**Stage 5 is not authorized until Stage 4 closure report is reviewed.**

Suggested later themes:

- Secure media upload + highlight video
- Verified stats / performance insights
- Recruiter entitlement-scoped discovery
- Org roster management
- Playwright browser E2E

## Last Builder Handoff

See `docs/AI_HANDOFF.md` and `docs/ATHLETE_PLATFORM.md`.

Do not rebuild Stage 3/4 foundations. Extend with stage discipline. Update this manifest after every stage.
