# Research: Improve AI Behavior

**Feature**: 003-improve-ai-behavior
**Date**: 2026-03-14
**Status**: Complete — all unknowns resolved

---

## Finding 1: Root Cause of AI Not Acting

**Decision**: The AI does not move or produce units due to a phase-gate mismatch in `applyAction()`.

**Rationale**:

`applyAction()` in `src/game/state.ts` requires `state.phase === 'orders'` before it accepts any `move`, `attack`, or `produce` action. But when `endTurn()` is called, the phase transitions to `'ai'` — not back to `'orders'`. Every action the AI generates is therefore silently rejected by the dispatcher. The AI's internal `applyActionSafe()` swallows the error and moves on, making the failure invisible.

**Affected locations**:

| File | Lines | Issue |
|------|-------|-------|
| `src/game/state.ts` | ~97, ~106, ~115 | Phase gate: `phase !== 'orders'` rejects all AI actions |
| `src/game/ai/ai.ts` | ~234–240, ~271–276 | `applyActionSafe()` silently swallows validation errors |
| `src/main.ts` | ~76–84 | AI action loop ignores error returns from `applyAction()` |

**Alternatives considered**:

| Option | Verdict |
|--------|---------|
| **A — Widen phase gate in `applyAction()`**: Allow `move`/`attack`/`produce` during both `'orders'` and `'ai'` phases | ✅ Selected — minimal change, no restructuring |
| **B — Set phase to `'orders'` for AI turn**: Give the AI an 'orders' phase identical to the human's | Discarded — the `'ai'` phase is used by `main.ts` to detect when to invoke `computeTurn()`; changing it would require coordinating multiple conditionals |
| **C — Bypass `applyAction()` for AI**: Have AI mutate state directly | Discarded — violates the pure functional design; breaks invariants |

---

## Finding 2: `applyActionSafe()` Masks Errors

**Decision**: Add error logging inside `applyActionSafe()` in `src/game/ai/ai.ts` (dev/debug mode only) so that action failures surface during development rather than being swallowed.

**Rationale**: The bug persisted silently because failures produced no output. Adding a `console.warn` guard (stripped in production) makes future regressions immediately visible.

**Alternatives considered**: Throwing exceptions on AI action failure was discarded because the AI is designed to try-and-skip invalid actions (e.g., a unit that was destroyed mid-turn by a prior action). Silent skipping of *invalid* actions is intentional; only *unexpected* failures should be flagged.

---

## Finding 3: Action Loop in `main.ts` Has No Error Handling

**Decision**: Add a `console.error` on failed AI actions in `main.ts` so the game loop surfaces unexpected rejections in the browser console.

**Rationale**: The `if (result.ok)` branch silently does nothing on failure. This is a reasonable defensive pattern, but without any logging it makes debugging impossible.

---

## Finding 4: Production and Movement Logic Is Otherwise Correct

**Decision**: No changes needed to `src/game/ai/ai.ts` logic itself (objective scoring, production priority, pathfinding calls). Once the phase gate is fixed, the existing logic should execute correctly.

**Rationale**: The exploration confirmed that `buildObjectives()`, `decideUnitActions()`, and production selection logic all look structurally correct. The only reason they produce no output is that every generated action is rejected before it can be applied.

**Caveat**: After fixing the phase gate, integration tests should verify that the AI actually moves to the correct tiles and produces the expected unit types. Latent bugs in the logic may surface once actions can actually be applied.

---

## Finding 5: Test Coverage Is Missing for AI Module

**Decision**: New unit tests must be written for `src/game/ai/ai.ts` and `src/game/ai/scoring.ts` before the fix is merged (per Constitution Principle II).

**Rationale**: There are currently no tests covering the AI's `computeTurn()` function or its action generation. The phase gate bug would have been caught immediately if a test verified that `computeTurn()` returns non-empty actions and that those actions apply successfully.

**Tests to add**:
1. `computeTurn()` returns at least one `move` action when the AI has a unit with movement points
2. `computeTurn()` returns at least one `produce` action when the AI has funds and an idle city
3. All actions returned by `computeTurn()` apply successfully via `applyAction()`
4. After applying all AI actions, `state.currentPlayer` units have moved from their starting positions
