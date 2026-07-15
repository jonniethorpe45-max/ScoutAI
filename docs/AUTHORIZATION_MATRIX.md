# ScoutAI Authorization Matrix

**Stage 4 — Athlete Platform Foundation.** This matrix defines server-side authorization intent for the modular monolith (`apps/api`). Front-end route visibility is not an access-control boundary.

## Legend

| Symbol | Meaning |
| --- | --- |
| **Allow** | Action permitted when authenticated and policy preconditions are met |
| **Deny** | Action not permitted for this role |
| **Own** | Permitted only for the actor's own resource or account |
| **Restricted** | Permitted only under explicit relationship, entitlement, or admin policy |
| **Future** | Not implemented yet; reserved capability |

## Roles

| Role | Description |
| --- | --- |
| **Athlete** | Student athlete account (may be a minor) |
| **Guardian** | Parent/guardian linked to one or more athlete accounts |
| **Recruiter** | College or professional recruiting staff |
| **Coach** | High school or club coaching staff |
| **Org Admin** | Administrator for a school, club, or organization |
| **ScoutAI Admin** | Platform operator with elevated system access |

## Matrix

| Action | Athlete | Guardian | Recruiter | Coach | Org Admin | ScoutAI Admin |
| --- | --- | --- | --- | --- | --- | --- |
| View own account (`GET /me`) | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** |
| Edit own account (`PATCH /me`) | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** |
| View admin system info (`GET /admin/system-info`) | **Deny** | **Deny** | **Deny** | **Deny** | **Deny** | **Allow** |
| Create/edit own athlete profile (`PUT /athletes/me`) | **Own** | **Deny** | **Deny** | **Deny** | **Deny** | **Allow** |
| View athlete profile (`GET /athletes/:id`) | **Own** / **Deny** (unrelated) | **Restricted** (active link → restricted fields) | **Restricted** (role entitlement → public fields) | **Restricted** (shared org → org tier) | **Restricted** (shared org → org tier) | **Allow** (restricted + audit) |
| View athlete restricted contact info | **Own** | **Restricted** (active guardian link) | **Deny** (Stage 4; verified entitlement **Future**) | **Deny** (Stage 4) | **Deny** (Stage 4) | **Restricted** (audit-logged) |
| Manage guardian–athlete link | **Restricted** (invite/revoke own) | **Restricted** (accept/revoke) | **Deny** | **Deny** | **Deny** | **Allow** |
| Verify recruiter identity | **Deny** | **Deny** | **Deny** | **Deny** | **Deny** | **Future** |
| Read recruiter private notes | **Deny** | **Deny** | **Owner only** | **Deny** | **Deny** | **Restricted** (support/legal, **Future**) |
| Write recruiter private notes | **Deny** | **Deny** | **Owner only** (**Future**) | **Deny** | **Deny** | **Deny** |
| View organization roster | **Deny** | **Deny** | **Deny** (entitled, **Future**) | **Restricted** (coach membership) | **Restricted** (admin membership) | **Allow** |
| Manage organization roster | **Deny** | **Deny** | **Deny** | **Restricted** (add MEMBER only) | **Restricted** (own org) | **Allow** |
| Manage organization settings | **Deny** | **Deny** | **Deny** | **Restricted** (delegated, **Future**) | **Restricted** (own org, **Future**) | **Allow** (**Future**) |
| Assign org roles (coach, admin) | **Deny** | **Deny** | **Deny** | **Deny** | **Restricted** (own org via roster API) | **Allow** |
| Enqueue background jobs (system) | **Deny** | **Deny** | **Deny** | **Deny** | **Deny** | **Allow** (internal/smoke) |
| View audit log | **Deny** | **Deny** | **Deny** | **Deny** | **Restricted** (org scope, **Future**) | **Allow** (**Future**) |
| Export own data | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) |
| Request account deletion | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Restricted** (**Future**) |

## Stage 4 Implemented Endpoints

| Endpoint | Required role / policy |
| --- | --- |
| `GET /me` | Any authenticated user |
| `GET /admin/system-info` | `SCOUTAI_ADMIN` |
| `GET /health`, `GET /health/ready` | Public |
| `GET /athletes/me` | Athlete (own profile) |
| `PUT /athletes/me` | Athlete role (create/update own) |
| `GET /athletes/:id` | Visibility-tiered by relationship/entitlement |
| `POST /guardians/invites` | Athlete with profile |
| `POST /guardians/invites/:id/accept` | Invited guardian |
| `POST /guardians/invites/:id/revoke` | Athlete or guardian party |
| `GET /guardians/links` | Authenticated (own links) |
| `GET /guardians/athletes` | Guardian (active links) |
| `GET /organizations/mine` | Authenticated |
| `GET /organizations/:id/roster` | Coach or org admin membership |
| `POST /organizations/:id/roster` | Org admin (or coach adding MEMBER) |
| `DELETE /organizations/:id/roster/:userId` | Org admin / coach manage policy |

## Policy Implementation Notes

1. **Server-side only.** Decisions live in `@scoutai/authorization` (`resolveAthleteProfileAccess`, roster/guardian helpers) and are enforced in Nest services.
2. **Visibility tiers.** Public → org → restricted/owner. Restricted contact fields never appear in public DTOs.
3. **Stage 4 recruiter entitlement.** Having the `RECRUITER` role grants public-field reads only. Verified recruiter + consent for contact reveal remains **Future**.
4. **Guardian links.** Athlete invites by email; target must already have `GUARDIAN` role; guardian accepts to activate; either party may revoke.
5. **Audit.** Restricted profile views and authz denials emit audit events without logging field values.

## Related Documents

- `SECURITY.md` — authentication, CSRF, rate limiting, audit logging
- `PRIVACY_MODEL.md` — data minimization and visibility principles
- `adr/ADR-004-entitlement-based-feature-access.md` — entitlement model for Restricted actions
