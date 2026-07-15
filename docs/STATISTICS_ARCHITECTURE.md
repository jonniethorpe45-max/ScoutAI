# Statistics Architecture (Stage 5)

## Design

Statistics are **definition-driven**, not one column per football metric.

| Entity | Role |
| --- | --- |
| `StatisticDefinition` | Catalog row (code, type, aggregation, category) |
| `AthleteGameStatistic` | One value per participation × definition |

## Source and verification

- Writes from athlete APIs always set `sourceType=SELF_REPORTED` and `verificationStatus=UNVERIFIED`.
- Athletes **cannot** set coach/org/ScoutAI verified statuses (`canSetVerificationStatus` denies Stage 5 athlete APIs).
- Provenance fields exist for future verification review queues.

## Aggregation approach (decision)

**Query-time aggregation** from PostgreSQL game-level rows.

- Game statistics are the system of record.
- Season totals are derived via each definition’s `aggregationType` (`SUM`, `AVERAGE`, `MAX`, `MIN`, `LATEST`).
- `DERIVED` definitions are never stored as entered values.

Rationale: simplest reliable architecture at current scale; no stale materialized cache.

## Derived metrics (safe set)

| Code | Formula |
| --- | --- |
| `COMPLETION_PERCENTAGE` | `PASS_COMPLETIONS / PASS_ATTEMPTS * 100` |
| `YARDS_PER_CARRY` | `RUSHING_YARDS / RUSH_ATTEMPTS` |
| `YARDS_PER_RECEPTION` | `RECEIVING_YARDS / RECEPTIONS` |

Division by zero returns `null`. Derived rows are labeled in API responses (`derived: true`).

## Validation

- Definition must belong to the game’s sport.
- Derived codes rejected on write.
- Negative values rejected in Stage 5.
- Position-aware UI groups are **guidance only** — not authorization.

## Football seed catalog

See `packages/database/prisma/stage5-catalog.ts` (passing, rushing, receiving, defense, kicking, punting, returns + derived).
