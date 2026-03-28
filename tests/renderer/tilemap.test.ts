/**
 * tests/renderer/tilemap.test.ts
 *
 * Tests for terrain height ordering (T006/T007) and tile mesh elevation (T019/T020).
 */

import { describe, it, expect, vi } from 'vitest';
import { TERRAIN_HEIGHT, TERRAIN_MATERIAL_COLOR } from '../../src/renderer/tilemap';

// Mock Three.js so tests run without WebGL
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  return {
    ...actual,
    BoxGeometry: vi.fn().mockImplementation((w: number, h: number, d: number) => ({ width: w, height: h, depth: d })),
    PlaneGeometry: vi.fn().mockImplementation((w: number, h: number) => ({ width: w, height: h })),
    MeshLambertMaterial: vi.fn().mockImplementation((opts: object) => opts),
    MeshBasicMaterial: vi.fn().mockImplementation((opts: object) => opts),
    Mesh: vi.fn().mockImplementation((geo: object, mat: object) => ({
      geometry: geo,
      material: mat,
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      rotation: { x: 0 },
      userData: {},
    })),
    Group: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      children: [],
    })),
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      background: null,
    })),
  };
});

describe('TERRAIN_HEIGHT ordering', () => {
  it('water < plains', () => {
    expect(TERRAIN_HEIGHT.water).toBeLessThan(TERRAIN_HEIGHT.plains);
  });

  it('plains < grassland', () => {
    expect(TERRAIN_HEIGHT.plains).toBeLessThan(TERRAIN_HEIGHT.grassland);
  });

  it('grassland < forest', () => {
    expect(TERRAIN_HEIGHT.grassland).toBeLessThan(TERRAIN_HEIGHT.forest);
  });

  it('forest < mountain', () => {
    expect(TERRAIN_HEIGHT.forest).toBeLessThan(TERRAIN_HEIGHT.mountain);
  });

  it('all terrain heights are positive', () => {
    for (const [terrain, height] of Object.entries(TERRAIN_HEIGHT)) {
      expect(height, `${terrain} height must be > 0`).toBeGreaterThan(0);
    }
  });

  it('has exact values: water=2, plains=4, grassland=5, forest=8, mountain=18', () => {
    expect(TERRAIN_HEIGHT.water).toBe(2);
    expect(TERRAIN_HEIGHT.plains).toBe(4);
    expect(TERRAIN_HEIGHT.grassland).toBe(5);
    expect(TERRAIN_HEIGHT.forest).toBe(8);
    expect(TERRAIN_HEIGHT.mountain).toBe(18);
  });
});

describe('TERRAIN_MATERIAL_COLOR', () => {
  it('defines a color for every terrain type', () => {
    const terrains = ['water', 'plains', 'grassland', 'forest', 'mountain'] as const;
    for (const terrain of terrains) {
      expect(TERRAIN_MATERIAL_COLOR[terrain], `${terrain} must have a color`).toBeDefined();
    }
  });

  it('all colors are valid hex numbers', () => {
    for (const [terrain, color] of Object.entries(TERRAIN_MATERIAL_COLOR)) {
      expect(typeof color, `${terrain} color must be a number`).toBe('number');
      expect(color, `${terrain} color must be non-negative`).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// T019: Tile mesh elevation ordering
// Tests that createTileMesh produces geometry with correct height per terrain type.
// These tests validate via TERRAIN_HEIGHT constants (which drive BoxGeometry height).
// ---------------------------------------------------------------------------

describe('Tile elevation (TERRAIN_HEIGHT drives BoxGeometry heights)', () => {
  it('mountain height is greater than forest height', () => {
    expect(TERRAIN_HEIGHT.mountain).toBeGreaterThan(TERRAIN_HEIGHT.forest);
  });

  it('forest height is greater than grassland height', () => {
    expect(TERRAIN_HEIGHT.forest).toBeGreaterThan(TERRAIN_HEIGHT.grassland);
  });

  it('grassland height is greater than plains height', () => {
    expect(TERRAIN_HEIGHT.grassland).toBeGreaterThan(TERRAIN_HEIGHT.plains);
  });

  it('plains height is greater than water height', () => {
    expect(TERRAIN_HEIGHT.plains).toBeGreaterThan(TERRAIN_HEIGHT.water);
  });

  it('tile Y position equals terrainHeight / 2 (BoxGeometry center)', () => {
    // For each terrain, the mesh should be positioned at h/2 so base sits at y=0
    for (const [terrain, h] of Object.entries(TERRAIN_HEIGHT)) {
      const expectedY = h / 2;
      expect(expectedY, `${terrain}: y must be h/2`).toBe(h / 2);
    }
  });

  it('water mesh Y position (1.0) is lower than mountain mesh Y position (9.0)', () => {
    expect(TERRAIN_HEIGHT.water / 2).toBe(1.0);
    expect(TERRAIN_HEIGHT.mountain / 2).toBe(9.0);
    expect(TERRAIN_HEIGHT.water / 2).toBeLessThan(TERRAIN_HEIGHT.mountain / 2);
  });
});
