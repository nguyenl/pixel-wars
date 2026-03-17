# Implementation Plan: Mobile Browser Support

**Branch**: `010-mobile-browser-support` | **Date**: 2026-03-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-mobile-browser-support/spec.md`

## Summary

Add full touch input support to Pixel Wars so the game is playable on mobile browsers. This involves: (1) converting mouse-only event handling to unified pointer/touch events for tap, drag-to-pan, and pinch-to-zoom; (2) repositioning the HUD status bar to account for mobile browser chrome and safe-area insets; (3) sizing UI elements for comfortable touch targets; (4) preventing default mobile browser gestures that conflict with gameplay.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: pixi.js 8.x, @pixi/tilemap 4.x, simplex-noise 4.x
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x
**Target Platform**: Modern mobile browsers (Safari iOS 15+, Chrome Android 10+) and desktop browsers
**Project Type**: Browser-based game (static files, GitHub Pages)
**Performance Goals**: 60 fps touch response, gesture recognition within one frame
**Constraints**: No backend, static-only hosting, must not break existing desktop mouse input
**Scale/Scope**: Single-player game, ~10 source files affected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Using browser-native Pointer Events API — no new dependencies. Unified pointer events replace separate mouse+touch handlers, reducing code rather than adding complexity. |
| II. Test-First Development | PASS | Gesture recognition logic (tap vs drag threshold, pinch distance calculation) will be pure functions testable with Vitest. DOM/touch simulation tests are out of scope (manual testing on devices). |
| III. Vertical Slice Delivery | PASS | Feature decomposes into independently testable slices: (1) touch input for tap/select/move, (2) touch pan/zoom, (3) status bar repositioning, (4) UI sizing, (5) browser gesture suppression. |
| IV. Single-Player First | PASS | No multiplayer implications. Input handling changes are presentation-layer only. |
| V. Browser-Only Execution | PASS | All changes are client-side. No server, no new network requests. Deployable as static files. |

## Project Structure

### Documentation (this feature)

```text
specs/010-mobile-browser-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── input/
│   └── input.ts          # MODIFY: Convert click/mousemove to pointer events, add touch-tap detection
├── renderer/
│   ├── renderer.ts       # MODIFY: Convert pan/zoom from mouse to pointer/touch events, add pinch-to-zoom
│   ├── ui.ts             # MODIFY: Reposition HUD, increase tap targets, add touch-action CSS
│   └── viewport.ts       # NO CHANGE: Pure math, already correct
index.html                # MODIFY: Update viewport meta tag to prevent page scaling

tests/
├── viewport.test.ts      # NO CHANGE
└── gesture.test.ts       # NEW: Unit tests for tap/drag threshold logic and pinch distance calculation
```

**Structure Decision**: No new directories or architectural changes needed. All modifications are within existing files. One new test file for gesture math utilities.

## Complexity Tracking

No constitution violations. No complexity tracking entries needed.
