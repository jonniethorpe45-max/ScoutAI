# Games and Seasons (Stage 5)

## Purpose

Stage 5 introduces **competition context** separate from Stage 4 profile fields (school/team text on the Passport).

## Models

| Entity | Role |
| --- | --- |
| `Season` | Sport-scoped season catalog (name, year, status, optional dates) |
| `AthleteSeason` | Athlete’s historical team context for a season |
| `Team` | Optional lightweight team entity for future Live/org linking |
| `Game` | Canonical contest; Live-ready statuses without streaming |
| `AthleteGameParticipation` | Explicit participation (roster ≠ played) |

## AthleteSeason decision

Stage 4 stores `schoolNameReported` / `teamNameReported` on the current profile only. Stage 5 uses **`AthleteSeason.selfReportedTeamName`** (and optional `organizationId` / `teamId`) so historical games keep the team context from that season. Self-reported names are **not** converted into verified organizations.

## Duplicate games

Soft detection only: same season + matchup (home/away interchangeable) + scheduled start within ±12 hours returns `duplicateWarning` + `possibleDuplicates`. Creation is **not** blocked; rematches remain allowed. No brittle global uniqueness constraint.

## Game ownership

Athletes create games in their own context (`createdByUserId`). Cross-athlete reads/writes of owner endpoints return 404/403. Participation is explicit via `AthleteGameParticipation`.

## Correction / deletion

- Self-reported game fields may be updated by the owner.
- Self-reported unverified statistics may be upserted or deleted.
- Verified rows are not silently overwritten by athlete APIs (Stage 5 never elevates verification).

## Future ScoutAI Live

`GameStatus` includes `PRE_GAME`, `LIVE`, `DELAYED`, etc. Stage 5 does not stream or process live video.
