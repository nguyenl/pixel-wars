/**
 * contracts/renderer.ts
 *
 * Renderer Interface Contract — what the renderer layer (src/renderer/)
 * accepts from the game logic layer.
 *
 * The renderer is a pure view: it receives GameState (read-only) and the
 * player's perspective (which player is human) and draws the result.
 * It MUST NOT call any game engine functions or mutate state.
 *
 * All PixiJS implementation details are hidden behind this interface.
 * This makes the renderer swappable (e.g., headless for testing, or
 * replaced with a network-aware renderer for multiplayer).
 *
 * Consumers: src/main.ts (wires game loop to renderer)
 */

import type { GameState, PlayerId, TileCoord } from './game-state';

// ---------------------------------------------------------------------------
// Renderer Interface
// ---------------------------------------------------------------------------

export interface Renderer {
  /**
   * Initialize the PixiJS application and attach to the DOM.
   * Must be called once before any render calls.
   * Returns a promise that resolves when all assets are loaded.
   */
  init(container: HTMLElement): Promise<void>;

  /**
   * Render the complete game state from the human player's perspective.
   * Called every frame during gameplay.
   * The renderer reads `state.fog[humanPlayerId]` to apply fog of war.
   */
  render(state: GameState, humanPlayerId: PlayerId): void;

  /**
   * Highlight tiles that are valid move destinations for the selected unit.
   * Called after the human selects a unit.
   * Pass an empty array to clear highlights.
   */
  highlightReachable(coords: TileCoord[]): void;

  /**
   * Highlight tiles containing attackable enemy units.
   * Called after movement, if the unit can still attack.
   * Pass an empty array to clear highlights.
   */
  highlightAttackable(coords: TileCoord[]): void;

  /**
   * Show the main menu overlay.
   * Calls `onMapSizeSelected` when the player chooses a map size.
   */
  showMainMenu(onMapSizeSelected: (size: import('./game-state').MapSizeOption) => void): void;

  /**
   * Hide the main menu overlay and show the game board.
   */
  hideMainMenu(): void;

  /**
   * Show the victory screen overlay.
   * Calls `onReturnToMenu` when the player clicks the return button.
   */
  showVictoryScreen(winner: PlayerId, onReturnToMenu: () => void): void;

  /**
   * Clean up all PixiJS resources and remove the canvas from the DOM.
   * Call before navigating away or starting a new game.
   */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Input Event Interface
// ---------------------------------------------------------------------------

/**
 * Tile click events emitted by the renderer's input handler.
 * The renderer converts raw mouse/touch coordinates to tile coordinates
 * and emits these typed events for the input layer to process.
 */
export interface TileClickEvent {
  coord: TileCoord;
  /** The tile's current contents at time of click */
  tileId: string;
}

export interface InputHandler {
  /**
   * Register a callback for tile click events.
   * Replaces any previously registered handler.
   */
  onTileClick(handler: (event: TileClickEvent) => void): void;

  /**
   * Register a callback for the "End Turn" button click.
   */
  onEndTurn(handler: () => void): void;

  /**
   * Register a callback for production order selection in the city menu.
   */
  onProduceOrder(
    handler: (settlementId: string, unitType: import('./game-state').UnitType) => void,
  ): void;
}
