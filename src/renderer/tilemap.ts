/**
 * src/renderer/tilemap.ts
 *
 * Tile grid rendering using PixiJS Graphics primitives.
 * Uses colored rectangles as terrain placeholders (no sprite assets required).
 * Also renders settlement icons and movement/attack highlights.
 */

import { Container, Graphics } from 'pixi.js';
import type { GameState, Tile, TerrainType, TileCoord } from '../game/types';

const TERRAIN_COLORS: Record<TerrainType, number> = {
  plains:    0x90c060,
  grassland: 0x60a040,
  forest:    0x206020,
  mountain:  0x808080,
  water:     0x2060c0,
};

const HIGHLIGHT_MOVE_COLOR    = 0x44aaff;
const HIGHLIGHT_ATTACK_COLOR  = 0xff4444;
const OWNER_COLORS: Record<string, number> = {
  player1: 0x4488ff,
  player2: 0xff4444,
  neutral: 0xaaaaaa,
};

export class TilemapRenderer {
  private container: Container;
  private tileGraphics: Map<string, Graphics> = new Map();
  private settlementGraphics: Map<string, Graphics> = new Map();
  private highlightLayer: Container;

  constructor(private parentContainer: Container, private tileSize: number) {
    this.container = new Container();
    this.highlightLayer = new Container();
    this.parentContainer.addChild(this.container);
    this.parentContainer.addChild(this.highlightLayer);
  }

  render(
    state: GameState,
    reachableCoords: TileCoord[],
    attackableCoords: TileCoord[],
    hoverCoord: TileCoord | null = null,
  ): void {
    this.renderTiles(state);
    this.renderSettlements(state);
    this.renderHighlights(reachableCoords, attackableCoords, hoverCoord);
  }

  private renderTiles(state: GameState): void {
    const { tileSize } = this;

    for (const tileId of state.tileOrder) {
      const tile = state.tiles[tileId];
      let g = this.tileGraphics.get(tileId);
      if (!g) {
        g = new Graphics();
        this.container.addChild(g);
        this.tileGraphics.set(tileId, g);
      }
      const x = tile.coord.col * tileSize;
      const y = tile.coord.row * tileSize;
      g.clear();
      g.rect(x, y, tileSize - 1, tileSize - 1);
      g.fill({ color: TERRAIN_COLORS[tile.terrain] });
      this.renderTerrainDetail(tile, g, x, y, tileSize);
    }
  }

  private renderTerrainDetail(tile: Tile, g: Graphics, x: number, y: number, tileSize: number): void {
    // Deterministic pseudo-random offset per tile
    const hash = (tile.coord.row * 31 + tile.coord.col * 17);
    const inset = 4;

    switch (tile.terrain) {
      case 'plains': {
        // 3 small grass tufts ("V" shapes)
        g.setStrokeStyle({ color: 0xb0d870, width: 1 });
        for (let i = 0; i < 3; i++) {
          const ox = x + inset + ((hash + i * 7) % (tileSize - inset * 2));
          const oy = y + inset + ((hash + i * 13) % (tileSize - inset * 2));
          g.moveTo(ox - 2, oy).lineTo(ox, oy - 4).moveTo(ox, oy - 4).lineTo(ox + 2, oy);
        }
        g.stroke();
        break;
      }
      case 'grassland': {
        // 4 dense grass tufts + 1 bush circle
        g.setStrokeStyle({ color: 0x80c050, width: 1 });
        for (let i = 0; i < 4; i++) {
          const ox = x + inset + ((hash + i * 11) % (tileSize - inset * 2));
          const oy = y + inset + ((hash + i * 9) % (tileSize - inset * 2));
          g.moveTo(ox - 2, oy).lineTo(ox, oy - 4).moveTo(ox, oy - 4).lineTo(ox + 2, oy);
        }
        g.stroke();
        // Bush
        const bx = x + inset + ((hash * 3) % (tileSize - inset * 2));
        const by = y + inset + ((hash * 5) % (tileSize - inset * 2));
        g.circle(bx, by, 3);
        g.fill({ color: 0x508030 });
        break;
      }
      case 'forest': {
        // 2-3 dark tree canopies in the upper half
        const count = 2 + (hash % 2);
        for (let i = 0; i < count; i++) {
          const cx = x + inset + ((hash + i * 13) % (tileSize - inset * 2));
          const cy = y + inset + ((hash + i * 7) % Math.floor((tileSize - inset * 2) / 2));
          const r = 4 + (hash + i) % 3;
          g.circle(cx, cy, r);
          g.fill({ color: 0x104010 });
        }
        break;
      }
      case 'mountain': {
        // Filled triangle peak
        const cx = x + tileSize / 2 + ((hash % 5) - 2);
        g.poly([cx, y + 4, cx + 8, y + tileSize - 6, cx - 8, y + tileSize - 6]);
        g.fill({ color: 0x505050 });
        break;
      }
      case 'water': {
        // 2 wave ripple lines
        g.setStrokeStyle({ color: 0x4090e0, width: 1 });
        const third = tileSize / 3;
        for (let i = 0; i < 2; i++) {
          const wy = y + third + i * (third * 0.5) + ((hash + i * 3) % 4);
          const wx = x + inset + ((hash + i * 5) % 4);
          g.moveTo(wx, wy).lineTo(wx + tileSize * 0.4, wy);
        }
        g.stroke();
        break;
      }
    }
  }

