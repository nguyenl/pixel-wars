# Research: Game UI Enhancements

## R1: Control Panel — Computing Income and Settlement Counts

**Decision**: Derive income, city count, and town count from `GameState.settlements` on each render call, filtering by `owner === humanPlayerId`.

**Rationale**: The existing `renderHUD()` already reads state every frame and rebuilds HTML via innerHTML. Adding 3 more computed values (iterate settlements once) has negligible cost. No caching needed — settlement count is O(n) where n is ~6-20 settlements.

**Alternatives considered**:
- Store derived counts in GameState: Rejected — violates simplicity (redundant state) and requires updating everywhere settlements change.
- Separate derived-state cache: Rejected — premature optimization for <20 settlements.

## R2: Unit Tooltip — Hover Detection and Positioning

**Decision**: Extend the existing `pointermove` handler in InputHandler to detect when the cursor is over a unit tile. Show an HTML tooltip (DOM element) near the cursor, using the same overlay pattern as existing panels.

**Rationale**: The InputHandler already computes tile coordinates from pointer events. Adding unit detection is a simple lookup: `tile.unitId → state.units[unitId]`. DOM tooltips match the existing UI pattern and are trivial to position relative to the cursor.

**Alternatives considered**:
- PixiJS-rendered tooltip: Rejected — would need to handle world-to-screen coordinate transforms for text, and wouldn't auto-wrap text. DOM overlay is simpler and matches existing UI.
- Show tooltip on click instead of hover: Rejected — conflicts with existing click-to-select behavior. Hover is non-intrusive.

**Mobile long-press approach**: Track `pointerdown` timestamp. If pointer is held for 500ms without significant movement, show tooltip. Dismiss on `pointerup`.

## R3: Floating Damage Numbers — Rendering Approach

**Decision**: Use PixiJS `Text` objects spawned in the worldContainer during attack animations. Each damage number floats upward and fades out over ~800ms, then is destroyed.

**Rationale**: Damage numbers must move with the game world (pan/zoom) since they're anchored to unit positions. PixiJS Text in the worldContainer achieves this automatically. The AnimationController already manages per-frame updates via the Ticker, so adding a damage number animation type is a natural extension.

**Alternatives considered**:
- DOM-based floating numbers: Rejected — would need manual world-to-screen coordinate conversion on every frame during pan/zoom. PixiJS Text in worldContainer handles this for free.
- Particle system: Rejected — over-engineered for simple text fade-out.

**Data flow**: The `CombatResult` type already contains `attackerHpAfter`, `defenderHpAfter`, and `counterattackOccurred`. The damage values can be computed as `(pre-combat HP) - (post-combat HP)` at the call site. Pass damage values to a new `showDamageNumber()` method on the renderer.

## R4: Instructions Overlay — Content and Dismissal

**Decision**: Add a full-screen DOM overlay (same pattern as main menu and victory screen) triggered by a "?" help button in the HUD bar. Content is static HTML covering all game mechanics. Dismiss via close button or Escape key.

**Rationale**: The existing menu and victory screen already use the same full-screen overlay pattern with `position: fixed; inset: 0`. Adding another overlay is consistent and simple. A "?" button in the HUD bar is discoverable and doesn't take much space.

**Alternatives considered**:
- Modal dialog: Rejected — no benefit over full-screen overlay; the overlay pattern is already established.
- Separate page/route: Rejected — game is single-page; no routing exists.

**Input blocking**: The overlay's `z-index` (set higher than the canvas) naturally prevents game interaction. The overlay's pointerdown handler calls `stopPropagation()` via the existing `applyMobileStyles()` utility.
