/**
 * src/renderer/tilemap.ts
 *
 * Tile grid rendering using Three.js BoxGeometry meshes.
 * Terrain tiles render as colored 3D boxes with elevation-based heights.
 * Also renders settlement markers and movement/attack highlights.
 *
 * T008: PixiJS imports removed; Three.js stub preserving public method signatures.
 * Full implementation in T015, T020, T021, T022.
 */

import * as THREE from 'three';
import type { GameState, PlayerId, TerrainType, TileCoord } from '../game/types';

/** Terrain elevation heights in Three.js world units (BoxGeometry height). */
export const TERRAIN_HEIGHT: Record<TerrainType, number> = {
  water:     2,
  plains:    4,
  grassland: 5,
  forest:    8,
  mountain:  18,
};

/** Terrain base colors for MeshLambertMaterial. */
export const TERRAIN_MATERIAL_COLOR: Record<TerrainType, number> = {
  water:     0x2060c0,
  plains:    0x90c060,
  grassland: 0x60a040,
  forest:    0x206020,
  mountain:  0x808080,
};

const HIGHLIGHT_MOVE_COLOR    = 0x44aaff;
const HIGHLIGHT_ATTACK_COLOR  = 0xff4444;

export const OWNER_COLORS: Record<string, number> = {
  player1: 0x4488ff,
  player2: 0xff4444,
  neutral: 0xaaaaaa,
};

export interface TileRenderEntry {
  tileMesh: THREE.Mesh;
  fogMesh: THREE.Mesh;
  terrainHeight: number;
}

export class TilemapRenderer {
  private scene: THREE.Scene;
  private tileEntries: Map<string, TileRenderEntry> = new Map();
  private settlementGroup: THREE.Group;
  private highlightGroup: THREE.Group;
  readonly tileGroup: THREE.Group;

  constructor(scene: THREE.Scene, private tileSize: number) {
    this.scene = scene;
    this.tileGroup = new THREE.Group();
    this.settlementGroup = new THREE.Group();
    this.highlightGroup = new THREE.Group();
    scene.add(this.tileGroup);
    scene.add(this.settlementGroup);
    scene.add(this.highlightGroup);
  }

  render(
    state: GameState,
    humanPlayerId: PlayerId,
    reachableCoords: TileCoord[],
    attackableCoords: TileCoord[],
    hoverCoord: TileCoord | null = null,
  ): void {
    this.renderTiles(state);
    this.renderSettlements(state, humanPlayerId);
    this.renderHighlights(reachableCoords, attackableCoords, hoverCoord);
  }

  getTileEntry(tileId: string): TileRenderEntry | undefined {
    return this.tileEntries.get(tileId);
  }

