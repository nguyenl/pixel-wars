/**
 * tests/renderer/units.test.ts
 *
 * Tests for AnimationController.tick(deltaMS).
 * T024: Written BEFORE T026 implementation — MUST FAIL until AnimationController is ported.
 *
 * Since AnimationController is already ported to Three.js (in T008/T026),
 * these tests should pass immediately.
 */

import { describe, it, expect, vi } from 'vitest';
import { AnimationController } from '../../src/renderer/units';
import * as THREE from 'three';

// Mock Three.js Sprite/material so tests run without WebGL
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  return {
    ...actual,
    Sprite: vi.fn().mockImplementation(() => ({
      material: { opacity: 1, transparent: false },
      scale: { set: vi.fn() },
    })),
    SpriteMaterial: vi.fn().mockImplementation((opts: object) => ({ ...opts, opacity: 1, transparent: false })),
  };
});

// ---------------------------------------------------------------------------
// T024: AnimationController.tick(deltaMS) — move interpolation
// ---------------------------------------------------------------------------

describe('AnimationController.tick(deltaMS)', () => {
  it('advances position halfway at 50ms for 100ms move', () => {
    const controller = new AnimationController();

    // Create a mock Object3D
    const obj = new THREE.Object3D();
    obj.position.set(0, 0, 0);

    // Register idle so we can track state
    controller.registerIdle('unit1', obj);

    // Play a move: from (0,0,0) to (10,0,0) over 100ms
    const waypoints = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ];
    const onComplete = vi.fn();
    controller.playMove('unit1', obj, waypoints, 100, onComplete);

    // Tick 50ms → position should be approximately (5, 0, 0)
    controller.tick(50);
    expect(obj.position.x).toBeCloseTo(5);
    expect(obj.position.z).toBeCloseTo(0);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('completes animation and calls onComplete at full duration', () => {
    const controller = new AnimationController();

    const obj = new THREE.Object3D();
    obj.position.set(0, 0, 0);
    controller.registerIdle('unit2', obj);

    const waypoints = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ];
    const onComplete = vi.fn();
    controller.playMove('unit2', obj, waypoints, 100, onComplete);

    // Tick to completion
    controller.tick(100);
    expect(obj.position.x).toBeCloseTo(10);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('position is clamped to toX at elapsed > duration', () => {
    const controller = new AnimationController();

    const obj = new THREE.Object3D();
    obj.position.set(0, 0, 0);
    controller.registerIdle('unit3', obj);

    const waypoints = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ];
    controller.playMove('unit3', obj, waypoints, 100, () => {});

    // Over-tick: 150ms > 100ms
    controller.tick(150);
    expect(obj.position.x).toBeCloseTo(10);
  });

  it('isAnimating returns false before playMove', () => {
    const controller = new AnimationController();
    expect(controller.isAnimating()).toBe(false);
  });

  it('isAnimating returns true during playMove, false after completion', () => {
    const controller = new AnimationController();

    const obj = new THREE.Object3D();
    controller.registerIdle('unit4', obj);

    const waypoints = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ];
    controller.playMove('unit4', obj, waypoints, 100, () => {});

    expect(controller.isAnimating()).toBe(true);
    controller.tick(100);
    expect(controller.isAnimating()).toBe(false);
  });
});