  private renderSettlements(state: GameState): void {
    const { tileSize } = this;

    // Clear old settlement graphics
    for (const [, g] of this.settlementGraphics) {
      g.clear();
    }

    for (const settlement of Object.values(state.settlements)) {
      const tile = state.tiles[settlement.tileId];
      if (!tile) continue;

      let g = this.settlementGraphics.get(settlement.id);
      if (!g) {
        g = new Graphics();
        this.container.addChild(g);
        this.settlementGraphics.set(settlement.id, g);
      }

      const x = tile.coord.col * tileSize;
      const y = tile.coord.row * tileSize;
      const ownerColor = OWNER_COLORS[settlement.owner] ?? OWNER_COLORS['neutral'];

      g.clear();

      if (settlement.type === 'city') {
        this.drawCityGraphic(g, x, y, tileSize, ownerColor);
      } else {
        this.drawTownGraphic(g, x, y, tileSize, ownerColor);
      }
    }
  }

  /** Draw a city as a cluster of 3-4 buildings with a central tower */
  private drawCityGraphic(g: Graphics, x: number, y: number, tileSize: number, ownerColor: number): void {
    const cx = x + tileSize / 2;
    const baseY = y + tileSize * 0.85;
    const buildingColor = 0x888888;
    const width = tileSize * 0.6;
    const halfW = width / 2;

    // Building 1 (left, short)
    const b1x = cx - halfW;
    const b1h = tileSize * 0.3;
    const b1w = width * 0.22;
    g.rect(b1x, baseY - b1h, b1w, b1h);
    g.fill({ color: buildingColor });
    g.stroke({ color: ownerColor, width: 1.5 });

    // Building 2 (center-left, medium)
    const b2x = b1x + b1w + 1;
    const b2h = tileSize * 0.4;
    const b2w = width * 0.22;
    g.rect(b2x, baseY - b2h, b2w, b2h);
    g.fill({ color: buildingColor });
    g.stroke({ color: ownerColor, width: 1.5 });

    // Building 3 (center tower, tallest)
    const b3w = width * 0.24;
    const b3x = b2x + b2w + 1;
    const b3h = tileSize * 0.55;
    g.rect(b3x, baseY - b3h, b3w, b3h);
    g.fill({ color: 0x777777 });
    g.stroke({ color: ownerColor, width: 1.5 });

    // Building 4 (right, medium-short)
    const b4x = b3x + b3w + 1;
    const b4h = tileSize * 0.32;
    const b4w = width * 0.22;
    g.rect(b4x, baseY - b4h, b4w, b4h);
    g.fill({ color: buildingColor });
    g.stroke({ color: ownerColor, width: 1.5 });
  }

  /** Draw a town as 2 small houses with triangular roofs */
  private drawTownGraphic(g: Graphics, x: number, y: number, tileSize: number, ownerColor: number): void {
    const cx = x + tileSize / 2;
    const baseY = y + tileSize * 0.85;
    const buildingColor = 0x999999;
    const roofColor = 0x885533;
    const houseW = tileSize * 0.16;
    const houseH = tileSize * 0.2;
    const gap = tileSize * 0.06;

    // House 1 (left)
    const h1x = cx - houseW - gap / 2;
    // Walls
    g.rect(h1x, baseY - houseH, houseW, houseH);
    g.fill({ color: buildingColor });
    g.stroke({ color: ownerColor, width: 1.5 });
    // Roof (triangle)
    g.poly([h1x - 1, baseY - houseH, h1x + houseW / 2, baseY - houseH - tileSize * 0.14, h1x + houseW + 1, baseY - houseH]);
    g.fill({ color: roofColor });
    g.stroke({ color: ownerColor, width: 1 });

    // House 2 (right)
    const h2x = cx + gap / 2;
    // Walls
    g.rect(h2x, baseY - houseH, houseW, houseH);
    g.fill({ color: buildingColor });
    g.stroke({ color: ownerColor, width: 1.5 });
    // Roof (triangle)
    g.poly([h2x - 1, baseY - houseH, h2x + houseW / 2, baseY - houseH - tileSize * 0.14, h2x + houseW + 1, baseY - houseH]);
    g.fill({ color: roofColor });
    g.stroke({ color: ownerColor, width: 1 });
  }

  private renderHighlights(reachable: TileCoord[], attackable: TileCoord[], hoverCoord: TileCoord | null = null): void {
    this.highlightLayer.removeChildren();
    const { tileSize } = this;

    for (const coord of reachable) {
      const g = new Graphics();
      g.rect(coord.col * tileSize, coord.row * tileSize, tileSize - 1, tileSize - 1);
      g.fill({ color: HIGHLIGHT_MOVE_COLOR, alpha: 0.35 });
      this.highlightLayer.addChild(g);
    }

    for (const coord of attackable) {
      const g = new Graphics();
      g.rect(coord.col * tileSize, coord.row * tileSize, tileSize - 1, tileSize - 1);
      g.fill({ color: HIGHLIGHT_ATTACK_COLOR, alpha: 0.4 });
      this.highlightLayer.addChild(g);
    }

    // Hover highlight
    if (hoverCoord) {
      const isReachable = reachable.some(c => c.row === hoverCoord.row && c.col === hoverCoord.col);
      const isAttackable = attackable.some(c => c.row === hoverCoord.row && c.col === hoverCoord.col);
      if (isReachable) {
        const g = new Graphics();
        g.rect(hoverCoord.col * tileSize, hoverCoord.row * tileSize, tileSize - 1, tileSize - 1);
        g.fill({ color: 0x88ccff, alpha: 0.55 });
        this.highlightLayer.addChild(g);
      } else if (isAttackable) {
        const g = new Graphics();
        g.rect(hoverCoord.col * tileSize, hoverCoord.row * tileSize, tileSize - 1, tileSize - 1);
        g.fill({ color: 0xff8888, alpha: 0.55 });
        this.highlightLayer.addChild(g);
      }
    }
  }
}
