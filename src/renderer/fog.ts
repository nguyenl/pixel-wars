/**
 * src/renderer/fog.ts
 *
 * Fog of war overlay renderer.
 * 'hidden' tiles → fully opaque black overlay
 * 'explored' tiles → semi-transparent dim overlay
 * 'visible' tiles → no overlay
 */

import { Container, Graphics } from 'pixi.js';
import type { GameState, PlayerId } from '../game/types';

export class FogRenderer {
  private container: Container;

  constructor(private parentContainer: Container, private tileSize: number) {
    this.container = new Container();
    this.parentContainer.addChild(this.container);
  }

  render(state: GameState, humanPlayerId: PlayerId): void {
    this.container.removeChildren();
    const fog = state.fog[humanPlayerId];
    const { tileSize } = this;

    for (const tileId of state.tileOrder) {
      const fogState = fog[tileId];
      if (fogState === 'visible') continue;

      const tile = state.tiles[tileId];
      if (!tile) continue;

      const g = new Graphics();
      const x = tile.coord.col * tileSize;
      const y = tile.coord.row * tileSize;

      if (fogState === 'hidden') {
        g.rect(x, y, tileSize, tileSize);
        g.fill({ color: 0x000000, alpha: 1.0 });
      } else {
        // 'explored'
        g.rect(x, y, tileSize, tileSize);
        g.fill({ color: 0x000000, alpha: 0.5 });
      }

      this.container.addChild(g);
    }
  }
}
