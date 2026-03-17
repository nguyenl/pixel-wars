/**
 * src/input/input.ts
 *
 * Input handler: converts tile click events into game actions.
 * Bridges the renderer (which emits clicks) and the game engine (which processes actions).
 */

import type { GameState, PlayerId, TileCoord, UnitType } from '../game/types';
import { getReachableTiles, getAttackableTargets, findPath } from '../game/pathfinding';
import { applyAction } from '../game/state';
import type { GameRenderer } from '../renderer/renderer';
import type { UIRenderer } from '../renderer/ui';
import type { SoundManager } from '../audio/sound';
import { isTap, TAP_DISTANCE_THRESHOLD, type ActivePointer } from './gesture';

type StateUpdater = (state: GameState) => void;

export class InputHandler {
  private selectedUnitId: string | null = null;
  private reachableTiles: TileCoord[] = [];
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressFired = false;

  constructor(
    private renderer: GameRenderer,
    private ui: UIRenderer,
    private humanPlayerId: PlayerId,
    private onStateUpdate: StateUpdater,
    private getState: () => GameState,
    private sound?: SoundManager,
  ) {
    this.setupCanvasClick();
    this.ui.onEndTurn(() => this.handleEndTurn());
    this.ui.onProduceOrder((settlementId, unitType) =>
      this.handleProduceOrder(settlementId, unitType)
    );
    this.ui.onUpgrade((settlementId) =>
      this.handleUpgrade(settlementId)
    );
  }

  /** Tracks the pointer that went down so we can detect taps on pointerup. */
  private pendingPointer: ActivePointer | null = null;

