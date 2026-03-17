import { describe, it, expect } from 'vitest';
import {
  isTap,
  pinchDistance,
  pinchMidpoint,
  TAP_DISTANCE_THRESHOLD,
  TAP_TIME_THRESHOLD,
  type ActivePointer,
} from '../src/input/gesture';

function makePointer(overrides: Partial<ActivePointer> = {}): ActivePointer {
  return {
    pointerId: 1,
    startX: 100,
    startY: 200,
    startTime: 1000,
    currentX: 100,
    currentY: 200,
    ...overrides,
  };
}

describe('isTap', () => {
  it('returns true for a short stationary touch', () => {
    const p = makePointer();
    expect(isTap(p, 1100)).toBe(true); // 100ms, 0px movement
  });

  it('returns false when touch moves beyond threshold', () => {
    const p = makePointer({ currentX: 100 + TAP_DISTANCE_THRESHOLD + 1 });
    expect(isTap(p, 1100)).toBe(false);
  });

  it('returns false when touch is held too long', () => {
    const p = makePointer();
    expect(isTap(p, 1000 + TAP_TIME_THRESHOLD + 1)).toBe(false);
  });

  it('returns false when both distance and time exceed thresholds', () => {
    const p = makePointer({ currentX: 200, currentY: 300 });
    expect(isTap(p, 5000)).toBe(false);
  });

  it('returns true for small drift within threshold', () => {
    const p = makePointer({ currentX: 105, currentY: 203 }); // ~5.8px
    expect(isTap(p, 1150)).toBe(true);
  });

  it('returns true at exactly under thresholds', () => {
    // Distance just under 10: dx=7, dy=7 → ~9.9px
    const p = makePointer({ currentX: 107, currentY: 207 });
    expect(isTap(p, 1000 + TAP_TIME_THRESHOLD - 1)).toBe(true);
  });
});

describe('pinchDistance', () => {
  it('calculates distance between two pointers', () => {
    const a = makePointer({ currentX: 0, currentY: 0 });
    const b = makePointer({ pointerId: 2, currentX: 3, currentY: 4 });
    expect(pinchDistance(a, b)).toBe(5); // 3-4-5 triangle
  });

  it('returns 0 for overlapping pointers', () => {
    const a = makePointer({ currentX: 50, currentY: 50 });
    const b = makePointer({ pointerId: 2, currentX: 50, currentY: 50 });
    expect(pinchDistance(a, b)).toBe(0);
  });

  it('handles large distances', () => {
    const a = makePointer({ currentX: 0, currentY: 0 });
    const b = makePointer({ pointerId: 2, currentX: 300, currentY: 400 });
    expect(pinchDistance(a, b)).toBe(500);
  });
});

describe('pinchMidpoint', () => {
  it('returns center point between two pointers', () => {
    const a = makePointer({ currentX: 0, currentY: 0 });
    const b = makePointer({ pointerId: 2, currentX: 100, currentY: 200 });
    expect(pinchMidpoint(a, b)).toEqual({ x: 50, y: 100 });
  });

  it('returns pointer position when both overlap', () => {
    const a = makePointer({ currentX: 75, currentY: 75 });
    const b = makePointer({ pointerId: 2, currentX: 75, currentY: 75 });
    expect(pinchMidpoint(a, b)).toEqual({ x: 75, y: 75 });
  });
});
