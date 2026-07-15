# ScoutAI Stage 4 → Stage 5 AI Handoff

**Audience:** AI builder or engineering team continuing after **Stage 4 — Athlete Platform Foundation**.  
**From:** Stage 4 athlete platform builder.  
**Date context:** 2026-07-15.

## Mission of Stage 4

Deliver the Athlete Passport foundation: owner onboarding, section editing, completeness/publish, public Passport, guardian invites — on top of the Stage 3 modular monolith without rebuilding auth, topology, or provider adapters.

## What Stage 4 Delivered

### API

- `/athletes/me` create/read + section PATCH routes
- Completeness + onboarding + publish/unpublish
- `/athletes/public/:slug` with privacy stripping
- `/sports` catalog + positions
- Guardian invite / accept / revoke / links
- Auto-grant `ATHLETE` on `POST /athletes/me` when user has no roles (audited)

### Web

- Athlete dashboard, onboarding wizard, Passport editor, preview, settings
- Public `/athletes/[slug]` with honest empty states (stats/video/performance)
- Typed API client in `apps/web/lib/api.ts`

### Tooling / docs

- Root ESLint flat config (`typescript-eslint`)
- `docs/ATHLETE_PLATFORM.md`, `ATHLETE_DATA_MODEL.md`, `STAGE4_COMPLETION_REPORT.md`
- Updated architecture, authorization matrix, privacy, testing, development, manifest

### Tests

- Completeness unit tests
- Stage 4 athlete integration suite
- E2E-ish workflow: register → create → onboard → publish → public

## What NOT to Rebuild

Same Stage 3 constraints apply. Additionally do **not**:

1. Reintroduce email/DOB/guardian PII onto public Passport mappers.
2. Replace placeholder avatars with insecure direct uploads — design a secure media pipeline first.
3. Collapse athlete module boundaries into the web app.
4. Bypass completeness gates for publish in production paths.

## Stage 5 — Suggested Next

| Area | Intent |
| --- | --- |
| Media | Secure avatar/highlight upload + storage |
| Stats | Verified performance data model |
| Recruiter | Entitlement-scoped discovery beyond authenticated CONNECTIONS |
| Org roster | Coach/org membership management |
| Playwright | Browser E2E for athlete onboarding |

## Key files

```text
apps/api/src/athletes/
apps/api/src/guardians/
apps/api/src/sports/
apps/web/app/app/athlete/
apps/web/app/athletes/[slug]/
apps/web/lib/api.ts
packages/database/prisma/
packages/authorization/src/policies.ts
docs/ATHLETE_PLATFORM.md
docs/STAGE4_COMPLETION_REPORT.md
```

## Seed accounts

See `DEVELOPMENT.md`. New registrants can create an athlete profile without a pre-seeded `ATHLETE` role.

## Success criteria for Stage 5 handoff

Update `PROJECT_MANIFEST.md` only after lint/typecheck/unit/integration/build pass. Prefer ADRs for media and entitlement changes.

---

*Begin Stage 5 by reading `PROJECT_MANIFEST.md`, `ATHLETE_PLATFORM.md`, and `PRODUCT_CONSTITUTION.md`.*
