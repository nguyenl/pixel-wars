/**
 * src/renderer/units.ts
 *
 * Unit sprite rendering using Three.js Sprites (camera-facing billboards).
 * Player color applied as SpriteMaterial.color tint.
 * Includes AnimationController for idle bob, move, attack, death animations.
 *
 * T008: PixiJS imports removed; Three.js stub preserving public method signatures.
 * Full implementation in T017, T025, T026, T027.
 */

import * as THREE from 'three';
import type { GameState, PlayerId, UnitType } from '../game/types';
import type { TileRenderEntry } from './tilemap';
import { TERRAIN_HEIGHT } from './tilemap';

export const PLAYER_TINT: Record<PlayerId, number> = {
  player1: 0x2244ff,
  player2: 0xdd2222,
};

const SPRITE_SIZE = 24; // world units

export interface UnitRenderEntry {
  group: THREE.Group;
  sprite: THREE.Sprite;
  hpBar: THREE.Mesh;
  idlePhase: number;
}

export class UnitsRenderer {
  private unitEntries: Map<string, UnitRenderEntry> = new Map();
  animationController: AnimationController;
  private textureLoader = new THREE.TextureLoader();
  private textureCache: Map<string, THREE.Texture> = new Map();

  constructor(
    private scene: THREE.Scene,
    private tileSize: number,
  ) {
    this.animationController = new AnimationController();
  }

  loadTextures(types: UnitType[]): void {
    for (const type of types) {
      const tex = this.textureLoader.load(`assets/sprites/units/${type}.png`);
      this.textureCache.set(type, tex);
    }
  }

  render(
    state: GameState,
    humanPlayerId: PlayerId,
    getTileEntry: (tileId: string) => TileRenderEntry | undefined,
  ): void {
    const humanFog = state.fog[humanPlayerId];

    // Remove graphics for destroyed units
    for (const [id, entry] of this.unitEntries) {
      if (!state.units[id]) {
        this.animationController.cancelUnit(id);
        this.scene.remove(entry.group);
        this.unitEntries.delete(id);
      }
    }

    for (const [unitId, unit] of Object.entries(state.units)) {
      const tile = state.tiles[unit.tileId];
      if (!tile) continue;

      const fogState = humanFog[tile.id];
      if (unit.owner !== humanPlayerId && fogState !== 'visible') {
        const existing = this.unitEntries.get(unitId);
        if (existing) existing.group.visible = false;
        continue;
      }

      let entry = this.unitEntries.get(unitId);
      if (!entry) {
        entry = this.createUnitEntry(unit.type, unit.owner);
        this.scene.add(entry.group);
        this.unitEntries.set(unitId, entry);
        this.animationController.registerIdle(unitId, entry.group);
      }

      entry.group.visible = true;

      if (!this.animationController.isUnitAnimating(unitId)) {
        const tileEntry = getTileEntry(tile.id);
        const tH = tileEntry ? tileEntry.terrainHeight : TERRAIN_HEIGHT[tile.terrain];
        const x = tile.coord.col * this.tileSize;
        const y = tH + SPRITE_SIZE / 2;
        const z = tile.coord.row * this.tileSize;
        entry.group.position.set(x, y, z);
        this.animationController.updateIdleBaseY(unitId, y);
      }

      this.updateHpBar(entry, unit.hp, unit.type);
    }
  }

  getUnitGroup(unitId: string): THREE.Group | undefined {
    return this.unitEntries.get(unitId)?.group;
  }

  getTileSize(): number {
    return this.tileSize;
  }

