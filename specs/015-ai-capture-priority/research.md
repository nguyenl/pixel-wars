# Research: AI Settlement Capture Prioritization

**Branch**: `015-ai-capture-priority` | **Date**: 2026-03-19

## Root Cause Analysis

### Finding 1 — Move scoring does not reward landing on a settlement

**File**: `src/game/ai/movegen.ts` (lines 78–91)

The move-candidate scoring formula is:

```
orderScore = 1000 + bestObjScore

where bestObjScore = max(utility * (distBefore - distAfter)) for all objectives
```

For a unit adjacent to a settlement (Chebyshev distance = 1), moving onto it gives:

```
distBefore = 1, distAfter = 0 → improvement = 1
utility ≈ 7 (infantry adjacent to a town, low threat)
bestObjScore ≈ 7
orderScore ≈ 1007
```

For a unit 3 tiles away from a settlement that can move 2 steps closer:

```
distBefore = 3, distAfter = 1 → improvement = 2
distanceScore = 1/3 ≈ 0.33, utility ≈ 5.4
bestObjScore ≈ 10.8
orderScore ≈ 1011
```

Result: a unit already adjacent to a capturable settlement scores *lower* for the capture move than a distant unit scoring an approach move, because `distanceScore` uses `1/dist` which shrinks as the unit gets closer. **An adjacent unit gets less reward, not more, for the final approach step.**

Exploration moves score similarly (~1000–1020). There is nothing to distinguish "I can capture this settlement right now" from any other movement.

### Finding 2 — Mid-capture hold position scores 0

**File**: `src/game/ai/movegen.ts` (lines 100–105)

```typescript
// --- Hold position (always included as baseline) ---
candidates.push({
  action: { type: 'move', unitId, path: [] },
  unitId,
  orderScore: 0,
});
```

If a unit is already on a settlement (turn 1 of a 2-turn capture complete), the hold-in-place action scores 0. Movement candidates toward enemies or exploration targets score ~1000+. The alpha-beta search will therefore prefer moving the unit away, abandoning the capture in progress.

### Finding 3 — Settlement objectives *are* built correctly

**File**: `src/game/ai/objectives.ts` (lines 74–85)

Settlements where `owner !== AI_PLAYER` are always included as objectives in both expansion and offensive phases. The objective infrastructure is correct. The bug is purely in how move-candidate scores are assigned, not in whether settlements are considered at all.

### Finding 4 — Greedy fallback handles mid-capture correctly (partial)

**File**: `src/game/ai/ai.ts` (lines 147–183, `decideUnitActions`)

In the greedy fallback, a unit on a settlement has `distBefore = 0` to that settlement. The loop condition `if (dist < bestDist)` (i.e., `dist < 0`) is never true, so no movement is generated. The unit stays. However, the greedy fallback is only used when the alpha-beta search time budget is exhausted — the primary path uses the search, which does have the scoring bug.

### Finding 5 — No existing duplicate-capture guard in search path

**File**: `src/game/ai/movegen.ts`

Move candidates are generated per-unit independently. Two AI units adjacent to the same settlement will both receive a capture bonus for that settlement. The greedy fallback prevents this via `claimedObjectives`, but the search path has no such coordination.

The simplest fix without redesigning the search: detect in `movegen.ts` whether a settlement already has an AI unit actively capturing it (`captureProgress > 0 && capturingUnit === AI unit`), and skip the capture bonus for other units targeting that same tile.

---

## Design Decisions

### Decision 1: Fix scoring in `movegen.ts` rather than in `objectives.ts` or `scoring.ts`

**Chosen**: Add an immediate-capture bonus directly in `movegen.ts` at the point where a move's destination is known.

**Rationale**: The fix needs access to the specific destination tile (to check `settlementId`), which is only available in the move-candidate loop. `scoring.ts::computeUtility` only has the objective's tile coordinate, not the move's specific destination. `objectives.ts::buildObjectives` only builds the objective list, not per-move scores.

**Alternatives rejected**:
- Adding settlement-proximity bonus to `computeUtility`: would require passing the unit's current position and all reachable tiles, making the API complex.
- Adding a new objective type `immediate-capture`: would work but adds a new concept when a score constant in `movegen.ts` is sufficient.

### Decision 2: Capture bonus = 4000; hold-capture bonus = 8000

**Chosen**: `CAPTURE_BONUS = 4000`, `MID_CAPTURE_HOLD_SCORE = 8000`

**Rationale**:
- Non-lethal attacks score `5000 + (damageAdvantage * 100)`. For zero damage advantage, that's 5000. We want capture to lose only to genuinely good attacks, so 4000 is just below attack priority.
- Kill shots score `10000 + productionCost`. Hold-capture at 8000 is below kill shots (the AI should abandon a mid-capture only to take a kill shot, which is reasonable) but above non-lethal attacks (5000), ensuring the unit stays to complete a started capture unless it can kill an enemy outright.
- Exploration scores ~1000. Repositioning scores ~1000–1020. Both are far below 4000.

**Alternatives rejected**:
- Bonus of 2000: still below non-lethal attacks (5000), but might not survive future scoring changes.
- Bonus of 6000 (above attacks): would cause AI to ignore favorable combat in favor of capture, which is not always optimal.

### Decision 3: Duplicate-capture guard via `captureProgress` check

**Chosen**: In `movegen.ts`, when computing the capture bonus for a destination settlement, check if `settlement.captureProgress > 0 && settlement.capturingUnit !== null`. If the capturing unit belongs to the AI, skip the bonus for other units (their best action will be something else anyway).

**Rationale**: Minimal change, no new data structures. The `capturingUnit` field already exists on `Settlement` and contains the unit ID of the occupying unit.

**Alternatives rejected**:
- Cross-unit coordination in search: would require the search to track claimed settlements across unit decisions, significantly increasing complexity.
- Separate objective type `already-being-captured`: increases complexity in `objectives.ts` and `scoring.ts`.

---

## Affected Files

| File | Change Type | Description |
|------|-------------|-------------|
| `src/game/ai/movegen.ts` | Modify | Add `CAPTURE_BONUS` and `MID_CAPTURE_HOLD_SCORE` constants; apply bonuses in move-candidate and hold-position logic |
| `tests/game/ai/movegen.test.ts` | New/extend | Unit tests for adjacent capture, mid-capture hold, duplicate capture guard |

No other files change. No new dependencies. No schema changes.
