# Performance Testing (Stage 5)

## Models

| Entity | Role |
| --- | --- |
| `PerformanceTestDefinition` | Catalog (code, measurement type, unit, lowerIsBetter) |
| `PerformanceTestResult` | Historical result rows (never overwrite on “better” entry) |

## Football seed tests

- `FORTY_YARD_DASH`, `TEN_YARD_SPLIT`, `TWENTY_YARD_SHUTTLE`, `THREE_CONE_DRILL`
- `VERTICAL_JUMP`, `BROAD_JUMP`
- `BENCH_PRESS_REPS`

Canonical units: seconds, centimeters, integer reps. UI may display U.S. customary labels later.

## Personal bests

Deterministic:

- `lowerIsBetter=true` → minimum numeric value
- else → maximum

API distinguishes:

- **bestAvailable** — all retained results
- **bestVerified** — `verificationStatus=VERIFIED` only (null when none)

Self-reported bests are never labeled as verified.

## Progress

Chronological history is returned as entered. Stage 5 does **not** use AI to interpret progress.

## Correction

Athletes may add new historical results. Stage 5 does not implement a full verified-result lock UI; architecture preserves provenance for future locking.
