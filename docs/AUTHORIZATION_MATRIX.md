# ScoutAI Authorization Matrix

**Stage 3 foundation.** This matrix defines server-side authorization intent for the modular monolith (`apps/api`). Front-end route visibility is not an access-control boundary.

## Legend

| Symbol | Meaning |
| --- | --- |
| **Allow** | Action permitted when authenticated and policy preconditions are met |
| **Deny** | Action not permitted for this role |
| **Own** | Permitted only for the actor's own resource or account |
| **Restricted** | Permitted only under explicit relationship, entitlement, or admin policy |
| **Future** | Not implemented in Stage 3; reserved capability |

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
| View another user's account | **Deny** | **Restricted** (linked athletes only, **Future**) | **Restricted** (entitled profiles, **Future**) | **Restricted** (roster/org scope, **Future**) | **Restricted** (org members, **Future**) | **Allow** (**Future**) |
| Create athlete profile | **Own** | **Deny** (linked-minor create later) | **Deny** | **Deny** | **Deny** | **Allow** |
| Edit own athlete Passport | **Own** | **Restricted** (linked, partial later) | **Deny** | **Deny** | **Deny** | **Allow** |
| Publish / unpublish Passport | **Own** | **Deny** (later) | **Deny** | **Deny** | **Deny** | **Allow** |
| View athlete public profile | **Own** | **Restricted** (linked) | **Restricted** (published + visibility) | **Restricted** (published + visibility) | **Restricted** (published + visibility) | **Allow** |
| View athlete restricted contact info | **Own** | **Restricted** (linked) | **Restricted** (entitlement + consent, **Future**) | **Restricted** (org policy, **Future**) | **Restricted** (org policy, **Future**) | **Restricted** (audit-logged, **Future**) |
| Manage guardian–athlete link | **Own** (invite/revoke) | **Restricted** (accept own invite) | **Deny** | **Deny** | **Deny** | **Allow** |
| Verify recruiter identity | **Deny** | **Deny** | **Deny** | **Deny** | **Deny** | **Future** |
| Read recruiter private notes | **Deny** | **Deny** | **Owner only** | **Deny** | **Deny** | **Restricted** (support/legal, **Future**) |
| Write recruiter private notes | **Deny** | **Deny** | **Owner only** (**Future**) | **Deny** | **Deny** | **Deny** |
| View organization roster | **Deny** | **Deny** | **Restricted** (entitled, **Future**) | **Restricted** (assigned teams, **Future**) | **Restricted** (own org, **Future**) | **Allow** (**Future**) |
| Manage organization settings | **Deny** | **Deny** | **Deny** | **Restricted** (delegated, **Future**) | **Restricted** (own org, **Future**) | **Allow** (**Future**) |
| Assign org roles (coach, admin) | **Deny** | **Deny** | **Deny** | **Deny** | **Restricted** (own org, **Future**) | **Allow** (**Future**) |
| Enqueue background jobs (system) | **Deny** | **Deny** | **Deny** | **Deny** | **Deny** | **Allow** (internal/smoke, Stage 3) |
| View audit log | **Deny** | **Deny** | **Deny** | **Deny** | **Restricted** (org scope, **Future**) | **Allow** (**Future**) |
| Export own data | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) |
| Request account deletion | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Own** (**Future**) | **Restricted** (**Future**) |

## Stage 3 Implemented Endpoints

Stage 3 enforces authorization for:

| Endpoint | Required role / policy |
| --- | --- |
| `GET /me` | Any authenticated user |
| `PATCH /me` | Any authenticated user (own account fields only) |
| `GET /admin/system-info` | `SCOUTAI_ADMIN` |
| `GET /health` | Public |
| `GET /ready` | Public (reports dependency readiness) |

## Stage 4 Implemented Endpoints

| Endpoint | Required role / policy |
| --- | --- |
| `POST /athletes/me` | `ATHLETE` or ScoutAI Admin; **or** user with empty roles (auto-grants `ATHLETE`) |
| `GET /athletes/me` + owner PATCHes | Owner (or admin) |
| `POST /athletes/me/publish` | Owner athlete (completeness gate) |
| `GET /athletes/public/:slug` | Published + visibility policy (owner/guardian/admin bypass) |
| `GET /sports`, `GET /sports/:code/positions` | Public |
| Guardian invite/accept/revoke/links | Athlete owner invite/revoke; invited guardian accept |

Rows still marked **Future** elsewhere remain architectural placeholders.

## Policy Implementation Notes

1. **Server-side only.** Every Allow/Restricted decision is enforced in `apps/api` via the authorization package (`packages/auth` or equivalent). UI components may hide controls but must not be relied upon for security.

2. **Owner only (recruiter private notes).** Notes are keyed to the creating recruiter's user ID. No shared team inbox, org-wide note pool, or cross-recruiter read access in the baseline model. Delegation requires an explicit future ADR.

3. **Restricted contact info.** Email, phone, address, and guardian contact channels are separate fields from public profile display. Access requires relationship proof (guardian link, org membership, recruiter entitlement) and is audit-logged when read.

4. **Verify recruiter (Future).** Verification is a ScoutAI Admin workflow producing a durable `verifiedAt` / `verifiedBy` record. Unverified recruiters may have reduced entitlements (e.g., no restricted contact read).

5. **Minor athletes.** Guardian-linked accounts inherit additional restrictions: recruiters and coaches cannot access restricted fields without entitlement + applicable consent flags (**Future**).

6. **ScoutAI Admin.** Elevated access is narrow by default. Bulk export, impersonation, and cross-tenant reads require separate policies and audit events (**Future**).

## Related Documents

- `SECURITY.md` — authentication, CSRF, rate limiting, audit logging
- `PRIVACY_MODEL.md` — data minimization and visibility principles
- `adr/ADR-004-entitlement-based-feature-access.md` — entitlement model for Restricted actions
