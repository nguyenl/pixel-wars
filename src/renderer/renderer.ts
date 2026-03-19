/**
 * src/renderer/renderer.ts
 *
 * PixiJS Application setup and main render coordinator.
 * Reads GameState (read-only) and delegates to tilemap, units, fog, and UI renderers.
 * The worldContainer wraps all game-world layers and supports pan/zoom.
 */

import { Application, Container, Assets, Text, TextStyle } from 'pixi.js';
import type { GameState, PlayerId, TileCoord, MapSizeOption, GameStats } from '../game/types';
import { tileId } from '../game/board';
import { TilemapRenderer } from './tilemap';
import { UnitsRenderer } from './units';
import { FogRenderer } from './fog';
import { UIRenderer } from './ui';
import { clampPan } from './viewport';
import { TAP_DISTANCE_THRESHOLD, pinchDistance, pinchMidpoint, type ActivePointer } from '../input/gesture';

const TILE_SIZE = 32; // pixels per tile

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 1.1;
const DRAG_THRESHOLD = 4;

export class GameRenderer {
  private app!: Application;
  private worldContainer!: Container;
  private tilemapRenderer!: TilemapRenderer;
  private unitsRenderer!: UnitsRenderer;
  private fogRenderer!: FogRenderer;
  uiRenderer!: UIRenderer;
  private highlightedReachable: TileCoord[] = [];
  private highlightedAttackable: TileCoord[] = [];
  private hoverCoord: TileCoord | null = null;
  private container!: HTMLElement;
  private currentMapSize: { rows: number; cols: number } = { rows: 0, cols: 0 };
  private thinkingText: Text | null = null;
  private thinkingAlphaDir = 1;

  // Viewport state
  private panX = 0;
  private panY = 0;
  private zoom = 1;
  private isPanning = false;
  private wasDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private viewportInitialized = false;

  private resizeObserver: ResizeObserver | null = null;

  // Multi-touch pointer tracking
  private activePointers = new Map<number, ActivePointer>();
  private gestureMode: 'idle' | 'pending' | 'pan' | 'pinch' = 'idle';
  private pinchStartDist = 0;
  private pinchStartZoom = 1;

  async init(container: HTMLElement): Promise<void> {
    this.container = container;

    this.app = new Application();
    await this.app.init({
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: 0x1a1a2e,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas as HTMLCanvasElement);

    // Load unit sprite textures
    await Assets.load([
      { alias: 'scout', src: 'assets/sprites/units/scout.png' },
      { alias: 'infantry', src: 'assets/sprites/units/infantry.png' },
      { alias: 'artillery', src: 'assets/sprites/units/artillery.png' },
    ]);

    // Handle resize via ResizeObserver (catches both window resize and HUD bar height changes)
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);

    // Create world container for all game-world rendering
    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);

    this.tilemapRenderer = new TilemapRenderer(this.worldContainer, TILE_SIZE);
    this.unitsRenderer = new UnitsRenderer(this.worldContainer, TILE_SIZE, this.app);
    this.fogRenderer = new FogRenderer(this.worldContainer, TILE_SIZE);
    this.uiRenderer = new UIRenderer();

    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.style.touchAction = 'none';
    this.setupPointerEvents(canvas);
    this.setupWheelZoom(canvas);

    // Suppress pull-to-refresh and context menus on mobile
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  render(state: GameState, humanPlayerId: PlayerId): void {
    this.currentMapSize = state.mapSize;
    if (!this.viewportInitialized) {
      this.initViewport();
      this.viewportInitialized = true;
    }
    this.applyViewport();
    this.tilemapRenderer.render(state, this.highlightedReachable, this.highlightedAttackable, this.hoverCoord);
    this.unitsRenderer.render(state, humanPlayerId);
    this.fogRenderer.render(state, humanPlayerId);
    this.uiRenderer.renderHUD(state, humanPlayerId);
  }

  highlightReachable(coords: TileCoord[]): void {
    this.highlightedReachable = coords;
  }

  highlightAttackable(coords: TileCoord[]): void {
    this.highlightedAttackable = coords;
  }

  showMainMenu(onMapSizeSelected: (size: MapSizeOption) => void): void {
    this.uiRenderer.showMainMenu(onMapSizeSelected);
  }

  hideMainMenu(): void {
    this.uiRenderer.hideMainMenu();
  }

  showScoreboard(stats: Record<PlayerId, GameStats>, winner: PlayerId, onReturnToMenu: () => void): void {
    this.uiRenderer.showScoreboard(stats, winner, onReturnToMenu);
  }

  getApp(): Application {
    return this.app;
  }

