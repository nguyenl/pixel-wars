/**
 * src/renderer/viewport.ts
 *
 * Pure math functions for viewport coordinate transforms.
 * No Three.js imports — kept pure for unit testability.
 */

import type { TileCoord } from '../game/types';

/**
 * Computes clamped pan position given current state and canvas/map dimensions.
 * If the map fits within the canvas at the given zoom, the map is centered.
 * If the map is larger than the canvas, panX/Y are clamped so the map never
 * fully scrolls off screen.
 */
export function clampPan(
  panX: number,
  panY: number,
  zoom: number,
  canvasW: number,
  canvasH: number,
  mapCols: number,
  mapRows: number,
  tileSize: number,
): { x: number; y: number } {
  const mapPixelW = mapCols * tileSize * zoom;
  const mapPixelH = mapRows * tileSize * zoom;

  let x: number;
  if (mapPixelW <= canvasW) {
    x = (canvasW - mapPixelW) / 2;
  } else {
    x = Math.min(0, Math.max(canvasW - mapPixelW, panX));
  }

  let y: number;
  if (mapPixelH <= canvasH) {
    y = (canvasH - mapPixelH) / 2;
  } else {
    y = Math.min(0, Math.max(canvasH - mapPixelH, panY));
  }

  return { x, y };
}

/**
 * Grid tile coord → Three.js world position (center of tile, Y at BoxGeometry center).
 *   x = col * tileSize
 *   y = terrainHeight / 2  (BoxGeometry is centered at its own origin)
 *   z = row * tileSize
 */
export function gridToWorld(
  coord: TileCoord,
  terrainHeight: number,
  tileSize: number,
): { x: number; y: number; z: number } {
  return {
    x: coord.col * tileSize,
    y: terrainHeight / 2,
    z: coord.row * tileSize,
  };
}

/**
 * Three.js world XZ → nearest grid coord.
 */
export function worldToGrid(
  worldX: number,
  worldZ: number,
  tileSize: number,
): TileCoord {
  return {
    col: Math.round(worldX / tileSize),
    row: Math.round(worldZ / tileSize),
  };
}

/**
 * Client pixel → Normalized Device Coordinates for Three.js raycasting.
 */
export function clientToNDC(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  return {
    x:  (clientX / canvas.clientWidth)  * 2 - 1,
    y: -(clientY / canvas.clientHeight) * 2 + 1,
  };
}

/**
 * Converts screen-space coordinates to tile grid coordinates.
 * Returns null if the point is outside the map.
 */
export function screenToTile(
  screenX: number,
  screenY: number,
  panX: number,
  panY: number,
  zoom: number,
  tileSize: number,
  mapCols: number,
  mapRows: number,
): { row: number; col: number } | null {
  const worldX = (screenX - panX) / zoom;
  const worldY = (screenY - panY) / zoom;

  if (worldX < 0 || worldY < 0) return null;

  const col = Math.floor(worldX / tileSize);
  const row = Math.floor(worldY / tileSize);

  if (col >= mapCols || row >= mapRows) return null;

  return { row, col };
}
