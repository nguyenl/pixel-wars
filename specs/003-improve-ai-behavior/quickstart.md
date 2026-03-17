# Quickstart: Testing AI Behavior

**Feature**: 003-improve-ai-behavior

---

## Prerequisites

- Node.js installed (`node --version`)
- Dependencies installed: `npm install`

---

## Run Unit Tests

```bash
npm test
```

The AI-specific tests live in `tests/ai.test.ts`. They verify that `computeTurn()` generates valid, applicable actions.

To run only AI tests:

```bash
npx vitest run tests/ai.test.ts
```

---

## Manual Testing in Browser

```bash
npm run dev
```

Open the URL shown in the terminal. Start a new game and press **End Turn** without doing anything. Observe:

1. The AI's unit(s) move to new tiles (visible animation).
2. After 2–3 turns, new AI units appear on the map from its cities.
3. If you leave your units exposed, the AI attacks them.
4. After 5+ turns, AI-owned settlements should appear on the map.

---

## Verifying the Fix (Before vs After)

**Before fix**: Pressing End Turn repeatedly results in AI units staying in place forever. No new units appear.

**After fix**: AI units move every turn. New units are produced within 3 turns. A passive player loses within 30 turns.

---

## Checking the Browser Console

Open DevTools → Console. If any AI action is unexpectedly rejected, a warning will appear:

```
[AI] Action rejected: { type: 'move', ... } → { error: '...', message: '...' }
```

No warnings should appear during normal gameplay after the fix.
