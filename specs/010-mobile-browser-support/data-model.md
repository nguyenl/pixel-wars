# Data Model: Mobile Browser Support

**Feature**: 010-mobile-browser-support
**Date**: 2026-03-17

## Overview

This feature introduces no new persistent data entities. All changes are to runtime input-handling state that exists only during a game session. The game state model (`GameState`, `Unit`, `Tile`, `Settlement`, etc.) is unaffected.

## Runtime State (Input Handler)

### ActivePointer

Tracks a currently active touch/pointer contact point.

| Field | Type | Description |
|-------|------|-------------|
| pointerId | number | Unique pointer identifier from PointerEvent |
| startX | number | Screen X at pointerdown |
| startY | number | Screen Y at pointerdown |
| startTime | number | Timestamp at pointerdown (ms) |
| currentX | number | Latest screen X from pointermove |
| currentY | number | Latest screen Y from pointermove |

### GestureState

Tracks the current gesture mode for the input system.

| Field | Type | Description |
|-------|------|-------------|
| mode | 'idle' \| 'pending' \| 'pan' \| 'pinch' | Current gesture mode |
| activePointers | Map<number, ActivePointer> | All active pointer contacts |
| panStartX | number | Pan offset X at drag start |
| panStartY | number | Pan offset Y at drag start |
| pinchStartDist | number | Distance between two fingers at pinch start |
| pinchStartZoom | number | Zoom level at pinch start |

### State Transitions

```
idle → pending     (pointerdown with 1 finger)
pending → pan      (pointermove exceeds TAP_DISTANCE_THRESHOLD)
pending → tap      (pointerup within TAP_DISTANCE_THRESHOLD and TAP_TIME_THRESHOLD)
pending → pinch    (second pointerdown while first active)
pan → idle         (pointerup)
pan → pinch        (second pointerdown while panning)
pinch → pan        (one finger lifts, one remains — reset drag origin)
pinch → idle       (both fingers lift)
```

## Constants

| Name | Value | Description |
|------|-------|-------------|
| TAP_DISTANCE_THRESHOLD | 10 | Max px movement for a touch to count as tap |
| TAP_TIME_THRESHOLD | 300 | Max ms duration for a touch to count as tap |
| DRAG_THRESHOLD | 4 | Existing mouse drag threshold (unchanged) |
| MIN_ZOOM | 0.5 | Existing minimum zoom (unchanged) |
| MAX_ZOOM | 2.5 | Existing maximum zoom (unchanged) |
