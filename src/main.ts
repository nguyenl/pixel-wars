/**
 * src/main.ts
 *
 * Game loop entry point. Orchestrates:
 * - Main menu → map size selection → newGame
 * - Human turn: render → accept input → end-turn
 * - AI turn: thinking (Web Worker) → sequential animation playback → endAiTurn
 * - Victory: show screen → return to menu
 */

import type { GameState, MapSizeOption, PlayerId, Action, MoveAction, AttackAction } from './game/types';
import { newGame, applyAction } from './game/state';
import { endAiTurn } from './game/turns';
import { computeTurn } from './game/ai/ai';
import { GameRenderer } from './renderer/renderer';
import { InputHandler } from './input/input';
import { SoundManager } from './audio/sound';
import AiWorker from './game/ai/ai.worker?worker';

const HUMAN_PLAYER: PlayerId = 'player1';

class Game {
  private renderer!: GameRenderer;
  private state!: GameState;
  private isAiRunning = false;
  private aiWorker: Worker | null = null;

  async start(): Promise<void> {
    const container = document.getElementById('game-area');
    if (!container) throw new Error('#app element not found');

    this.renderer = new GameRenderer();
    await this.renderer.init(container);
    this.showMenu();
  }

  private showMenu(): void {
    this.renderer.showMainMenu((size) => this.startGame(size));
  }

  private async startGame(size: MapSizeOption): Promise<void> {
    this.renderer.hideMainMenu();
    this.state = newGame(size);

    new InputHandler(
      this.renderer,
      this.renderer.uiRenderer,
      HUMAN_PLAYER,
      (newState) => this.onStateUpdate(newState),
      () => this.state,
      new SoundManager(),
    );

    this.render();
  }

  private onStateUpdate(newState: GameState): void {
    this.state = newState;
    this.render();

    if (newState.phase === 'victory') {
      this.renderer.showVictoryScreen(newState.winner!, () => this.resetGame());
      return;
    }

    if (newState.phase === 'ai' && !this.isAiRunning) {
      this.runAiTurn();
    }
  }

  private render(): void {
    this.renderer.render(this.state, HUMAN_PLAYER);
  }

  private async runAiTurn(): Promise<void> {
    this.isAiRunning = true;

    // Phase 1: Thinking — compute AI actions via Web Worker
    this.renderer.showThinkingIndicator();
    let actions: Action[];

    try {
      actions = await this.computeAiActions(this.state);
    } catch (err) {
      // Fallback to main-thread computation
      console.warn('[AI] Worker failed, falling back to main thread:', err);
      actions = computeTurn(this.state);
    }

    this.renderer.hideThinkingIndicator();

    // Phase 2: Animating — play back each action sequentially
    for (const action of actions) {
      if (action.type === 'end-turn') break;

      // Record pre-action unit state for detecting deaths
      const preUnits = { ...this.state.units };

      const result = applyAction(this.state, action);
      if (!result.ok) {
        console.error('[AI] Unexpected action failure:', action, result);
        continue;
      }

      this.state = result.state;

      // Animate the action and wait for completion
      if (action.type === 'move') {
        await this.animateAiMove(action);
      } else if (action.type === 'attack') {
        await this.animateAiAttack(action, preUnits);
      } else {
        // Produce/upgrade: just render the new state
        this.render();
      }
    }

    // Phase 3: Complete — transition back to player's turn
    this.state = endAiTurn(this.state);
    this.isAiRunning = false;
    this.render();

    if (this.state.phase === 'victory') {
      this.renderer.showVictoryScreen(this.state.winner!, () => this.resetGame());
    }
  }

  private computeAiActions(state: GameState): Promise<Action[]> {
    return new Promise((resolve, reject) => {
      try {
        this.aiWorker = new AiWorker();
      } catch {
        // Worker instantiation failed (e.g., during tests)
        resolve(computeTurn(state));
        return;
      }

      const worker = this.aiWorker;

      worker.onmessage = (event: MessageEvent<Action[]>) => {
        worker.terminate();
        this.aiWorker = null;
        resolve(event.data);
      };

      worker.onerror = (err) => {
        worker.terminate();
        this.aiWorker = null;
        reject(err);
      };

      worker.postMessage(state);
    });
  }

  private animateAiMove(action: MoveAction): Promise<void> {
    return new Promise<void>((resolve) => {
      this.renderer.animateMove(action.unitId, action.path, () => {
        this.render();
        resolve();
      });
    });
  }

  private animateAiAttack(
    action: AttackAction,
    preUnits: Record<string, { hp: number }>,
  ): Promise<void> {
    const target = preUnits[action.targetUnitId];
    const attacker = preUnits[action.attackerUnitId];
    const targetTile = this.state.tiles[
      Object.values(this.state.units).find(u => u.id === action.targetUnitId)?.tileId ?? ''
    ];

    // If the target no longer exists in state, it was destroyed
    const targetDestroyed = !this.state.units[action.targetUnitId];
    // If the attacker no longer exists in state, it was destroyed (counterattack)
    const attackerDestroyed = !this.state.units[action.attackerUnitId];

    // Compute damage for floating numbers
    const postTarget = this.state.units[action.targetUnitId];
    const postAttacker = this.state.units[action.attackerUnitId];
    const defenderDamage = target ? target.hp - (postTarget?.hp ?? 0) : 0;
    const attackerDamage = attacker ? attacker.hp - (postAttacker?.hp ?? 0) : 0;

    // Find the attacker tile coord for counterattack damage display
    const attackerTile = this.state.tiles[
      Object.values(this.state.units).find(u => u.id === action.attackerUnitId)?.tileId ?? ''
    ];

    return new Promise<void>((resolve) => {
      // Find the target tile coord from pre-action state
      // The target might have been destroyed, so look up its tile from previous state
      const targetCoord = targetTile?.coord;
      if (!targetCoord) {
        this.render();
        resolve();
        return;
      }

      this.renderer.animateAttack(action.attackerUnitId, targetCoord, () => {
        // Show floating damage numbers
        if (defenderDamage > 0) {
          this.renderer.showDamageNumber(targetCoord, defenderDamage, 0xff4444);
        }
        if (attackerDamage > 0 && attackerTile?.coord) {
          this.renderer.showDamageNumber(attackerTile.coord, attackerDamage, 0xffaa44);
        }

        if (targetDestroyed) {
          this.renderer.animateDeath(action.targetUnitId, () => {
            this.render();
            if (attackerDestroyed) {
              this.renderer.animateDeath(action.attackerUnitId, () => {
                this.render();
                resolve();
              });
            } else {
              resolve();
            }
          });
        } else if (attackerDestroyed) {
          this.renderer.animateDeath(action.attackerUnitId, () => {
            this.render();
            resolve();
          });
        } else {
          this.render();
          resolve();
        }
      });
    });
  }

  private resetGame(): void {
    this.aiWorker?.terminate();
    this.aiWorker = null;
    this.renderer.destroy();
    const container = document.getElementById('app')!;
    this.renderer = new GameRenderer();
    this.renderer.init(container).then(() => this.showMenu());
  }
}

new Game().start().catch(console.error);
