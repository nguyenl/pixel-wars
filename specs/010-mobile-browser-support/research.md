# Research: Mobile Browser Support

**Feature**: 010-mobile-browser-support
**Date**: 2026-03-17

## R1: Pointer Events vs Touch Events for Game Input

**Decision**: Use Pointer Events API as the primary input mechanism, with `touch-action: none` CSS on the canvas.

**Rationale**:
- Pointer Events unify mouse, touch, and pen input into a single event model (`pointerdown`, `pointermove`, `pointerup`).
- Supported in all target browsers (Safari iOS 13+, Chrome Android, all desktop browsers).
- Each active touch gets a unique `pointerId`, enabling multi-touch tracking for pinch-to-zoom.
- `pointerType` property allows distinguishing mouse vs touch when needed (e.g., hover only on mouse).
- Setting `touch-action: none` on the canvas tells the browser the app handles all gestures, preventing default pan/zoom/refresh behaviors.

**Alternatives considered**:
- Raw Touch Events (`touchstart`/`touchmove`/`touchend`): Would require maintaining separate mouse and touch handlers. More code, more complexity.
- Third-party gesture library (e.g., Hammer.js): Unnecessary dependency for the simple gestures needed (tap, drag, pinch). Violates Simplicity First principle.

## R2: Tap vs Drag Disambiguation

**Decision**: Use a combined distance + time threshold. A touch that moves less than 10px AND lasts less than 300ms is a tap; anything else is a drag/pan.

**Rationale**:
- The existing desktop code uses a 4px `DRAG_THRESHOLD` to distinguish click from drag. Mobile fingers have more drift, so a larger threshold (10px) is appropriate.
- Adding a time component (300ms) prevents a held-still finger from being misinterpreted — a long press should not trigger a tap.
- These thresholds are commonly used in mobile game development and match platform conventions.
- The threshold values can be tuned but these defaults provide a good starting point.

**Alternatives considered**:
- Distance-only threshold: Misses long-press scenarios.
- Time-only threshold: Misses intentional slow drags that start immediately.

## R3: Pinch-to-Zoom Implementation

**Decision**: Track two simultaneous pointer events by `pointerId`. Calculate the distance between them each frame. The ratio of current distance to initial distance determines the zoom scale factor.

**Rationale**:
- When a second pointer goes down, record initial distance between the two pointers and the initial zoom level.
- On each `pointermove` with two active pointers, compute new distance and apply `newZoom = initialZoom * (currentDistance / initialDistance)`.
- Zoom center point is the midpoint between the two fingers (same behavior as the current mouse-wheel zoom-to-cursor).
- When either pointer lifts, end pinch mode and transition to single-pointer pan (if one finger remains) or idle.

**Alternatives considered**:
- Using `gesturestart`/`gesturechange` events: Safari-only, not cross-browser.
- Computing zoom from `TouchEvent.scale`: Non-standard, inconsistent behavior.

## R4: Preventing Default Mobile Browser Behaviors

**Decision**: Apply multiple layers of defense:
1. `touch-action: none` on the canvas element (primary mechanism).
2. Update viewport meta: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">` to prevent page-level zoom.
3. Call `e.preventDefault()` on `touchmove` events on the document body to block pull-to-refresh/overscroll.
4. Apply `-webkit-touch-callout: none; -webkit-user-select: none; user-select: none` CSS to UI elements to prevent text selection and callout menus.

**Rationale**:
- `touch-action: none` is the standards-compliant way to tell browsers the app handles its own gestures.
- The viewport meta tag prevents page-level pinch zoom which would conflict with the game's own zoom.
- Pull-to-refresh requires a `touchmove` preventDefault on the document in some browsers (especially Chrome on Android).
- CSS user-select prevents long-press text selection on HUD/buttons.

**Alternatives considered**:
- `overscroll-behavior: none` CSS on body: Handles overscroll but not pull-to-refresh in all browsers. Will use as supplementary.
- JavaScript-only approach without CSS: More fragile, CSS is more reliable for these behaviors.

## R5: Status Bar Positioning for Mobile

**Decision**: Position the HUD using CSS `env(safe-area-inset-top)` to account for notches/dynamic islands. Change from `position: fixed; top: 0` to `position: fixed; top: env(safe-area-inset-top, 0px)`.

**Rationale**:
- `env(safe-area-inset-top)` is supported in Safari iOS 11.2+ and Chrome Android and automatically provides the correct offset for notches, dynamic islands, and browser chrome.
- Falls back to `0px` on browsers/devices without safe areas (desktop, non-notch phones).
- The `viewport-fit=cover` attribute must be added to the viewport meta tag for `env()` to work in Safari.
- No JavaScript calculation needed — pure CSS solution.

**Alternatives considered**:
- Fixed pixel offset: Would need per-device values, unmaintainable.
- JavaScript-based detection: Unnecessary complexity when CSS env() handles it natively.

## R6: UI Element Sizing for Touch

**Decision**: Increase minimum button/interactive element sizes to 44×44 CSS pixels (Apple HIG recommended minimum). Apply via min-height and min-width on all buttons.

**Rationale**:
- 44×44 points is Apple's Human Interface Guidelines minimum for touch targets.
- Current button sizes: End Turn button has `padding: 4px 12px` (too small), production buttons have `padding: 6px` (borderline), menu buttons have `padding: 1rem 1.5rem` (adequate).
- Increasing padding on smaller buttons ensures comfortable tapping without a complete redesign.
- Production buttons already span full width; just need height increase.

**Alternatives considered**:
- Making all buttons huge: Wastes screen space on small mobile screens.
- Different sizes per button: Inconsistent UX. A uniform minimum is simpler.

## R7: Handling Pointer-to-Touch Transition (Pinch → Pan)

**Decision**: When transitioning from two-pointer (pinch) to one-pointer (pan), reset the drag origin to the remaining pointer's current position. This prevents the map from jumping.

**Rationale**:
- Without resetting, the pan calculation would use the original drag start position, causing a sudden jump.
- Track active pointers in a Map keyed by `pointerId`. On `pointerup`, remove the lifted pointer. If one remains and was previously in pinch mode, transition to pan mode with the remaining pointer as the new drag origin.

**Alternatives considered**:
- Ignoring the remaining pointer after pinch ends: Poor UX, user expects to continue panning with one finger.
- Adding a cooldown period: Unnecessary complexity, immediate transition feels natural.
