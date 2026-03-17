/**
 * src/renderer/units.ts
 *
 * Unit sprite rendering using pixel art assets with player color tinting.
 * Suppresses enemy unit rendering on non-visible fog tiles.
 * Includes AnimationController for idle bob, move, attack, and death animations.
 */

import { Application, Container, Graphics, Sprite, Assets, Texture, Ticker } from 'pixi.js';
import type { GameState, PlayerId, UnitType } from '../game/types';

const PLAYER_TINT: Record<PlayerId, number> = {
  player1: 0x2244ff,
  player2: 0xdd2222,
};

const SPRITE_SIZE = 24; // px — fits within 32px tile with 4px padding

export class UnitsRenderer {
  private container: Container;
  private unitGraphics: Map<string, Container> = new Map();
  animationController: AnimationController;

  constructor(private parentContainer: Container, private tileSize: number, app: Application) {
    this.container = new Container();
    this.parentContainer.addChild(this.container);
    this.animationController = new AnimationController(app);
  }

  render(state: GameState, humanPlayerId: PlayerId): void {
    const humanFog = state.fog[humanPlayerId];

    // Remove graphics for destroyed units
    for (const [id, g] of this.unitGraphics) {
      if (!state.units[id]) {
        this.animationController.cancelUnit(id);
        this.container.removeChild(g);
        this.unitGraphics.delete(id);
      }
    }

    for (const [unitId, unit] of Object.entries(state.units)) {
      const tile = state.tiles[unit.tileId];
      if (!tile) continue;

      // Suppress enemy units on non-visible tiles
      const fogState = humanFog[tile.id];
      if (unit.owner !== humanPlayerId && fogState !== 'visible') {
        const existing = this.unitGraphics.get(unitId);
        if (existing) existing.visible = false;
        continue;
      }

      let c = this.unitGraphics.get(unitId);
      if (!c) {
        c = this.createUnitContainer(unit.type, unit.owner);
        this.container.addChild(c);
        this.unitGraphics.set(unitId, c);
        this.animationController.registerIdle(unitId, c);
      }

      c.visible = true;
      // Only update position if not currently animating a one-shot
      if (!this.animationController.isUnitAnimating(unitId)) {
        const x = tile.coord.col * this.tileSize + this.tileSize / 2;
        const y = tile.coord.row * this.tileSize + this.tileSize / 2;
        c.position.set(x, y);
        // Sync idle animation baseY so the bob oscillates around the correct position
        this.animationController.updateIdleBaseY(unitId, y);
      }

      // Update HP indicator
      this.updateHpBar(c, unit.hp, unit.type);
    }
  }

  getUnitContainer(unitId: string): Container | undefined {
    return this.unitGraphics.get(unitId);
  }

  getTileSize(): number {
    return this.tileSize;
  }

  private createUnitContainer(type: UnitType, owner: PlayerId): Container {
    const c = new Container();

    // Try to use pixel art sprite, fall back to colored circle
    const texture = Assets.get<Texture>(type);
    if (texture) {
      const sprite = new Sprite(texture);
      sprite.width = SPRITE_SIZE;
      sprite.height = SPRITE_SIZE;
      sprite.anchor.set(0.5);
      sprite.tint = PLAYER_TINT[owner];
      c.addChild(sprite);
    } else {
      // Fallback: colored circle (if sprite asset failed to load)
      const radius = this.tileSize * 0.35;
      const circle = new Graphics();
      circle.circle(0, 0, radius);
      circle.fill({ color: PLAYER_TINT[owner] });
      circle.stroke({ color: 0xffffff, width: 1.5 });
      c.addChild(circle);
    }

    // HP bar
    const hpBar = new Graphics();
    hpBar.label = 'hpbar';
    const halfSprite = SPRITE_SIZE / 2;
    hpBar.position.set(-halfSprite, halfSprite + 2);
    c.addChild(hpBar);

    return c;
  }

  private updateHpBar(c: Container, hp: number, type: UnitType): void {
    const maxHpMap: Record<UnitType, number> = { scout: 3, infantry: 5, artillery: 4 };
    const maxHp = maxHpMap[type];
    const hpBar = c.getChildByLabel('hpbar') as Graphics;
    if (!hpBar) return;
    const barWidth = SPRITE_SIZE;
    const fraction = hp / maxHp;
    const color = fraction > 0.5 ? 0x44ff44 : fraction > 0.25 ? 0xffaa00 : 0xff2222;

    hpBar.clear();
    hpBar.rect(0, 0, barWidth * fraction, 3);
    hpBar.fill({ color });
  }
}

// ---------------------------------------------------------------------------
// AnimationController — drives idle bob, move, attack, death animations
// ---------------------------------------------------------------------------