  private renderTiles(state: GameState): void {
    const { tileSize } = this;

    for (const id of state.tileOrder) {
      const tile = state.tiles[id];
      if (!tile) continue;

      if (!this.tileEntries.has(id)) {
        const h = TERRAIN_HEIGHT[tile.terrain];
        // Tile mesh
        const geo = new THREE.BoxGeometry(tileSize, h, tileSize);
        const mat = new THREE.MeshLambertMaterial({ color: TERRAIN_MATERIAL_COLOR[tile.terrain] });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(tile.coord.col * tileSize, h / 2, tile.coord.row * tileSize);
        mesh.userData.coord = tile.coord;
        this.tileGroup.add(mesh);

        // Fog mesh — box matching the terrain tile exactly so sides of mountains are covered
        const fogGeo = new THREE.BoxGeometry(tileSize, h, tileSize);
        const fogMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          depthWrite: false,
        });
        const fogMesh = new THREE.Mesh(fogGeo, fogMat);
        fogMesh.position.set(tile.coord.col * tileSize, h / 2, tile.coord.row * tileSize);
        this.scene.add(fogMesh);

        this.tileEntries.set(id, { tileMesh: mesh, fogMesh, terrainHeight: h });
      }
    }
  }

  private renderSettlements(state: GameState, humanPlayerId: PlayerId): void {
    // Clear old settlement meshes
    while (this.settlementGroup.children.length > 0) {
      const child = this.settlementGroup.children[0];
      this.settlementGroup.remove(child);
    }

    const fog = state.fog[humanPlayerId];

    for (const settlement of Object.values(state.settlements)) {
      const tile = state.tiles[settlement.tileId];
      if (!tile) continue;

      // Don't render settlements in fully hidden tiles
      if ((fog[settlement.tileId] ?? 'hidden') === 'hidden') continue;

      const entry = this.tileEntries.get(settlement.tileId);
      const baseH = entry ? entry.terrainHeight : TERRAIN_HEIGHT[tile.terrain];
      const cx = tile.coord.col * this.tileSize;
      const cz = tile.coord.row * this.tileSize;
      const ownerColor = OWNER_COLORS[settlement.owner] ?? OWNER_COLORS['neutral'];

      if (settlement.type === 'city') {
        this.drawCityGraphic(cx, baseH, cz, ownerColor);
      } else {
        this.drawTownGraphic(cx, baseH, cz, ownerColor);
      }

      // Capture progress bar (thin box above tile)
      if (settlement.captureProgress > 0) {
        const capturingUnit = settlement.capturingUnit
          ? state.units[settlement.capturingUnit]
          : null;
        const barColor = capturingUnit?.owner === 'player1' ? 0x4488ff : 0xff4444;
        const fraction = settlement.captureProgress / 2;
        const barW = this.tileSize * fraction;
        const barGeo = new THREE.BoxGeometry(barW, 0.5, 2);
        const barMat = new THREE.MeshBasicMaterial({ color: barColor });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(cx - this.tileSize / 2 + barW / 2, baseH + 0.5, cz - this.tileSize / 2 + 1);
        this.settlementGroup.add(bar);
      }
    }
  }

  private drawCityGraphic(cx: number, baseH: number, cz: number, ownerColor: number): void {
    const ts = this.tileSize;
    const buildings = [
      { w: ts * 0.13, h: ts * 0.3,  dx: -ts * 0.25 },
      { w: ts * 0.13, h: ts * 0.4,  dx: -ts * 0.08 },
      { w: ts * 0.15, h: ts * 0.55, dx:  ts * 0.0  },
      { w: ts * 0.13, h: ts * 0.32, dx:  ts * 0.17 },
    ];
    for (const b of buildings) {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.w);
      const mat = new THREE.MeshLambertMaterial({ color: ownerColor });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx + b.dx, baseH + b.h / 2, cz);
      this.settlementGroup.add(mesh);
    }
  }

  private drawTownGraphic(cx: number, baseH: number, cz: number, ownerColor: number): void {
    const ts = this.tileSize;
    const houses = [
      { dx: -ts * 0.12, w: ts * 0.12, h: ts * 0.2 },
      { dx:  ts * 0.12, w: ts * 0.12, h: ts * 0.2 },
    ];
    for (const house of houses) {
      const geo = new THREE.BoxGeometry(house.w, house.h, house.w);
      const mat = new THREE.MeshLambertMaterial({ color: ownerColor });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx + house.dx, baseH + house.h / 2, cz);
      this.settlementGroup.add(mesh);
    }
  }

  private renderHighlights(
    reachable: TileCoord[],
    attackable: TileCoord[],
    hoverCoord: TileCoord | null,
  ): void {
    while (this.highlightGroup.children.length > 0) {
      const child = this.highlightGroup.children[0];
      this.highlightGroup.remove(child);
    }

    const { tileSize } = this;

    const addOverlay = (coord: TileCoord, color: number, alpha: number) => {
      const entry = this.tileEntries.get(`${coord.row},${coord.col}`);
      const tH = entry ? entry.terrainHeight : 4;
      const geo = new THREE.BoxGeometry(tileSize, 0.3, tileSize);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: alpha, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(coord.col * tileSize, tH + 0.15, coord.row * tileSize);
      this.highlightGroup.add(mesh);
    };

    for (const coord of reachable) addOverlay(coord, HIGHLIGHT_MOVE_COLOR, 0.35);
    for (const coord of attackable) addOverlay(coord, HIGHLIGHT_ATTACK_COLOR, 0.4);

    if (hoverCoord) {
      const isReachable = reachable.some(c => c.row === hoverCoord.row && c.col === hoverCoord.col);
      const isAttackable = attackable.some(c => c.row === hoverCoord.row && c.col === hoverCoord.col);
      if (isReachable) addOverlay(hoverCoord, 0x88ccff, 0.55);
      else if (isAttackable) addOverlay(hoverCoord, 0xff8888, 0.55);
    }
  }
}
