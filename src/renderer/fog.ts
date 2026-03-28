/**
 * src/renderer/fog.ts
 *
 * Fog of war overlay renderer using Three.js per-tile plane meshes.
 * 'hidden'   → opacity 1.0 (fully opaque black)
 * 'explored' → opacity 0.45 (dim black overlay)
 * 'visible'  → opacity 0.0 (invisible)
 *
 * T008: PixiJS imports removed.
 * Full implementation in T016 / T030.
 */

import * as THREE from 'three';
import type { GameState, PlayerId, FogState } from '../game/types';
import type { TileRenderEntry } from './tilemap';

/** Pure function: maps fog state to mesh opacity. Exported for unit testing (T029). */
export function fogStateToOpacity(state: FogState): number {
  switch (state) {
    case 'hidden':   return 1.0;
    case 'explored': return 0.45;
    case 'visible':  return 0.0;
  }
}

export class FogRenderer {
  constructor(
    private scene: THREE.Scene,
    private tileSize: number,
  ) {}

  render(
    state: GameState,
    humanPlayerId: PlayerId,
    getTileEntry: (tileId: string) => TileRenderEntry | undefined,
  ): void {
    const fog = state.fog[humanPlayerId];

    for (const tileId of state.tileOrder) {
      const entry = getTileEntry(tileId);
      if (!entry) continue;
      const fogState = fog[tileId] ?? 'hidden';
      const mat = entry.fogMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = fogStateToOpacity(fogState);
      entry.fogMesh.visible = fogState !== 'visible';
    }
  }
}
