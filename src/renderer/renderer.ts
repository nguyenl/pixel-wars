/**
 * src/renderer/renderer.ts
 *
 * Three.js WebGL application setup and main render coordinator.
 * Reads GameState (read-only) and delegates to TilemapRenderer, UnitsRenderer,
 * FogRenderer, and UIRenderer.
 *
 * T009/T011/T012/T013/T014/T015/T016/T017/T018: Full Three.js implementation.
 */

import * as THREE from 'three';
import type { GameState, PlayerId, TileCoord, MapSizeOption, GameStats } from '../game/types';
import { TilemapRenderer } from './tilemap';
import { UnitsRenderer } from './units';
import { FogRenderer } from './fog';
import { UIRenderer } from './ui';
import { clientToNDC } from './viewport';
import { TAP_DISTANCE_THRESHOLD, pinchDistance, pinchMidpoint, type ActivePointer } from '../input/gesture';

const TILE_SIZE = 32;
const BASE_FRUSTUM_HALF = 200; // world units — half frustum height at zoom=1

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 1.1;
const DRAG_THRESHOLD = 4;

export class GameRenderer {
  private webglRenderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private clock = new THREE.Timer();
  private animFrameId = 0;

  private tilemapRenderer!: TilemapRenderer;
  private unitsRenderer!: UnitsRenderer;
  private fogRenderer!: FogRenderer;
  uiRenderer!: UIRenderer;

  private highlightedReachable: TileCoord[] = [];
  private highlightedAttackable: TileCoord[] = [];
  private hoverCoord: TileCoord | null = null;
  private container!: HTMLElement;
  private currentMapSize: { rows: number; cols: number } = { rows: 0, cols: 0 };
  private viewportInitialized = false;

  // Viewport state — panX/panZ are world XZ of camera lookAt target
  private panX = 0;
  private panZ = 0;
  private zoom = 1;
  private isPanning = false;
  private wasDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private panStartX = 0;
  private panStartZ = 0;

  private resizeObserver: ResizeObserver | null = null;

  // Multi-touch pointer tracking
  private activePointers = new Map<number, ActivePointer>();
  private gestureMode: 'idle' | 'pending' | 'pan' | 'pinch' = 'idle';
  private pinchStartDist = 0;
  private pinchStartZoom = 1;

  // Thinking indicator div
  private thinkingDiv: HTMLDivElement | null = null;
  private thinkingAnimId = 0;

  // Raycaster for tile click detection and pan/zoom
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private dragStartWorldX = 0;
  private dragStartWorldZ = 0;

  // Last known state for damage number projection
  private lastState: GameState | null = null;
  private lastHumanPlayerId: PlayerId | null = null;

  async init(container: HTMLElement): Promise<void> {
    this.container = container;

    // WebGL availability check (T018)
    const testCanvas = document.createElement('canvas');
    const ctx = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!ctx) {
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'padding:20px;color:#fff;background:#1a1a2e;font-family:monospace;font-size:16px;';
      errDiv.textContent = 'This game requires WebGL. Please use a modern browser.';
      container.appendChild(errDiv);
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    // Three.js WebGLRenderer
    this.webglRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.webglRenderer.setPixelRatio(window.devicePixelRatio || 1);
    this.webglRenderer.setSize(width, height);
    this.webglRenderer.domElement.style.touchAction = 'none';
    container.appendChild(this.webglRenderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Isometric OrthographicCamera
    const halfH = BASE_FRUSTUM_HALF;
    const halfW = halfH * aspect;
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 1, 10000);
    const d = BASE_FRUSTUM_HALF;
    this.camera.position.set(d, d, d);
    this.camera.lookAt(0, 0, 0);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 2, 1);
    this.scene.add(dirLight);

