# ScoutAI — Stage 4 Completion Report

**Project:** ScoutAI — Global Athletic Talent Intelligence Network  
**Stage:** Stage 4 — Athlete Platform Foundation  
**Report date:** 2026-07-15  
**Status:** Implemented; awaiting merge to `main`

---

## 1. Completed

### Domain / data

- Extended `Athlete` with public + restricted profile fields
- Guardian invite tracking (`invitedByUserId`)
- Migration `20260715180000_stage4_athlete_platform`
- Seed expanded with guardian, coach, org admin + active guardian link

### Authorization

- Policy helpers: `resolveAthleteProfileAccess`, create/edit profile, guardian link, roster view/manage
- Visibility-tiered profile responses (public / org / restricted / owner)
- Audit events for restricted views and authz denials

### API

| Area | Endpoints |
| --- | --- |
| Athletes | `GET/PUT /athletes/me`, `GET /athletes/:id` |
| Guardians | `POST /guardians/invites`, accept/revoke, list links/athletes |
| Organizations | `GET /organizations/mine`, roster GET/POST/DELETE |

### Web

- Dashboard shell with role-aware sections
- Profile editor (`/app/profile`)
- Guardian management (`/app/guardians`)
- Athlete profile view + org roster pages

### Tests / CI

- Stage 4 integration suite (5 cases) + existing Stage 3 suite
- CI build forced to `NODE_ENV=production` for Next.js

## 2. Explicitly deferred

- Native live streaming / video upload
- Stripe billing + paid entitlements
- Verified recruiter contact reveal
- Recruiter private notes UI
- Data export / deletion
- Playwright E2E

## 3. Seed credentials (synthetic only)

| Email | Password | Role |
| --- | --- | --- |
| `admin@scoutai.dev` | `AdminPass1!` | SCOUTAI_ADMIN |
| `athlete@scoutai.dev` | `AthletePass1!` | ATHLETE |
| `guardian@scoutai.dev` | `GuardianPass1!` | GUARDIAN |
| `coach@scoutai.dev` | `CoachPass1!` | COACH |
| `orgadmin@scoutai.dev` | `OrgAdminPass1!` | ORGANIZATION_ADMIN |
| `recruiter@scoutai.dev` | `RecruiterPass1!` | RECRUITER |

## 4. Next

Stage 5+ should extend Athlete Passport depth and verified recruiter flows without changing modular monolith topology. Update `AI_HANDOFF.md` after merge.
