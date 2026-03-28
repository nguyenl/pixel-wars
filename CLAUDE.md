# pixel-wars Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-28

## Active Technologies
- **Current rendering stack**: TypeScript 5.x + `three` + `@types/three` (3D WebGL isometric rendering) (016-canvas-to-webgl)
- TypeScript 5.x + `simplex-noise` 4.x (map generation), Vitest 2.x (tests)
- DOM overlays for HUD (ui.ts unchanged from earlier features)

**Note**: `pixi.js` and `@pixi/tilemap` were removed in feature 016-canvas-to-webgl. All historical references to PixiJS in older feature entries below are superseded.

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x: Follow standard conventions

## Recent Changes
- 016-canvas-to-webgl: Replaced PixiJS 2D rendering with Three.js WebGL 3D isometric rendering. `pixi.js` + `@pixi/tilemap` removed from dependencies. `three` + `@types/three` added.
- 015-ai-capture-priority: AI prioritizes capturing bases (now using Three.js rendering)
- 013-strategic-ai-overhaul: Strategic AI overhaul (now using Three.js rendering)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