  getTileSize(): number {
    return TILE_SIZE;
  }

  getWorldOffset(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }

  getZoom(): number {
    return this.zoom;
  }

  isDragging(): boolean {
    return this.wasDragging;
  }

  setHoverCoord(coord: TileCoord | null): void {
    this.hoverCoord = coord;
  }

  isAnimating(): boolean {
    return this.unitsRenderer.animationController.isAnimating();
  }

  animateMove(unitId: string, path: TileCoord[], onComplete: () => void): void {
    const container = this.unitsRenderer.getUnitContainer(unitId);
    if (!container) { onComplete(); return; }

    const waypoints = path.map(c => ({
      x: c.col * TILE_SIZE + TILE_SIZE / 2,
      y: c.row * TILE_SIZE + TILE_SIZE / 2,
    }));

    this.unitsRenderer.animationController.playMove(unitId, container, waypoints, 150, onComplete);
  }

  animateAttack(unitId: string, targetTileCoord: TileCoord, onComplete: () => void): void {
    const container = this.unitsRenderer.getUnitContainer(unitId);
    if (!container) { onComplete(); return; }

    const fromPos = { x: container.x, y: container.y };
    const targetPos = {
      x: targetTileCoord.col * TILE_SIZE + TILE_SIZE / 2,
      y: targetTileCoord.row * TILE_SIZE + TILE_SIZE / 2,
    };

    this.unitsRenderer.animationController.playAttack(unitId, container, fromPos, targetPos, onComplete);
  }

  animateDeath(unitId: string, onComplete: () => void): void {
    const container = this.unitsRenderer.getUnitContainer(unitId);
    if (!container) { onComplete(); return; }
    this.unitsRenderer.animationController.playDeath(unitId, container, onComplete);
  }