  private setupCanvasClick(): void {
    const canvas = this.renderer.getApp().canvas as HTMLCanvasElement;

    // Track pointer down for tap detection + long-press tooltip
    canvas.addEventListener('pointerdown', (e) => {
      this.pendingPointer = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
        currentX: e.clientX,
        currentY: e.clientY,
      };
      this.longPressFired = false;

      // Start long-press timer for touch tooltip (500ms)
      if (e.pointerType !== 'mouse') {
        if (this.longPressTimer) clearTimeout(this.longPressTimer);
        const clientX = e.clientX;
        const clientY = e.clientY;
        this.longPressTimer = setTimeout(() => {
          this.longPressTimer = null;
          const state = this.getState();
          const rect = canvas.getBoundingClientRect();
          const offset = this.renderer.getWorldOffset();
          const tileSize = this.renderer.getTileSize();
          const zoom = this.renderer.getZoom();
          const worldX = (clientX - rect.left - offset.x) / zoom;
          const worldY = (clientY - rect.top - offset.y) / zoom;
          const col = Math.floor(worldX / tileSize);
          const row = Math.floor(worldY / tileSize);
          const tileId = `${row},${col}`;
          const tile = state.tiles[tileId];
          const humanFog = state.fog[this.humanPlayerId];
          if (tile?.unitId && humanFog[tileId] === 'visible') {
            const unit = state.units[tile.unitId];
            if (unit) {
              this.longPressFired = true;
              this.ui.showTooltip(unit, clientX, clientY);
            }
          }
        }, 500);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this.pendingPointer && e.pointerId === this.pendingPointer.pointerId) {
        this.pendingPointer.currentX = e.clientX;
        this.pendingPointer.currentY = e.clientY;

        // Cancel long-press if pointer moves too far
        if (this.longPressTimer) {
          const dx = e.clientX - this.pendingPointer.startX;
          const dy = e.clientY - this.pendingPointer.startY;
          if (Math.sqrt(dx * dx + dy * dy) > TAP_DISTANCE_THRESHOLD) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
          }
        }
      }

      const state = this.getState();
      const rect = canvas.getBoundingClientRect();
      const offset = this.renderer.getWorldOffset();
      const tileSize = this.renderer.getTileSize();
      const zoom = this.renderer.getZoom();
      const worldX = (e.clientX - rect.left - offset.x) / zoom;
      const worldY = (e.clientY - rect.top - offset.y) / zoom;

      const mapW = state.mapSize.cols * tileSize;
      const mapH = state.mapSize.rows * tileSize;

      // Mouse hover tooltip — check for unit under cursor
      if (e.pointerType === 'mouse') {
        if (worldX >= 0 && worldY >= 0 && worldX < mapW && worldY < mapH) {
          const col = Math.floor(worldX / tileSize);
          const row = Math.floor(worldY / tileSize);
          const tileId = `${row},${col}`;
          const tile = state.tiles[tileId];
          const humanFog = state.fog[this.humanPlayerId];
          if (tile?.unitId && humanFog[tileId] === 'visible') {
            const unit = state.units[tile.unitId];
            if (unit) {
              this.ui.showTooltip(unit, e.clientX, e.clientY);
            } else {
              this.ui.hideTooltip();
            }
          } else {
            this.ui.hideTooltip();
          }
        } else {
          this.ui.hideTooltip();
        }
      }

      // Hover highlight — only for mouse pointer with selected unit
      if (e.pointerType !== 'mouse') return;
      if (state.phase === 'ai' || this.selectedUnitId === null) {
        this.renderer.setHoverCoord(null);
        return;
      }

      if (worldX < 0 || worldY < 0 || worldX >= mapW || worldY >= mapH) {
        this.renderer.setHoverCoord(null);
        return;
      }

      const col = Math.floor(worldX / tileSize);
      const row = Math.floor(worldY / tileSize);
      this.renderer.setHoverCoord({ row, col });
      this.renderer.render(state, this.humanPlayerId);
    });

    // Tap detection on pointerup
    canvas.addEventListener('pointerup', (e) => {
      const pointer = this.pendingPointer;
      if (!pointer || pointer.pointerId !== e.pointerId) return;
      pointer.currentX = e.clientX;
      pointer.currentY = e.clientY;
      this.pendingPointer = null;

      // Clear long-press timer and dismiss tooltip
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      if (this.longPressFired) {
        this.ui.hideTooltip();
        this.longPressFired = false;
        return; // Don't process as tap
      }

      // Only process taps (not drags/pinches)
      if (this.renderer.isDragging()) return;
      if (!isTap(pointer, Date.now())) return;

      const state = this.getState();
      if (state.phase !== 'orders' || state.currentPlayer !== this.humanPlayerId) return;

      const rect = canvas.getBoundingClientRect();
      const offset = this.renderer.getWorldOffset();
      const tileSize = this.renderer.getTileSize();
      const zoom = this.renderer.getZoom();
      const worldX = (e.clientX - rect.left - offset.x) / zoom;
      const worldY = (e.clientY - rect.top - offset.y) / zoom;

      const mapW = state.mapSize.cols * tileSize;
      const mapH = state.mapSize.rows * tileSize;
      if (worldX < 0 || worldY < 0 || worldX >= mapW || worldY >= mapH) return;

      const col = Math.floor(worldX / tileSize);
      const row = Math.floor(worldY / tileSize);
      this.handleTileClick({ row, col }, state);
    });

    canvas.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') {
        this.renderer.setHoverCoord(null);
        this.ui.hideTooltip();
      }
    });
  }

  private handleTileClick(coord: TileCoord, state: GameState): void {
    if (this.renderer.isAnimating()) return;
    const tileId = `${coord.row},${coord.col}`;
    const tile = state.tiles[tileId];
    if (!tile) return;

    // If a unit is selected: try to move or attack
    if (this.selectedUnitId) {
      const isReachable = this.reachableTiles.some(
        c => c.row === coord.row && c.col === coord.col
      );
      const attackTargets = getAttackableTargets(state, this.selectedUnitId);
      const enemyOnTile = tile.unitId ? state.units[tile.unitId] : null;
      const isAttackTarget = enemyOnTile && attackTargets.includes(enemyOnTile.id ?? '');

      if (isAttackTarget && enemyOnTile) {
        this.doAttack(state, this.selectedUnitId, enemyOnTile.id);
        return;
      }

      if (isReachable) {
        this.doMove(state, this.selectedUnitId, coord);
        return;
      }

      // Deselect
      this.deselect();
    }

    // Select a unit on this tile
    if (tile.unitId) {
      const unit = state.units[tile.unitId];
      if (unit && unit.owner === this.humanPlayerId) {
        this.selectUnit(unit.id, state);
        return;
      }
    }

    // Click on own settlement — show production menu (city) or upgrade panel (town)
    if (tile.settlementId) {
      const settlement = state.settlements[tile.settlementId];
      if (settlement && settlement.owner === this.humanPlayerId) {
        if (settlement.type === 'city') {
          this.ui.showProductionMenu(
            settlement,
            state.players[this.humanPlayerId].funds,
            (sid, utype) => this.handleProduceOrder(sid, utype),
          );
        } else if (settlement.type === 'town') {
          this.ui.showUpgradeButton(
            settlement.id,
            state.players[this.humanPlayerId].funds,
          );
        }
      }
    }
  }

  private selectUnit(unitId: string, state: GameState): void {
    this.selectedUnitId = unitId;
    const unit = state.units[unitId];
    if (!unit) return;
    this.sound?.playSelect();

    this.reachableTiles = getReachableTiles(state, unitId);
    const attackTargets = getAttackableTargets(state, unitId);
    const attackCoords = attackTargets.map(id => {
      const t = state.tiles[state.units[id]?.tileId ?? ''];
      return t?.coord;
    }).filter(Boolean) as TileCoord[];

    this.renderer.highlightReachable(this.reachableTiles);
    this.renderer.highlightAttackable(attackCoords);
    this.ui.showUnitInfo(unit);
    this.renderer.render(state, this.humanPlayerId);
  }

  private deselect(): void {
    this.selectedUnitId = null;
    this.reachableTiles = [];
    this.renderer.highlightReachable([]);
    this.renderer.highlightAttackable([]);
    this.ui.hideUnitInfo();
  }

  private doMove(state: GameState, unitId: string, dest: TileCoord): void {
    const unit = state.units[unitId];
    const unitTile = state.tiles[unit.tileId];
    const path = findPath(state, unitTile.coord, dest, unit.movementPoints);
    if (!path) return;

    const result = applyAction(state, { type: 'move', unitId, path });
    if (result.ok) {
      this.deselect();
      this.sound?.playMove();
      this.renderer.animateMove(unitId, path, () => {
        this.onStateUpdate(result.state);

        // After move, check for attack opportunities
        const attackTargets = getAttackableTargets(result.state, unitId);
        if (attackTargets.length > 0) {
          this.selectUnit(unitId, result.state);
        }
      });
    }
  }

  private doAttack(state: GameState, attackerUnitId: string, targetUnitId: string): void {
    const attacker = state.units[attackerUnitId];
    const target = state.units[targetUnitId];
    const attackerTile = attacker ? state.tiles[attacker.tileId] : null;
    const targetTile = target ? state.tiles[target.tileId] : null;

    // Record pre-combat HP for damage number calculation
    const preAttackerHp = attacker?.hp ?? 0;
    const preTargetHp = target?.hp ?? 0;

    const result = applyAction(state, {
      type: 'attack',
      attackerUnitId,
      targetUnitId,
    });
    if (result.ok && targetTile) {
      // Compute damage dealt
      const postTarget = result.state.units[targetUnitId];
      const postAttacker = result.state.units[attackerUnitId];
      const defenderDamage = preTargetHp - (postTarget?.hp ?? 0);
      const attackerDamage = preAttackerHp - (postAttacker?.hp ?? 0);

      this.deselect();
      this.sound?.playAttack();
      this.renderer.animateAttack(attackerUnitId, targetTile.coord, () => {
        // Show damage on defender
        if (defenderDamage > 0 && targetTile.coord) {
          this.renderer.showDamageNumber(targetTile.coord, defenderDamage, 0xff4444);
        }
        // Show counterattack damage on attacker
        if (attackerDamage > 0 && attackerTile?.coord) {
          this.renderer.showDamageNumber(attackerTile.coord, attackerDamage, 0xffaa44);
        }
        this.onStateUpdate(result.state);
      });
    } else if (result.ok) {
      this.deselect();
      this.onStateUpdate(result.state);
    }
  }

  private handleEndTurn(): void {
    const state = this.getState();
    const result = applyAction(state, { type: 'end-turn' });
    if (result.ok) {
      this.deselect();
      this.onStateUpdate(result.state);
    }
  }

  private handleProduceOrder(settlementId: string, unitType: UnitType): void {
    const state = this.getState();
    const result = applyAction(state, { type: 'produce', settlementId, unitType });
    if (result.ok) {
      this.onStateUpdate(result.state);
    }
  }

  private handleUpgrade(settlementId: string): void {
    const state = this.getState();
    const result = applyAction(state, { type: 'upgrade', settlementId });
    if (result.ok) {
      this.onStateUpdate(result.state);
    }
  }
}
