# Athlete Platform (Stage 4)

## Purpose

Stage 4 delivers the **Athlete Passport foundation**: owner onboarding, section editing, completeness/publish gates, public Passport view, and guardian invite links — without becoming the full recruiting product.

## Surfaces

| Surface | Route | Audience |
| --- | --- | --- |
| Foundation dashboard | `/app` | Non-athlete authenticated users (athletes redirect) |
| Athlete dashboard | `/app/athlete/dashboard` | Athlete owners |
| Onboarding wizard | `/app/athlete/onboarding` | Athlete owners (resumable) |
| Passport editor | `/app/athlete/passport` | Athlete owners |
| Owner preview | `/app/athlete/passport/preview` | Athlete owners |
| Settings | `/app/athlete/settings` | Visibility, publish, guardian invite |
| Public Passport | `/athletes/[slug]` | Public / entitled viewers |

## API map

Authenticated owner routes under `/athletes/me/*`:

- `GET/POST /athletes/me`
- `PATCH` identity, sport, positions, physical, academic, recruiting, biography, school-team, visibility, onboarding
- `GET` onboarding, completeness
- `POST` publish, unpublish

Public: `GET /athletes/public/:slug`

Sports: `GET /sports`, `GET /sports/:code/positions`

Guardians: `POST /guardians/invites`, accept/revoke, `GET /guardians/links`

## Self-service ATHLETE role

Stage 3 `POST /auth/register` creates users with **empty roles**.  
`POST /athletes/me` grants `ATHLETE` when the user has **no roles yet**, audits `user.role.granted`, then continues profile creation. Users with conflicting roles (e.g. `RECRUITER`) remain denied.

## Completeness and publish

Publish requires: display name, primary sport, primary position, graduation year, and an explicitly set visibility. Optional checks (biography, physical) raise the completeness score but do not block publish.

## Photo / media decision

**Stage 4 defers secure media upload.** The UI uses a **placeholder avatar only** (initials). No upload endpoints, object storage, or video processing are included. Highlight/video and performance sections on the public Passport render honest empty states.

## Privacy on public Passport

Public responses never include email, date of birth, postal code, guardian emails, contact-policy private details, or password hashes. See `PRIVACY_MODEL.md` and `AUTHORIZATION_MATRIX.md`.

## Related docs

- `ATHLETE_DATA_MODEL.md` — entities and field tiers
- `STAGE4_COMPLETION_REPORT.md` — verification status
- ADR-006 — multi-sport configurable data model
