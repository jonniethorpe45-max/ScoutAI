# Athlete Data Model (Stage 4)

## Core entities

| Entity | Purpose |
| --- | --- |
| `Athlete` | Passport identity, slug, visibility, onboarding stage, status |
| `Sport` / `Position` | Configurable multi-sport catalog |
| `AthleteSport` | Athlete ↔ sport membership (primary flag) |
| `AthletePosition` | Athlete ↔ position for a sport (primary + order) |
| `AthletePhysicalProfile` | Height / weight |
| `AthleteAcademicProfile` | School, graduation year, GPA, major |
| `AthleteRecruitingProfile` | Recruiting/commitment status, regions, contact policy |
| `GuardianRelationship` | Invite / accept / revoke links |

Migrations live under `packages/database/prisma/`.

## Field visibility tiers

| Tier | Examples | Exposed where |
| --- | --- | --- |
| Owner | DOB, postal code, contact policy, full recruiting prefs | `AthleteOwnerView` (`GET /athletes/me`) |
| Public | Display name, sport/position, school/team reported, height/weight, graduation year, recruiting summary | `AthletePublicView` |
| Never | Email, password hash, guardian emails, DOB on public | Omitted from public mappers |

## Onboarding stages

`ACCOUNT_READY` → `IDENTITY` → `SPORT` → `ACADEMIC` → `RECRUITING` → `VISIBILITY` → `COMPLETE`

The web wizard adds finer steps (position, school/team, physical) that map onto these API stages via PATCH endpoints.

## Profile status vs visibility

- **Status** (`DRAFT` / `PUBLISHED` / …): whether the Passport is published.
- **Visibility** (`PRIVATE` / `CONNECTIONS` / `PUBLIC`): who may view a published Passport.

Both are required for a coherent public surface: publish without visibility set is blocked by completeness.

## Slug

Generated from name + short suffix (`taylor-scout-a1b2`). Unique; used as the public URL key.

## Minor policy note

Minor status is derived from DOB using `MINOR_AGE_THRESHOLD_YEARS` (18). **LEGAL REVIEW REQUIRED** before production enforcement. Onboarding returns `minorPolicyNote` for transparency.

## Deferred

- Secure photo/video media objects
- Verified stats / performance metrics
- Org-linked school/team resolution beyond reported text + optional `organizationId`
- Recruiter entitlements beyond authenticated `CONNECTIONS` viewers