  private createUnitEntry(type: UnitType, owner: PlayerId): UnitRenderEntry {
    const group = new THREE.Group();

    // Sprite
    const tex = this.textureCache.get(type);
    let sprite: THREE.Sprite;
    if (tex) {
      const mat = new THREE.SpriteMaterial({ map: tex, color: PLAYER_TINT[owner] });
      sprite = new THREE.Sprite(mat);
    } else {
      // Fallback: solid-color circle sprite
      const mat = new THREE.SpriteMaterial({ color: PLAYER_TINT[owner] });
      sprite = new THREE.Sprite(mat);
    }
    sprite.scale.set(SPRITE_SIZE, SPRITE_SIZE, 1);
    group.add(sprite);

    // HP bar
    const hpGeo = new THREE.PlaneGeometry(SPRITE_SIZE, 3);
    const hpMat = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
    const hpBar = new THREE.Mesh(hpGeo, hpMat);
    hpBar.position.set(0, SPRITE_SIZE / 2 + 3, 0);
    group.add(hpBar);

    return { group, sprite, hpBar, idlePhase: 0 };
  }

  private updateHpBar(entry: UnitRenderEntry, hp: number, type: UnitType): void {
    const maxHpMap: Record<UnitType, number> = { scout: 3, infantry: 5, artillery: 4 };
    const maxHp = maxHpMap[type];
    const fraction = hp / maxHp;
    const color = fraction > 0.5 ? 0x44ff44 : fraction > 0.25 ? 0xffaa00 : 0xff2222;
    (entry.hpBar.material as THREE.MeshBasicMaterial).color.setHex(color);
    entry.hpBar.scale.set(fraction, 1, 1);
  }
}

// ---------------------------------------------------------------------------
// AnimationController — drives idle bob, move, attack, death animations
// T008: replaced PixiJS Container with THREE.Object3D; deltaMS passed from THREE.Clock.
// Full implementation in T026.
// ---------------------------------------------------------------------------

interface AnimationState {
  unitId: string;
  type: 'move' | 'attack' | 'death';
  elapsed: number;
  duration: number;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  object3D: THREE.Object3D;
  onComplete: (() => void) | null;
}

interface IdleState {
  unitId: string;
  object3D: THREE.Object3D;
  baseY: number;
  phase: number;
  paused: boolean;
  totalTime: number;
}

export class AnimationController {
  private animations: AnimationState[] = [];
  private idles: Map<string, IdleState> = new Map();
  private idleCounter = 0;

  tick(deltaMS: number): void {
    // Advance one-shot animations
    const completed: AnimationState[] = [];
    for (const anim of this.animations) {
      anim.elapsed += deltaMS;
      const t = Math.min(anim.elapsed / anim.duration, 1);

      if (anim.type === 'move' || anim.type === 'attack') {
        anim.object3D.position.x = anim.fromX + (anim.toX - anim.fromX) * t;
        anim.object3D.position.y = anim.fromY + (anim.toY - anim.fromY) * t;
        anim.object3D.position.z = anim.fromZ + (anim.toZ - anim.fromZ) * t;
      } else if (anim.type === 'death') {
        const sprite = anim.object3D.children[0] as THREE.Sprite;
        if (sprite?.material) {
          (sprite.material as THREE.SpriteMaterial).opacity = 1 - t;
          (sprite.material as THREE.SpriteMaterial).transparent = true;
        }
      }

      if (t >= 1) completed.push(anim);
    }

    for (const anim of completed) {
      const idx = this.animations.indexOf(anim);
      if (idx !== -1) this.animations.splice(idx, 1);
      anim.onComplete?.();
    }

    // Idle bob
    for (const idle of this.idles.values()) {
      if (idle.paused || !idle.object3D.visible) continue;
      idle.totalTime += deltaMS;
      const offset = Math.sin(idle.totalTime / 400 + idle.phase) * 2;
      idle.object3D.position.y = idle.baseY + offset;
    }
  }

  registerIdle(unitId: string, object3D: THREE.Object3D): void {
    this.idles.set(unitId, {
      unitId,
      object3D,
      baseY: object3D.position.y,
      phase: this.idleCounter++ * 1.7,
      paused: false,
      totalTime: 0,
    });
  }

