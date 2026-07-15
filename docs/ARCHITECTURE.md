# ScoutAI Architecture

## Topology

**Modular Monolith + Background Worker + Provider Adapters**

```text
┌────────────┐     ┌────────────┐     ┌────────────┐
│  apps/web  │────▶│  apps/api  │────▶│ PostgreSQL │
│  Next.js   │     │  NestJS    │     └────────────┘
└────────────┘     │            │────▶ Redis / BullMQ
                   └─────┬──────┘
                         │ enqueue
                   ┌─────▼──────┐
                   │ apps/worker│
                   │  BullMQ    │
                   └────────────┘
                         │
            packages/* contracts & adapters
```

## Runtime Components

| Component | Role |
| --- | --- |
| `apps/web` | Next.js App Router UI |
| `apps/api` | NestJS HTTP API, auth, authorization, audit |
| `apps/worker` | BullMQ job processors |
| PostgreSQL | System of record (Prisma) |
| Redis | Queue backend + readiness dependency |

## Internal Packages

Shared TypeScript packages under `packages/` enforce boundaries:

- Domain / contracts / validation — shared types without leaking Prisma models as API DTOs
- Auth / authorization — replaceable auth provider surfaces; role/policy checks
- AI / video / live / billing / notifications — provider interfaces + mock adapters
- Observability / testing / config / ui / database — cross-cutting foundations

## Key Decisions

See ADRs:

- ADR-001 Modular monolith
- ADR-002 PostgreSQL system of record
- ADR-003 Provider-agnostic Live
- ADR-004 Entitlement-based feature access
- ADR-005 AI provider abstraction
- ADR-006 Multi-sport configurable data model

## Stage 3 Scope

Established:

- Workspace (pnpm + Turborepo)
- Schema foundations (User, roles, session, audit, org, athlete, recruiter, guardian)
- Email/password auth with HTTP-only cookie sessions
- Authorization policies for `/me` and `/admin/system-info`
- Health / ready checks
- Worker `system.smoke` job
- Docker Compose for Postgres + Redis
- CI lint/typecheck/test/build

## Stage 4 Scope

Athlete Platform Foundation:

- Expanded athlete domain models (sport/position, physical/academic/recruiting profiles)
- Owner Passport API (`/athletes/me/*`) + public Passport (`/athletes/public/:slug`)
- Completeness scoring and publish gates
- Guardian invite/accept/revoke links
- Web athlete experience: dashboard, onboarding wizard, Passport editor/preview, settings, public page
- Self-service `ATHLETE` role grant on first profile create when the user has no roles

Deferred (by design beyond Stage 4):

- Secure media upload / highlight video processing
- Verified stats and AI performance insights
- Native live streaming / advanced video processing
- Production Stripe billing
- Live AI provider integrations beyond mock adapters
- Recruiter entitlement-scoped discovery

## Stage 5 Scope

Games, seasons, statistics, and performance testing:

- Competition data plane separate from profile fields (`Season`, `AthleteSeason`, `Game`, participation)
- Definition-driven statistics with query-time season aggregation + safe derived metrics
- Performance test catalog + historical results + personal bests (available vs verified)
- Athlete Games / Stats / Performance UI; public Passport performance sections
- Soft duplicate-game warnings; verification fields reserved (no self-elevation)

See `GAMES_AND_SEASONS.md`, `STATISTICS_ARCHITECTURE.md`, `PERFORMANCE_TESTING.md`.

Deferred beyond Stage 5:

- Verification review queue
- Secure media / Live viewing UI
- Recruiter discovery / AI insights

## Request Context

Every API request carries:

- `requestId`
- optional authenticated user + roles
- timestamp

Request IDs flow into structured logs and audit events.
