/**
 * tests/renderer/fog.test.ts
 *
 * Tests for fog state → opacity mapping.
 * T029: Written BEFORE T030 — MUST FAIL until fogStateToOpacity is exported.
 *
 * Since fogStateToOpacity is already implemented (in T008/T030),
 * these tests should pass immediately.
 */

import { describe, it, expect, vi } from 'vitest';
import { fogStateToOpacity } from '../../src/renderer/fog';

// Mock Three.js so tests run without WebGL
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  return {
    ...actual,
    PlaneGeometry: vi.fn().mockImplementation(() => ({})),
    MeshBasicMaterial: vi.fn().mockImplementation((opts: object) => ({ ...opts })),
    Mesh: vi.fn().mockImplementation(() => ({
      rotation: { x: 0 },
      position: { set: vi.fn() },
      material: { opacity: 0 },
      visible: true,
    })),
    Scene: vi.fn().mockImplementation(() => ({ add: vi.fn() })),
  };
});

// ---------------------------------------------------------------------------
// T029: fog state → opacity mapping
// ---------------------------------------------------------------------------

describe('fogStateToOpacity', () => {
  it('hidden → 1.0 (fully opaque)', () => {
    expect(fogStateToOpacity('hidden')).toBe(1.0);
  });

  it('explored → 0.45 (semi-transparent)', () => {
    expect(fogStateToOpacity('explored')).toBe(0.45);
  });

  it('visible → 0.0 (transparent)', () => {
    expect(fogStateToOpacity('visible')).toBe(0.0);
  });
});