  showDamageNumber(tileCoord: TileCoord, damage: number, color: number = 0xff4444): void {
    const x = tileCoord.col * TILE_SIZE + TILE_SIZE / 2;
    const y = tileCoord.row * TILE_SIZE;
    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fontWeight: 'bold',
      fill: color,
      stroke: { color: 0x000000, width: 3 },
    });
    const text = new Text({ text: `-${damage}`, style });
    text.anchor.set(0.5);
    text.position.set(x, y);
    this.worldContainer.addChild(text);

    const startY = y;
    const duration = 800;
    let elapsed = 0;

    const tick = (ticker: { deltaMS: number }) => {
      elapsed += ticker.deltaMS;
      const t = Math.min(elapsed / duration, 1);
      text.y = startY - t * 30;
      text.alpha = 1 - t;
      if (t >= 1) {
        this.app.ticker.remove(tick);
        this.worldContainer.removeChild(text);
        text.destroy();
      }
    };
    this.app.ticker.add(tick);
  }

  showThinkingIndicator(): void {
    if (this.thinkingText) return;
    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 18,
      fill: 0xffffff,
      align: 'center',
    });
    this.thinkingText = new Text({ text: 'AI is thinking...', style });
    this.thinkingText.anchor.set(0.5);
    this.thinkingText.x = this.app.renderer.width / 2;
    this.thinkingText.y = this.app.renderer.height - 50;
    this.thinkingText.alpha = 1;
    this.thinkingAlphaDir = -1;
    this.app.stage.addChild(this.thinkingText);

    this.app.ticker.add(this.tickThinking, this);
  }

  hideThinkingIndicator(): void {
    if (!this.thinkingText) return;
    this.app.ticker.remove(this.tickThinking, this);
    this.app.stage.removeChild(this.thinkingText);
    this.thinkingText.destroy();
    this.thinkingText = null;
  }

  private tickThinking(): void {
    if (!this.thinkingText) return;
    this.thinkingText.alpha += this.thinkingAlphaDir * 0.02;
    if (this.thinkingText.alpha <= 0.3) {
      this.thinkingAlphaDir = 1;
    } else if (this.thinkingText.alpha >= 1) {
      this.thinkingAlphaDir = -1;
    }
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.hideThinkingIndicator();
    this.uiRenderer.destroy();
    this.app.destroy(true);
    this.viewportInitialized = false;
  }

  private initViewport(): void {
    this.zoom = 1;
    const clamped = clampPan(
      0, 0,
      this.zoom,
      this.app.renderer.width,
      this.app.renderer.height,
      this.currentMapSize.cols,
      this.currentMapSize.rows,
      TILE_SIZE,
    );
    this.panX = clamped.x;
    this.panY = clamped.y;
    this.applyViewport();
  }

  private applyViewport(): void {
    this.worldContainer.x = this.panX;
    this.worldContainer.y = this.panY;
    this.worldContainer.scale.set(this.zoom);
  }

  private setupPointerEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', (e) => {
      const pointer: ActivePointer = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
        currentX: e.clientX,
        currentY: e.clientY,
      };
      this.activePointers.set(e.pointerId, pointer);

      if (this.activePointers.size === 2) {
        // Enter pinch mode
        this.gestureMode = 'pinch';
        const [a, b] = [...this.activePointers.values()];
        this.pinchStartDist = pinchDistance(a, b);
        this.pinchStartZoom = this.zoom;
        this.wasDragging = true; // prevent tap on release
      } else if (this.activePointers.size === 1) {
        this.gestureMode = 'pending';
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.panStartX = this.panX;
        this.panStartY = this.panY;
        this.wasDragging = false;
        this.isPanning = true;
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      const pointer = this.activePointers.get(e.pointerId);
      if (!pointer) return;
      pointer.currentX = e.clientX;
      pointer.currentY = e.clientY;

      if (this.gestureMode === 'pinch' && this.activePointers.size === 2) {
        // Pinch-to-zoom
        const [a, b] = [...this.activePointers.values()];
        const currentDist = pinchDistance(a, b);
        if (this.pinchStartDist === 0) return;

        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM,
          this.pinchStartZoom * (currentDist / this.pinchStartDist)));

        const mid = pinchMidpoint(a, b);
        const rect = canvas.getBoundingClientRect();
        const midX = mid.x - rect.left;
        const midY = mid.y - rect.top;

        const worldPointX = (midX - this.panX) / this.zoom;
        const worldPointY = (midY - this.panY) / this.zoom;

        this.zoom = newZoom;
        this.panX = midX - worldPointX * this.zoom;
        this.panY = midY - worldPointY * this.zoom;

        const clamped = clampPan(
          this.panX, this.panY, this.zoom,
          this.app.renderer.width, this.app.renderer.height,
          this.currentMapSize.cols, this.currentMapSize.rows, TILE_SIZE,
        );
        this.panX = clamped.x;
        this.panY = clamped.y;
        this.applyViewport();
        return;
      }

      if (!this.isPanning) return;

      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      const threshold = e.pointerType === 'mouse' ? DRAG_THRESHOLD : TAP_DISTANCE_THRESHOLD;
      if (!this.wasDragging && Math.sqrt(dx * dx + dy * dy) < threshold) return;

      this.wasDragging = true;
      this.gestureMode = 'pan';
      const clamped = clampPan(
        this.panStartX + dx, this.panStartY + dy,
        this.zoom,
        this.app.renderer.width, this.app.renderer.height,
        this.currentMapSize.cols, this.currentMapSize.rows, TILE_SIZE,
      );
      this.panX = clamped.x;
      this.panY = clamped.y;
      this.applyViewport();
    });

    const endPointer = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);

      if (this.gestureMode === 'pinch' && this.activePointers.size === 1) {
        // Transition from pinch to pan: reset drag origin to remaining pointer
        const remaining = [...this.activePointers.values()][0];
        this.dragStartX = remaining.currentX;
        this.dragStartY = remaining.currentY;
        this.panStartX = this.panX;
        this.panStartY = this.panY;
        this.gestureMode = 'pan';
        this.isPanning = true;
        return;
      }

      if (this.activePointers.size === 0) {
        this.isPanning = false;
        this.gestureMode = 'idle';
      }
    };

    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointerleave', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
  }

  private setupWheelZoom(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      const scaleFactor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * scaleFactor));

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldPointX = (mouseX - this.panX) / this.zoom;
      const worldPointY = (mouseY - this.panY) / this.zoom;

      this.zoom = newZoom;
      this.panX = mouseX - worldPointX * this.zoom;
      this.panY = mouseY - worldPointY * this.zoom;

      const clamped = clampPan(
        this.panX, this.panY, this.zoom,
        this.app.renderer.width, this.app.renderer.height,
        this.currentMapSize.cols, this.currentMapSize.rows, TILE_SIZE,
      );
      this.panX = clamped.x;
      this.panY = clamped.y;
      this.applyViewport();
    }, { passive: false });
  }

  private onResize(): void {
    if (!this.container) return;
    this.app.renderer.resize(this.container.clientWidth, this.container.clientHeight);
    const clamped = clampPan(
      this.panX,
      this.panY,
      this.zoom,
      this.app.renderer.width,
      this.app.renderer.height,
      this.currentMapSize.cols,
      this.currentMapSize.rows,
      TILE_SIZE,
    );
    this.panX = clamped.x;
    this.panY = clamped.y;
    this.applyViewport();
  }
}
