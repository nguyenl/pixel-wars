# Quickstart: Remove Grid Lines

## What Changed

Removed 1-pixel grid lines between tiles on the game map by changing rectangle dimensions from `tileSize - 1` to `tileSize` in the tile renderer.

## File Modified

- `src/renderer/tilemap.ts` — Changed all `tileSize - 1` occurrences to `tileSize` in `renderTiles` and `renderHighlights` methods.
- `src/renderer/fog.ts` — Changed all `tileSize - 1` occurrences to `tileSize` in the fog overlay `render` method (hidden and explored tiles).

## How to Verify

1. Run `npm run dev` to start the game locally
2. Observe the map — tiles should render edge-to-edge with no visible gaps
3. Select a unit and verify movement/attack highlights also have no gaps
4. Hover over highlighted tiles and verify hover highlights have no gaps

## Tests

Run `npm test` to confirm no regressions. This is a visual-only change; no new unit tests are needed.
