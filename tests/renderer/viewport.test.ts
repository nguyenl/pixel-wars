import { describe, it, expect } from 'vitest';
import { clampPan, screenToTile } from '../../src/renderer/viewport';

// ---------------------------------------------------------------------------
// clampPan
// ---------------------------------------------------------------------------

describe('clampPan', () => {
  const TILE = 32;

  it('centers the map when it fits in the canvas', () => {
    // 5×5 map = 160×160 px; canvas 640×480
    const result = clampPan(0, 0, 1, 640, 480, 5, 5, TILE);
    expect(result.x).toBe((640 - 160) / 2); // 240
    expect(result.y).toBe((480 - 160) / 2); // 160
  });

  it('clamps panX to 0 when map is wider than canvas and pan goes positive', () => {
    // 30×5 map = 960×160 px; canvas 640×320 — map is wider, panX must be ≤ 0
    const result = clampPan(100, 0, 1, 640, 320, 30, 5, TILE);
    expect(result.x).toBe(0);
  });

  it('clamps panX to canvasW - mapPixelW when map is wider and pan goes too negative', () => {
    // 30×5 map = 960 px wide; canvas 640 — minimum panX = 640 - 960 = -320
    const result = clampPan(-400, 0, 1, 640, 320, 30, 5, TILE);
    expect(result.x).toBe(640 - 960); // -320
  });

  it('allows panX within valid range when map is wider than canvas', () => {
    const result = clampPan(-200, 0, 1, 640, 320, 30, 5, TILE);
    expect(result.x).toBe(-200);
  });

  it('clamps panY to 0 when map is taller than canvas and pan goes positive', () => {
    // 5×30 map = 160×960 px; canvas 640×480 — map is taller, panY must be ≤ 0
    const result = clampPan(0, 50, 1, 640, 480, 5, 30, TILE);
    expect(result.y).toBe(0);
  });

  it('clamps panY to canvasH - mapPixelH when map is taller and pan too negative', () => {
    const result = clampPan(0, -600, 1, 640, 480, 5, 30, TILE);
    expect(result.y).toBe(480 - 960); // -480
  });

  it('accounts for zoom when computing map pixel dimensions', () => {
    // 5×5 map at zoom=2: 160*2=320 px; canvas 640×480 — still fits, centers at 160, 80
    const result = clampPan(0, 0, 2, 640, 480, 5, 5, TILE);
    expect(result.x).toBe((640 - 320) / 2); // 160
    expect(result.y).toBe((480 - 320) / 2); // 80
  });

  it('clamps when zoomed-in map overflows canvas', () => {
    // 5×5 map at zoom=4: 640×640 px; canvas 640×480 — width just fits, height overflows
    const result = clampPan(0, 100, 4, 640, 480, 5, 5, TILE);
    // width 640 = canvasW exactly — fits → center x = 0
    expect(result.x).toBe(0);
    // height 640 > 480 — panY 100 clamped to 0
    expect(result.y).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// screenToTile
// ---------------------------------------------------------------------------

describe('screenToTile', () => {
  const TILE = 32;
  const COLS = 10;
  const ROWS = 10;

  it('returns tile 0,0 for center of first tile at 1× zoom, no pan', () => {
    const result = screenToTile(16, 16, 0, 0, 1, TILE, COLS, ROWS);
    expect(result).toEqual({ row: 0, col: 0 });
  });

  it('returns correct tile when pan offset is applied', () => {
    // pan shifts world origin to (100, 80) on screen; center of tile 0,0 is at screen (116, 96)
    const result = screenToTile(116, 96, 100, 80, 1, TILE, COLS, ROWS);
    expect(result).toEqual({ row: 0, col: 0 });
  });

  it('returns correct tile at 2× zoom', () => {
    // At zoom=2 tile (1,1) occupies world [32,64)×[32,64) → screen [64,128)×[64,128) (panX=0)
    // Center of tile (1,1) in world: (48, 48) → screen (96, 96)
    const result = screenToTile(96, 96, 0, 0, 2, TILE, COLS, ROWS);
    expect(result).toEqual({ row: 1, col: 1 });
  });

  it('returns null for a point outside the map (negative world coords)', () => {
    const result = screenToTile(-1, 16, 0, 0, 1, TILE, COLS, ROWS);
    expect(result).toBeNull();
  });

  it('returns null for a point outside the map (beyond map width)', () => {
    // Right edge of map at world x = COLS*TILE = 320; screen x = 320 at zoom=1, pan=0 → out of bounds
    const result = screenToTile(COLS * TILE, 16, 0, 0, 1, TILE, COLS, ROWS);
    expect(result).toBeNull();
  });

  it('returns valid tile for point one pixel inside the right map boundary', () => {
    // screen x = COLS*TILE - 1 = 319 → worldX = 319 → col = floor(319/32) = 9 (last valid col)
    const result = screenToTile(COLS * TILE - 1, 16, 0, 0, 1, TILE, COLS, ROWS);
    expect(result).toEqual({ row: 0, col: COLS - 1 });
  });

  it('returns null for a point outside the map (beyond map height)', () => {
    const result = screenToTile(16, ROWS * TILE, 0, 0, 1, TILE, COLS, ROWS);
    expect(result).toBeNull();
  });
});
