/**
 * src/input/gesture.ts
 *
 * Pure gesture recognition utilities for tap/drag/pinch disambiguation.
 * No DOM imports — kept pure for unit testability.
 */

/** Tracks an active touch/pointer contact point. */
export interface ActivePointer {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
}

/** Max px movement for a touch to count as a tap. */
export const TAP_DISTANCE_THRESHOLD = 10;

/** Max ms duration for a touch to count as a tap. */
export const TAP_TIME_THRESHOLD = 300;

/**
 * Determines whether a pointer interaction qualifies as a tap.
 * A tap must move less than TAP_DISTANCE_THRESHOLD pixels
 * AND last less than TAP_TIME_THRESHOLD milliseconds.
 */
export function isTap(pointer: ActivePointer, upTime: number): boolean {
  const dx = pointer.currentX - pointer.startX;
  const dy = pointer.currentY - pointer.startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const duration = upTime - pointer.startTime;
  return dist < TAP_DISTANCE_THRESHOLD && duration < TAP_TIME_THRESHOLD;
}

/**
 * Euclidean distance between two active pointers (using their current positions).
 */
export function pinchDistance(a: ActivePointer, b: ActivePointer): number {
  const dx = a.currentX - b.currentX;
  const dy = a.currentY - b.currentY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Midpoint between two active pointers (using their current positions).
 */
export function pinchMidpoint(a: ActivePointer, b: ActivePointer): { x: number; y: number } {
  return {
    x: (a.currentX + b.currentX) / 2,
    y: (a.currentY + b.currentY) / 2,
  };
}