    // Sub-renderers
    this.tilemapRenderer = new TilemapRenderer(this.scene, TILE_SIZE);
    this.unitsRenderer = new UnitsRenderer(this.scene, TILE_SIZE);
    this.unitsRenderer.loadTextures(['scout', 'infantry', 'artillery']);
    this.fogRenderer = new FogRenderer(this.scene, TILE_SIZE);
    this.uiRenderer = new UIRenderer();

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);

    // Input
    const canvas = this.webglRenderer.domElement;
    this.setupPointerEvents(canvas);
    this.setupWheelZoom(canvas);

    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Start game loop (clock.update() must be called each frame for THREE.Timer)
    this.startLoop();
  }

  render(state: GameState, humanPlayerId: PlayerId): void {
    this.lastState = state;
    this.lastHumanPlayerId = humanPlayerId;
    this.currentMapSize = state.mapSize;

    if (!this.viewportInitialized) {
      this.initViewport();
      this.viewportInitialized = true;
    }

    this.tilemapRenderer.render(
      state,
      humanPlayerId,
      this.highlightedReachable,
      this.highlightedAttackable,
      this.hoverCoord,
    );
    this.unitsRenderer.render(state, humanPlayerId, (id) => this.tilemapRenderer.getTileEntry(id));
    this.fogRenderer.render(state, humanPlayerId, (id) => this.tilemapRenderer.getTileEntry(id));
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

  getCanvas(): HTMLCanvasElement {
    return this.webglRenderer.domElement;
  }

  getTileSize(): number {
    return TILE_SIZE;
  }

  /** Returns camera pan as world XZ (exposed as x/y for API compatibility). */
  getWorldOffset(): { x: number; y: number } {
    return { x: this.panX, y: this.panZ };
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
    const group = this.unitsRenderer.getUnitGroup(unitId);
    if (!group) { onComplete(); return; }

    const waypoints = path.map(c => {
      const entry = this.tilemapRenderer.getTileEntry(`${c.row},${c.col}`);
      const tH = entry?.terrainHeight ?? 4;
      return {
        x: c.col * TILE_SIZE,
        y: tH + 12,
        z: c.row * TILE_SIZE,
      };
    });

    this.unitsRenderer.animationController.playMove(unitId, group, waypoints, 150, onComplete);
  }

  animateAttack(unitId: string, targetTileCoord: TileCoord, onComplete: () => void): void {
    const group = this.unitsRenderer.getUnitGroup(unitId);
    if (!group) { onComplete(); return; }

    const fromPos = { x: group.position.x, y: group.position.y, z: group.position.z };
    const entry = this.tilemapRenderer.getTileEntry(`${targetTileCoord.row},${targetTileCoord.col}`);
    const tH = entry?.terrainHeight ?? 4;
    const targetPos = {
      x: targetTileCoord.col * TILE_SIZE,
      y: tH + 12,
      z: targetTileCoord.row * TILE_SIZE,
    };

    this.unitsRenderer.animationController.playAttack(unitId, group, fromPos, targetPos, onComplete);
  }

  animateDeath(unitId: string, onComplete: () => void): void {
    const group = this.unitsRenderer.getUnitGroup(unitId);
    if (!group) { onComplete(); return; }
    this.unitsRenderer.animationController.playDeath(unitId, group, onComplete);
  }

  showDamageNumber(tileCoord: TileCoord, damage: number, color: number = 0xff4444): void {
    const entry = this.tilemapRenderer.getTileEntry(`${tileCoord.row},${tileCoord.col}`);
    const tH = entry?.terrainHeight ?? 4;

    // Project 3D world position to screen coordinates
    const worldPos = new THREE.Vector3(
      tileCoord.col * TILE_SIZE,
      tH + 24,
      tileCoord.row * TILE_SIZE,
    );
    const screenPos = worldPos.clone().project(this.camera);
    const canvas = this.webglRenderer.domElement;
    const sx = (screenPos.x + 1) / 2 * canvas.clientWidth;
    const sy = (1 - screenPos.y) / 2 * canvas.clientHeight;

    const div = document.createElement('div');
    const hex = '#' + color.toString(16).padStart(6, '0');
    div.style.cssText = `
      position: absolute;
      left: ${sx}px; top: ${sy}px;
      transform: translate(-50%, -50%);
      font-family: monospace; font-size: 14px; font-weight: bold;
      color: ${hex};
      text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
      pointer-events: none; user-select: none;
    `;
    div.textContent = `-${damage}`;
    this.container.style.position = 'relative';
    this.container.appendChild(div);

    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / 800, 1);
      div.style.top = `${sy - t * 30}px`;
      div.style.opacity = `${1 - t}`;
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.container.removeChild(div);
      }
    };
    requestAnimationFrame(animate);
  }

  showThinkingIndicator(): void {
    if (this.thinkingDiv) return;
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%);
      font-family: monospace; font-size: 18px; color: #fff;
      pointer-events: none; user-select: none;
    `;
    div.textContent = 'AI is thinking...';
    this.container.style.position = 'relative';
    this.container.appendChild(div);
    this.thinkingDiv = div;

    let alpha = 1;
    let dir = -1;
    const tick = () => {
      alpha += dir * 0.02;
      if (alpha <= 0.3) dir = 1;
      else if (alpha >= 1) dir = -1;
      div.style.opacity = `${alpha}`;
      this.thinkingAnimId = requestAnimationFrame(tick);
    };
    this.thinkingAnimId = requestAnimationFrame(tick);
  }

  hideThinkingIndicator(): void {
    if (!this.thinkingDiv) return;
    cancelAnimationFrame(this.thinkingAnimId);
    this.container.removeChild(this.thinkingDiv);
    this.thinkingDiv = null;
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.hideThinkingIndicator();
    this.uiRenderer.destroy();
    this.webglRenderer.dispose();
    if (this.webglRenderer.domElement.parentNode) {
      this.webglRenderer.domElement.parentNode.removeChild(this.webglRenderer.domElement);
    }
    this.viewportInitialized = false;
  }

  private startLoop(): void {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      this.clock.update();
      const deltaMS = this.clock.getDelta() * 1000;
      this.unitsRenderer.animationController.tick(deltaMS);
      this.webglRenderer.render(this.scene, this.camera);
    };
    loop();
  }

  private initViewport(): void {
    this.zoom = 1;
    this.panX = (this.currentMapSize.cols * TILE_SIZE) / 2;
    this.panZ = (this.currentMapSize.rows * TILE_SIZE) / 2;
    this.applyViewport();
  }

  private applyViewport(): void {
    const canvas = this.webglRenderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const aspect = width / height;
    const halfH = BASE_FRUSTUM_HALF / this.zoom;
    const halfW = halfH * aspect;

    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();

    // Position camera at isometric tripod offset from pan target
    const d = BASE_FRUSTUM_HALF / this.zoom;
    this.camera.position.set(this.panX + d, d, this.panZ + d);
    this.camera.lookAt(this.panX, 0, this.panZ);
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
        this.gestureMode = 'pinch';
        const [a, b] = [...this.activePointers.values()];
        this.pinchStartDist = pinchDistance(a, b);
        this.pinchStartZoom = this.zoom;
        this.wasDragging = true;
      } else if (this.activePointers.size === 1) {
        this.gestureMode = 'pending';
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.panStartX = this.panX;
        this.panStartZ = this.panZ;
        const startWorldPt = this.getGroundPtAtScreen(e.clientX, e.clientY);
        this.dragStartWorldX = startWorldPt?.x ?? this.panX;
        this.dragStartWorldZ = startWorldPt?.z ?? this.panZ;
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
        const [a, b] = [...this.activePointers.values()];
        const currentDist = pinchDistance(a, b);
        if (this.pinchStartDist === 0) return;

        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM,
          this.pinchStartZoom * (currentDist / this.pinchStartDist)));
        this.zoom = newZoom;

        const mid = pinchMidpoint(a, b);
        const rect = canvas.getBoundingClientRect();
        // Keep pinch midpoint world position fixed during zoom
        const ndcBefore = clientToNDC(mid.x - rect.left, mid.y - rect.top, canvas);
        const worldPos = new THREE.Vector3(ndcBefore.x, ndcBefore.y, 0).unproject(this.camera);
        this.applyViewport();
        const ndcAfter = clientToNDC(mid.x - rect.left, mid.y - rect.top, canvas);
        const worldPosAfter = new THREE.Vector3(ndcAfter.x, ndcAfter.y, 0).unproject(this.camera);
        this.panX += worldPos.x - worldPosAfter.x;
        this.panZ += worldPos.z - worldPosAfter.z;

        this.clampAndApplyViewport();
        return;
      }

      if (!this.isPanning) return;

      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      const threshold = e.pointerType === 'mouse' ? DRAG_THRESHOLD : TAP_DISTANCE_THRESHOLD;
      if (!this.wasDragging && Math.sqrt(dx * dx + dy * dy) < threshold) return;

      this.wasDragging = true;
      this.gestureMode = 'pan';

      // Isometric-correct pan: compute world point under current pointer and
      // move camera target so the ground point that was under dragStart stays under pointer.
      const worldPt = this.getGroundPtAtScreen(e.clientX, e.clientY);
      if (worldPt) {
        this.panX = this.panStartX - (worldPt.x - this.dragStartWorldX);
        this.panZ = this.panStartZ - (worldPt.z - this.dragStartWorldZ);
      }
      this.clampAndApplyViewport();
    });

    const endPointer = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);

      if (this.gestureMode === 'pinch' && this.activePointers.size === 1) {
        const remaining = [...this.activePointers.values()][0];
        this.dragStartX = remaining.currentX;
        this.dragStartY = remaining.currentY;
        this.panStartX = this.panX;
        this.panStartZ = this.panZ;
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

      // Sample world point under cursor before zoom
      const before = this.getGroundPtAtScreen(e.clientX, e.clientY);

      const scaleFactor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * scaleFactor));
      this.applyViewport();

      // Shift pan so the world point under cursor stays under cursor
      const after = this.getGroundPtAtScreen(e.clientX, e.clientY);
      if (before && after) {
        this.panX -= after.x - before.x;
        this.panZ -= after.z - before.z;
      }

      this.clampAndApplyViewport();
    }, { passive: false });
  }

  private clampAndApplyViewport(): void {
    // Clamp camera look-at target within world-space map bounds
    const mapW = this.currentMapSize.cols * TILE_SIZE;
    const mapH = this.currentMapSize.rows * TILE_SIZE;
    this.panX = Math.max(0, Math.min(mapW, this.panX));
    this.panZ = Math.max(0, Math.min(mapH, this.panZ));
    this.applyViewport();
  }

  private onResize(): void {
    if (!this.container || !this.webglRenderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.webglRenderer.setSize(width, height);
    this.applyViewport();
  }

  /** Returns the world XZ point on the Y=0 ground plane under a screen position. */
  private getGroundPtAtScreen(clientX: number, clientY: number): THREE.Vector3 | null {
    const canvas = this.webglRenderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const ndc = clientToNDC(clientX - rect.left, clientY - rect.top, canvas);
    this.raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), this.camera);
    const pt = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.groundPlane, pt) ? pt : null;
  }

  /**
   * Cast ray from pointer position and return TileCoord of hit tile mesh.
   * Used by InputHandler to detect tile clicks.
   */
  getTileCoordAtPointer(clientX: number, clientY: number): TileCoord | null {
    const canvas = this.webglRenderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const ndc = clientToNDC(clientX - rect.left, clientY - rect.top, canvas);
    const ndcVec = new THREE.Vector2(ndc.x, ndc.y);
    this.raycaster.setFromCamera(ndcVec, this.camera);
    const hits = this.raycaster.intersectObjects(this.tilemapRenderer.tileGroup.children);
    if (hits.length > 0) {
      return hits[0].object.userData.coord as TileCoord;
    }
    return null;
  }
}
