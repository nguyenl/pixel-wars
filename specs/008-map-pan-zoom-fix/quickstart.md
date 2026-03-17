# Quickstart: Verifying Map Pan/Zoom & Ghost UI Fix

**Feature**: 008-map-pan-zoom-fix
**Date**: 2026-03-16

---

## Setup

```bash
cd /home/lnguyen/git/pixel-wars
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Verifying the Ghost Panel Fix

1. Start a game on any map size.
2. Play until one player wins (or let AI win quickly by doing nothing).
3. On the victory screen, click **Return to Main Menu**.
4. On the main menu, click any map size to start a new game.
5. **Expected**: The top info panel shows only the current game's turn/funds. No faint remnant of the previous game's panel is visible.

**What to look for**: Two overlapping HUD bars would be visible as a slightly brighter/doubled text strip at the top. After the fix, there is only one.

---

## Verifying Pan

1. Start a game with **Large** map (40×40 tiles = 1280×1280 pixels at 1× zoom).
2. If your browser window is smaller than 1280×1280, the map extends beyond the viewport.
3. Click and drag on the map canvas.
4. **Expected**: The map scrolls in the direction of the drag. Tiles that were off-screen become visible.
5. Drag toward a corner until the map edge is reached.
6. **Expected**: The map stops — you cannot drag past the map boundary or see blank space.
7. Click a unit (without dragging). **Expected**: Unit is selected normally — panning does not break tile selection.

---

## Verifying Zoom

1. Hover over the map canvas.
2. Scroll the mouse wheel **up** (zoom in).
3. **Expected**: Tiles grow larger; the world point under the cursor stays fixed.
4. Scroll the mouse wheel **down** (zoom out).
5. **Expected**: Tiles shrink; more of the map becomes visible.
6. Zoom out repeatedly until the zoom limit is hit.
7. **Expected**: The map stops shrinking — minimum zoom (0.5×) enforced.
8. Zoom in repeatedly.
9. **Expected**: The map stops growing at maximum zoom (2.5×).
10. At any zoom level, click a tile. **Expected**: The correct tile is selected — no click-target misalignment.

---

## Running Tests

```bash
npm test
```

All existing tests should continue to pass. New tests for viewport clamping and coordinate transformation will be added in the implementation.

---

## Common Issues

| Symptom | Likely cause |
|---------|-------------|
| Ghost panel still visible | `GameRenderer.destroy()` not calling `uiRenderer.destroy()` |
| Clicking wrong tile after zoom | Zoom not applied in coordinate transform in input.ts |
| Map flies off screen when panning | Clamping not applied after pan delta |
| Click events trigger while dragging | `isDragging()` check missing at start of click handler |
| Pan resets to center on render | `initViewport()` being called inside the render loop |
