# Data Model: Improve AI Behavior

**Feature**: 003-improve-ai-behavior
**Date**: 2026-03-14

---

## Overview

This feature introduces no new entities, no new persistent state, and no schema changes. The fix is entirely within the game's action-validation and phase-transition logic. All game entities (`GameState`, `Unit`, `Settlement`, `Player`, `Action`) remain structurally unchanged.

---

## Existing Entities Involved

### GamePhase (enum)

The `phase` field on `GameState` currently accepts: `'income'` | `'orders'` | `'ai'` | `'victory'`.

**Change**: No structural change. The semantic meaning of `'ai'` phase is clarified: it is the phase during which the AI player executes its turn. Action validators must accept `move`, `attack`, and `produce` actions during this phase (in addition to `'orders'`).

### Action (discriminated union)

Actions currently include: `move`, `attack`, `produce`, `end-turn`.

**Change**: No structural change. The set of actions the AI generates remains the same; the fix is that these actions are no longer incorrectly rejected by the dispatcher.

### Objective (AI-internal concept)

An ephemeral, per-turn data structure computed inside `computeTurn()`. Not persisted in `GameState`.

**Fields**:
- `type`: `'enemy-unit'` | `'settlement'` | `'explore'`
- `position`: `{ q, r }` hex coordinates
- `id`: entity ID (unit ID or settlement ID)

**Change**: No change. This is already implemented in `src/game/ai/ai.ts`.

---

## State Transitions

The phase state machine is unchanged:

```
income → orders → ai → (back to income on next turn)
                    ↓
                 victory (if game ends)
```

The only change: `applyAction()` now accepts `move`, `attack`, and `produce` actions during **both** `'orders'` and `'ai'` phases, gating on `state.currentPlayer` to ensure only the current player can act.
