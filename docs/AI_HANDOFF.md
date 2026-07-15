# ScoutAI Stage 5 → Stage 6 AI Handoff

**Audience:** AI builder continuing after **Stage 5** is merged and closure-reviewed.  
**From:** Stage 5 games/stats/performance builder.  
**Date context:** 2026-07-15.

**Status:** Stage 5 **MERGED** to `main` via PR #8 (`0361399a630277204efce9a29e92563f9b5d3755` at `2026-07-15T22:57:19Z`). Final PR tip `c3e708e51e2c3e372b987b3164529a36bdd3f6bf`. Starting SHA `c397ea4f02ce2720156525329fe896aefbc7ace6`. **Do not begin Stage 6 until the Stage 5 closure report is reviewed and Stage 6 is explicitly authorized.**

## What Stage 5 Delivered

- Competition data plane: seasons, athlete-season context, games, participation
- Definition-driven statistics + query-time aggregates + safe derived metrics
- Performance testing history + personal bests (available vs verified)
- Athlete UI + public Passport performance sections
- Additive migration `20260715220000_stage5_games_stats_performance`

## What NOT to Rebuild

1. Do not collapse profile / competition / performance / verification into one table.
2. Do not let athletes self-elevate verification.
3. Do not store season totals as primary truth when game stats exist.
4. Do not overwrite historical performance results.
5. Do not reintroduce PII onto public mappers.
6. Do not weaken lint/authz/privacy/CI for green-wash.

## Suggested Stage 6 themes (not authorized)

| Area | Intent |
| --- | --- |
| Media | Secure avatar/highlight upload |
| Verification | Review queue for coach/org/ScoutAI verification |
| Recruiter | Entitlement-scoped discovery |
| Live | Viewing interface on existing Game statuses |
| AI | Labeled insights over verified competition data |
| CI maintenance | Bump Actions majors off deprecated Node 20 action runtime |

## Key files

```text
apps/api/src/seasons/
apps/api/src/games/
apps/api/src/statistics/
apps/api/src/performance/
apps/api/src/teams/
apps/web/app/app/athlete/games/
apps/web/app/app/athlete/stats/
apps/web/app/app/athlete/performance/
packages/database/prisma/migrations/20260715220000_stage5_games_stats_performance/
docs/GAMES_AND_SEASONS.md
docs/STATISTICS_ARCHITECTURE.md
docs/PERFORMANCE_TESTING.md
docs/STAGE5_COMPLETION_REPORT.md
docs/STAGE5_CLOSURE_REPORT.md
```

---

*Stage 6 is gated. Do not start until authorized.*