  playMove(
    unitId: string,
    object3D: THREE.Object3D,
    waypoints: Array<{ x: number; y: number; z: number }>,
    msPerTile: number,
    onComplete: () => void,
  ): void {
    this.pauseIdle(unitId);
    this.chainMoveSteps(unitId, object3D, waypoints, 0, msPerTile, onComplete);
  }

  private chainMoveSteps(
    unitId: string,
    object3D: THREE.Object3D,
    waypoints: Array<{ x: number; y: number; z: number }>,
    stepIndex: number,
    msPerTile: number,
    onComplete: () => void,
  ): void {
    if (stepIndex >= waypoints.length - 1) {
      this.resumeIdle(unitId, object3D);
      onComplete();
      return;
    }

    const from = waypoints[stepIndex];
    const to = waypoints[stepIndex + 1];

    this.animations.push({
      unitId,
      type: 'move',
      elapsed: 0,
      duration: msPerTile,
      fromX: from.x, fromY: from.y, fromZ: from.z,
      toX: to.x, toY: to.y, toZ: to.z,
      object3D,
      onComplete: () => {
        this.chainMoveSteps(unitId, object3D, waypoints, stepIndex + 1, msPerTile, onComplete);
      },
    });
  }

  playAttack(
    unitId: string,
    object3D: THREE.Object3D,
    fromPos: { x: number; y: number; z: number },
    targetPos: { x: number; y: number; z: number },
    onComplete: () => void,
  ): void {
    this.pauseIdle(unitId);
    const lungeX = fromPos.x + (targetPos.x - fromPos.x) * 0.4;
    const lungeY = fromPos.y + (targetPos.y - fromPos.y) * 0.4;
    const lungeZ = fromPos.z + (targetPos.z - fromPos.z) * 0.4;

    this.animations.push({
      unitId,
      type: 'attack',
      elapsed: 0,
      duration: 200,
      fromX: fromPos.x, fromY: fromPos.y, fromZ: fromPos.z,
      toX: lungeX, toY: lungeY, toZ: lungeZ,
      object3D,
      onComplete: () => {
        this.animations.push({
          unitId,
          type: 'attack',
          elapsed: 0,
          duration: 150,
          fromX: lungeX, fromY: lungeY, fromZ: lungeZ,
          toX: fromPos.x, toY: fromPos.y, toZ: fromPos.z,
          object3D,
          onComplete: () => {
            this.resumeIdle(unitId, object3D);
            onComplete();
          },
        });
      },
    });
  }

  playDeath(
    unitId: string,
    object3D: THREE.Object3D,
    onComplete: () => void,
  ): void {
    this.pauseIdle(unitId);
    this.animations.push({
      unitId,
      type: 'death',
      elapsed: 0,
      duration: 400,
      fromX: object3D.position.x, fromY: object3D.position.y, fromZ: object3D.position.z,
      toX: object3D.position.x, toY: object3D.position.y, toZ: object3D.position.z,
      object3D,
      onComplete: () => {
        this.idles.delete(unitId);
        onComplete();
      },
    });
  }

  isAnimating(): boolean {
    return this.animations.length > 0;
  }

  isUnitAnimating(unitId: string): boolean {
    return this.animations.some(a => a.unitId === unitId);
  }

  updateIdleBaseY(unitId: string, y: number): void {
    const idle = this.idles.get(unitId);
    if (idle) idle.baseY = y;
  }

  cancelUnit(unitId: string): void {
    this.animations = this.animations.filter(a => a.unitId !== unitId);
    this.idles.delete(unitId);
  }

  private pauseIdle(unitId: string): void {
    const idle = this.idles.get(unitId);
    if (idle) idle.paused = true;
  }

  private resumeIdle(unitId: string, object3D: THREE.Object3D): void {
    const idle = this.idles.get(unitId);
    if (idle) {
      idle.paused = false;
      idle.baseY = object3D.position.y;
    }
  }
}