interface AnimationState {
  unitId: string;
  type: 'move' | 'attack' | 'death';
  elapsed: number;
  duration: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  container: Container;
  onComplete: (() => void) | null;
  /** For attack: phase 0 = lunge, phase 1 = return */
  phase?: number;
  returnX?: number;
  returnY?: number;
}

interface IdleState {
  unitId: string;
  container: Container;
  baseY: number;
  phase: number;
  paused: boolean;
}

export class AnimationController {
  private animations: AnimationState[] = [];
  private idles: Map<string, IdleState> = new Map();
  private ticker: Ticker;
  private idleCounter = 0;

  constructor(app: Application) {
    this.ticker = app.ticker;
    this.ticker.add(this.tick, this);
  }

  registerIdle(unitId: string, container: Container): void {
    this.idles.set(unitId, {
      unitId,
      container,
      baseY: container.y,
      phase: this.idleCounter++ * 1.7, // varying phase to avoid lockstep
      paused: false,
    });
  }

  playMove(
    unitId: string,
    container: Container,
    waypoints: Array<{ x: number; y: number }>,
    msPerTile: number,
    onComplete: () => void,
  ): void {
    this.pauseIdle(unitId);
    this.chainMoveSteps(unitId, container, waypoints, 0, msPerTile, onComplete);
  }

  private chainMoveSteps(
    unitId: string,
    container: Container,
    waypoints: Array<{ x: number; y: number }>,
    stepIndex: number,
    msPerTile: number,
    onComplete: () => void,
  ): void {
    if (stepIndex >= waypoints.length - 1) {
      this.resumeIdle(unitId, container);
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
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      container,
      onComplete: () => {
        this.chainMoveSteps(unitId, container, waypoints, stepIndex + 1, msPerTile, onComplete);
      },
    });
  }

  playAttack(
    unitId: string,
    container: Container,
    fromPos: { x: number; y: number },
    targetPos: { x: number; y: number },
    onComplete: () => void,
  ): void {
    this.pauseIdle(unitId);
    // Lunge to 40% of the vector toward target
    const lungeX = fromPos.x + (targetPos.x - fromPos.x) * 0.4;
    const lungeY = fromPos.y + (targetPos.y - fromPos.y) * 0.4;

    this.animations.push({
      unitId,
      type: 'attack',
      elapsed: 0,
      duration: 200, // lunge phase
      fromX: fromPos.x,
      fromY: fromPos.y,
      toX: lungeX,
      toY: lungeY,
      container,
      phase: 0,
      returnX: fromPos.x,
      returnY: fromPos.y,
      onComplete: () => {
        // Phase 2: return
        this.animations.push({
          unitId,
          type: 'attack',
          elapsed: 0,
          duration: 150,
          fromX: lungeX,
          fromY: lungeY,
          toX: fromPos.x,
          toY: fromPos.y,
          container,
          phase: 1,
          onComplete: () => {
            this.resumeIdle(unitId, container);
            onComplete();
          },
        });
      },
    });
  }

  playDeath(
    unitId: string,
    container: Container,
    onComplete: () => void,
  ): void {
    this.pauseIdle(unitId);
    this.animations.push({
      unitId,
      type: 'death',
      elapsed: 0,
      duration: 400,
      fromX: container.x,
      fromY: container.y,
      toX: container.x,
      toY: container.y,
      container,
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

  private resumeIdle(unitId: string, container: Container): void {
    const idle = this.idles.get(unitId);
    if (idle) {
      idle.paused = false;
      idle.baseY = container.y;
    }
  }

  private tick = (ticker: Ticker): void => {
    const deltaMS = ticker.deltaMS;

    // Advance one-shot animations
    const completed: AnimationState[] = [];
    for (const anim of this.animations) {
      anim.elapsed += deltaMS;
      const t = Math.min(anim.elapsed / anim.duration, 1);

      if (anim.type === 'move' || anim.type === 'attack') {
        anim.container.x = anim.fromX + (anim.toX - anim.fromX) * t;
        anim.container.y = anim.fromY + (anim.toY - anim.fromY) * t;
      } else if (anim.type === 'death') {
        anim.container.alpha = 1 - t;
      }

      if (t >= 1) {
        completed.push(anim);
      }
    }

    for (const anim of completed) {
      const idx = this.animations.indexOf(anim);
      if (idx !== -1) this.animations.splice(idx, 1);
      anim.onComplete?.();
    }

    // Idle bob
    for (const idle of this.idles.values()) {
      if (idle.paused || !idle.container.visible) continue;
      const offset = Math.sin(ticker.lastTime / 400 + idle.phase) * 2;
      idle.container.y = idle.baseY + offset;
    }
  };
}
