# Quickstart: Mobile Browser Support

**Feature**: 010-mobile-browser-support
**Date**: 2026-03-17

## Prerequisites

- Node.js 18+ and npm
- A mobile device or browser DevTools device emulation for testing

## Setup

```bash
git checkout 010-mobile-browser-support
npm install    # No new dependencies for this feature
npm run dev    # Start Vite dev server
```

## Testing on Mobile

1. Find your local IP: the Vite dev server prints it (e.g., `http://192.168.x.x:5173`)
2. Open that URL on your mobile device (must be on the same network)
3. Alternatively, use Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M) for emulation

## Key Files to Modify

| File | Change |
|------|--------|
| `index.html` | Update viewport meta tag |
| `src/renderer/renderer.ts` | Replace mouse pan/zoom with pointer events, add pinch-to-zoom |
| `src/input/input.ts` | Replace click/mousemove with pointer events, add tap detection |
| `src/renderer/ui.ts` | Reposition HUD, increase button sizes, add touch CSS |

## Running Tests

```bash
npm test       # Run all Vitest tests
npm run lint   # Run linter
```

## Manual Test Checklist

- [ ] Tap unit to select → highlights appear
- [ ] Tap reachable tile → unit moves
- [ ] Tap enemy → attack executes
- [ ] One-finger drag → map pans
- [ ] Two-finger pinch → map zooms
- [ ] Quick tap does NOT pan
- [ ] Status bar visible below browser chrome
- [ ] End Turn button large enough to tap
- [ ] Production menu buttons tappable
- [ ] Pull-to-refresh blocked
- [ ] Double-tap does NOT zoom page
- [ ] Desktop mouse still works identically
