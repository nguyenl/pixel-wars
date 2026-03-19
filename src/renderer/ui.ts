/**
 * src/renderer/ui.ts
 *
 * HTML overlay UI: main menu, HUD, unit info panel, city production menu, victory screen.
 * Uses DOM elements overlaid on the PixiJS canvas.
 */

import type { GameState, PlayerId, MapSizeOption, UnitType, Settlement, Unit, GameStats } from '../game/types';
import { UNIT_CONFIG, SETTLEMENT_INCOME } from '../game/constants';

/** Compute aggregate player economy stats from game state. */
export function computePlayerStats(state: GameState, playerId: PlayerId): {
  incomePerTurn: number;
  cityCount: number;
  townCount: number;
} {
  let incomePerTurn = 0;
  let cityCount = 0;
  let townCount = 0;
  for (const s of Object.values(state.settlements)) {
    if (s.owner !== playerId) continue;
    incomePerTurn += SETTLEMENT_INCOME[s.type];
    if (s.type === 'city') cityCount++;
    else townCount++;
  }
  return { incomePerTurn, cityCount, townCount };
}

/** Apply mobile-friendly styles and event isolation to a UI panel. */
function applyMobileStyles(el: HTMLElement): void {
  el.style.cssText += ' -webkit-touch-callout: none; -webkit-user-select: none; user-select: none;';
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
}

export class UIRenderer {
  private menuEl: HTMLElement | null = null;
  private hudEl: HTMLElement | null = null;
  private unitInfoEl: HTMLElement | null = null;
  private productionMenuEl: HTMLElement | null = null;
  private victoryEl: HTMLElement | null = null;
  private endTurnHandler: (() => void) | null = null;
  private produceOrderHandler: ((settlementId: string, unitType: UnitType) => void) | null = null;
  private upgradeHandler: ((settlementId: string) => void) | null = null;
  private upgradeEl: HTMLElement | null = null;
  private controlPanelEl: HTMLElement | null = null;
  private tooltipEl: HTMLElement | null = null;
  private instructionsEl: HTMLElement | null = null;

  // ---------------------------------------------------------------------------
  // Main Menu
  // ---------------------------------------------------------------------------

  showMainMenu(onMapSizeSelected: (size: MapSizeOption) => void): void {
    this.hideMainMenu();
    const el = document.createElement('div');
    el.id = 'main-menu';
    el.style.cssText = `
      position: fixed; inset: 0; background: rgba(10,10,30,0.92);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #fff; font-family: monospace; z-index: 100;
    `;
    el.innerHTML = `
      <h1 style="font-size:2.5rem; margin-bottom:0.5rem; letter-spacing:0.1em;">PIXEL WARS</h1>
      <p style="color:#888; margin-bottom:2rem;">Select Map Size</p>
      <div style="display:flex; gap:1rem;">
        <button data-size="small"  style="${MENU_BTN_STYLE}">Small<br><small>20×20</small></button>
        <button data-size="medium" style="${MENU_BTN_STYLE}">Medium<br><small>30×30</small></button>
        <button data-size="large"  style="${MENU_BTN_STYLE}">Large<br><small>40×40</small></button>
      </div>
    `;
    applyMobileStyles(el);
    el.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const size = btn.dataset['size'] as MapSizeOption;
        onMapSizeSelected(size);
      });
    });
    document.body.appendChild(el);
    this.menuEl = el;
  }

  hideMainMenu(): void {
    this.menuEl?.remove();
    this.menuEl = null;
  }

  // ---------------------------------------------------------------------------
  // HUD (persistent during gameplay)
  // ---------------------------------------------------------------------------

  renderHUD(state: GameState, humanPlayerId: PlayerId): void {
    if (!this.hudEl) {
      const el = document.getElementById('hud-bar') as HTMLElement;
      el.style.cssText = `
        padding: max(8px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) 8px max(16px, env(safe-area-inset-left, 0px));
        background: rgba(0,0,0,0.7); color: #fff; font-family: monospace;
        display: flex; gap: 2rem; align-items: center;
        -webkit-touch-callout: none; -webkit-user-select: none; user-select: none;
      `;
      applyMobileStyles(el);
      this.hudEl = el;
    }

    const player = state.players[humanPlayerId];
    const phase = state.currentPlayer === humanPlayerId ? state.phase : 'opponent turn';
    this.hudEl.innerHTML = `
      <span><b>${player.name}</b></span>
      <span>Funds: <b>$${player.funds}</b></span>
      <span>Turn: <b>${state.turn}</b></span>
      <span>Phase: <b>${phase}</b></span>
      ${state.currentPlayer === humanPlayerId && state.phase === 'orders'
        ? `<button id="end-turn-btn" style="${END_TURN_BTN_STYLE}">End Turn</button>`
        : ''}
      <button id="help-btn" style="${HELP_BTN_STYLE}">?</button>
    `;

    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn && this.endTurnHandler) {
      endTurnBtn.addEventListener('click', this.endTurnHandler);
    }

    document.getElementById('help-btn')?.addEventListener('click', () => this.showInstructions());

    // Control panel (top-right)
    const stats = computePlayerStats(state, humanPlayerId);
    if (!this.controlPanelEl) {
      const cp = document.createElement('div');
      cp.id = 'control-panel';
      cp.style.cssText = `
        position: fixed; right: 0;
        padding: 8px 16px;
        padding-right: max(16px, env(safe-area-inset-right, 0px));
        background: rgba(0,0,0,0.7); color: #fff; font-family: monospace;
        border-radius: 0 0 0 6px; z-index: 49;
        -webkit-touch-callout: none; -webkit-user-select: none; user-select: none;
      `;
      applyMobileStyles(cp);
      document.body.appendChild(cp);
      this.controlPanelEl = cp;
    }
    this.controlPanelEl.innerHTML = `
      <span style="color:#ffd700;">Income: <b>+$${stats.incomePerTurn}/turn</b></span><br>
      <span>Cities: <b>${stats.cityCount}</b></span> &nbsp;
      <span>Towns: <b>${stats.townCount}</b></span>
    `;

    // Position control panel directly below the HUD bar
    const hudHeight = this.hudEl?.offsetHeight ?? 0;
    this.controlPanelEl.style.top = `${hudHeight}px`;
  }

  // ---------------------------------------------------------------------------
  // Unit Info Panel
  // ---------------------------------------------------------------------------

  showUnitInfo(unit: Unit): void {
    this.hideUnitInfo();
    const el = document.createElement('div');
    el.id = 'unit-info';
    el.style.cssText = `
      position: fixed; bottom: 8px; left: 8px; background: rgba(0,0,0,0.8);
      color: #fff; font-family: monospace; padding: 12px 16px; border-radius: 6px;
      border: 1px solid #444; z-index: 50; min-width: 150px;
    `;
    const SYMBOLS: Record<UnitType, string> = { scout: 'Scout', infantry: 'Infantry', artillery: 'Artillery' };
    const maxHp: Record<UnitType, number> = { scout: 3, infantry: 5, artillery: 4 };
    el.innerHTML = `
      <b>${SYMBOLS[unit.type]}</b><br>
      HP: ${unit.hp}/${maxHp[unit.type]}<br>
      MP: ${unit.movementPoints}<br>
      Attacked: ${unit.hasAttacked ? 'Yes' : 'No'}
    `;
    applyMobileStyles(el);
    document.body.appendChild(el);
    this.unitInfoEl = el;
  }

  hideUnitInfo(): void {
    this.unitInfoEl?.remove();
    this.unitInfoEl = null;
  }

  // ---------------------------------------------------------------------------
  // City Production Menu
  // ---------------------------------------------------------------------------

  showProductionMenu(
    settlement: Settlement,
    playerFunds: number,
    onOrder: (settlementId: string, unitType: UnitType) => void,
  ): void {
    this.hideProductionMenu();
    const el = document.createElement('div');
    el.id = 'production-menu';
    el.style.cssText = `
      position: fixed; bottom: 8px; right: 8px; background: rgba(0,0,0,0.88);
      color: #fff; font-family: monospace; padding: 16px; border-radius: 8px;
      border: 1px solid #555; z-index: 60; min-width: 180px;
    `;

    if (settlement.productionQueue !== null) {
      el.innerHTML = `<b>City</b><br><span style="color:#888;">Producing: ${settlement.productionQueue}</span>`;
      applyMobileStyles(el);
      document.body.appendChild(el);
      this.productionMenuEl = el;
      return;
    }

    const units: Array<{ type: UnitType; cost: number }> = [
      { type: 'scout', cost: 100 },
      { type: 'infantry', cost: 200 },
      { type: 'artillery', cost: 300 },
    ];

    const rows = units.map(u => {
      const canAfford = playerFunds >= u.cost;
      return `<button data-type="${u.type}" style="${PROD_BTN_STYLE}" ${!canAfford ? 'disabled' : ''}>
        ${u.type} ($${u.cost})
      </button>`;
    }).join('');

    el.innerHTML = `<b>Produce Unit</b><br><small>Funds: $${playerFunds}</small><br><br>${rows}
      <br><button id="prod-close" style="${CLOSE_BTN_STYLE}">Close</button>`;

    el.querySelectorAll('[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        onOrder(settlement.id, (btn as HTMLElement).dataset['type'] as UnitType);
        this.hideProductionMenu();
      });
    });
    el.querySelector('#prod-close')?.addEventListener('click', () => this.hideProductionMenu());

    applyMobileStyles(el);
    document.body.appendChild(el);
    this.productionMenuEl = el;
  }

  hideProductionMenu(): void {
    this.productionMenuEl?.remove();
    this.productionMenuEl = null;
  }

  // ---------------------------------------------------------------------------
  // Upgrade Settlement Panel
  // ---------------------------------------------------------------------------

  showUpgradeButton(settlementId: string, playerFunds: number): void {
    this.hideUpgradeButton();
    const el = document.createElement('div');
    el.id = 'upgrade-panel';
    el.style.cssText = `
      position: fixed; bottom: 8px; right: 8px; background: rgba(0,0,0,0.88);
      color: #fff; font-family: monospace; padding: 16px; border-radius: 8px;
      border: 1px solid #555; z-index: 60; min-width: 180px;
    `;

    const canAfford = playerFunds >= 500;
    el.innerHTML = `
      <b>Town</b><br>
      <small>Funds: $${playerFunds}</small><br><br>
      <button id="upgrade-btn" style="${PROD_BTN_STYLE}" ${!canAfford ? 'disabled' : ''}>
        ${canAfford ? 'Upgrade to City ($500)' : 'Insufficient funds ($500)'}
      </button>
      <br><button id="upgrade-close" style="${CLOSE_BTN_STYLE}">Close</button>
    `;

    if (canAfford) {
      el.querySelector('#upgrade-btn')?.addEventListener('click', () => {
        this.upgradeHandler?.(settlementId);
        this.hideUpgradeButton();
      });
    }
    el.querySelector('#upgrade-close')?.addEventListener('click', () => this.hideUpgradeButton());

    applyMobileStyles(el);
    document.body.appendChild(el);
    this.upgradeEl = el;
  }

  hideUpgradeButton(): void {
    this.upgradeEl?.remove();
    this.upgradeEl = null;
  }

  // ---------------------------------------------------------------------------
  // Victory Screen
  // ---------------------------------------------------------------------------

  showVictoryScreen(winner: PlayerId, onReturnToMenu: () => void): void {
    this.victoryEl?.remove();
    const el = document.createElement('div');
    el.id = 'victory-screen';
    el.style.cssText = `
      position: fixed; inset: 0; background: rgba(10,10,30,0.95);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #fff; font-family: monospace; z-index: 200;
    `;
    const winnerName = winner === 'player1' ? 'Player 1' : 'Player 2';
    el.innerHTML = `
      <h1 style="font-size:3rem; margin-bottom:1rem;">&#x1F3C6; ${winnerName} Wins!</h1>
      <button id="return-menu" style="${MENU_BTN_STYLE}">Return to Main Menu</button>
    `;
    el.querySelector('#return-menu')?.addEventListener('click', () => {
      el.remove();
      onReturnToMenu();
    });
    applyMobileStyles(el);
    document.body.appendChild(el);
    this.victoryEl = el;
  }

  // ---------------------------------------------------------------------------
  // End-Game Scoreboard
  // ---------------------------------------------------------------------------

  showScoreboard(
    stats: Record<PlayerId, GameStats>,
    winner: PlayerId,
    onReturnToMenu: () => void,
  ): void {
    this.victoryEl?.remove();
    const el = document.createElement('div');
    el.id = 'victory-screen';
    el.style.cssText = `
      position: fixed; inset: 0; background: rgba(10,10,30,0.95);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #fff; font-family: monospace; z-index: 200; overflow-y: auto; padding: 1rem;
    `;

    const winnerName = winner === 'player1' ? 'Player 1' : 'AI';
    const p1 = stats['player1'];
    const p2 = stats['player2'];

    const row = (label: string, p1val: number | string, p2val: number | string) =>
      `<tr style="border-bottom:1px solid #333;">
        <td style="padding:8px 12px; color:#aaa;">${label}</td>
        <td style="padding:8px 16px; text-align:center; font-weight:bold;">${p1val}</td>
        <td style="padding:8px 16px; text-align:center; font-weight:bold;">${p2val}</td>
      </tr>`;

    el.innerHTML = `
      <div style="max-width:480px; width:100%;">
        <h1 style="font-size:2rem; text-align:center; margin-bottom:0.5rem;">
          &#x1F3C6; ${winnerName} Wins!
        </h1>
        <h2 style="text-align:center; color:#ffd700; font-size:1.1rem; margin-bottom:1.5rem;">
          Final Scoreboard
        </h2>
        <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
          <thead>
            <tr style="border-bottom:2px solid #555;">
              <th style="padding:8px 12px; text-align:left; color:#888;"></th>
              <th style="padding:8px 16px; color:#4488ff;">Player</th>
              <th style="padding:8px 16px; color:#ff4444;">AI</th>
            </tr>
          </thead>
          <tbody>
            ${row('Units Produced', p1.unitsProduced, p2.unitsProduced)}
            ${row('Units Lost', p1.unitsLost, p2.unitsLost)}
            ${row('Cities at End', p1.citiesAtEnd, p2.citiesAtEnd)}
            ${row('Total Income Earned', '$' + p1.totalIncomeEarned, '$' + p2.totalIncomeEarned)}
          </tbody>
        </table>
        <div style="text-align:center; margin-top:1.5rem;">
          <button id="return-menu" style="${MENU_BTN_STYLE}">Return to Main Menu</button>
        </div>
      </div>
    `;

    el.querySelector('#return-menu')?.addEventListener('click', () => {
      el.remove();
      onReturnToMenu();
    });
    applyMobileStyles(el);
    document.body.appendChild(el);
    this.victoryEl = el;
  }

  // ---------------------------------------------------------------------------
  // Unit Tooltip (hover/long-press)
  // ---------------------------------------------------------------------------

  showTooltip(unit: Unit, screenX: number, screenY: number): void {
    if (!this.tooltipEl) {
      const el = document.createElement('div');
      el.id = 'unit-tooltip';
      el.style.cssText = `
        position: fixed; background: rgba(0,0,0,0.9);
        color: #fff; font-family: monospace; font-size: 0.8rem;
        padding: 8px 12px; border-radius: 4px;
        border: 1px solid #555; z-index: 70; pointer-events: none;
        white-space: nowrap;
      `;
      document.body.appendChild(el);
      this.tooltipEl = el;
    }

    const cfg = UNIT_CONFIG[unit.type];
    const LABELS: Record<UnitType, string> = { scout: 'Scout', infantry: 'Infantry', artillery: 'Artillery' };
    const rangeLabel = cfg.attackRange === 1 ? 'Melee' : String(cfg.attackRange);

    this.tooltipEl.innerHTML = `
      <b>${LABELS[unit.type]}</b><br>
      HP: ${unit.hp}/${cfg.maxHp}<br>
      Move: ${unit.movementPoints}/${cfg.movementAllowance}<br>
      Atk: ${cfg.attackStrength} &nbsp; Def: ${cfg.defenseStrength}<br>
      Range: ${rangeLabel} &nbsp; Vision: ${cfg.visionRange}
    `;

    // Position near cursor, clamped to viewport
    const tipW = 160;
    const tipH = 100;
    let x = screenX + 16;
    let y = screenY + 16;
    if (x + tipW > window.innerWidth) x = screenX - tipW - 8;
    if (y + tipH > window.innerHeight) y = screenY - tipH - 8;
    this.tooltipEl.style.left = `${Math.max(0, x)}px`;
    this.tooltipEl.style.top = `${Math.max(0, y)}px`;
    this.tooltipEl.style.display = 'block';
  }

  hideTooltip(): void {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = 'none';
    }
  }

  // ---------------------------------------------------------------------------
  // Instructions Overlay
  // ---------------------------------------------------------------------------

  showInstructions(): void {
    if (this.instructionsEl) return;
    const el = document.createElement('div');
    el.id = 'instructions-overlay';
    el.style.cssText = `
      position: fixed; inset: 0; background: rgba(10,10,30,0.95);
      display: flex; flex-direction: column; align-items: center;
      color: #fff; font-family: monospace; z-index: 150;
      overflow-y: auto; padding: 2rem;
    `;
    el.innerHTML = `
      <div style="max-width: 600px; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h1 style="font-size: 1.8rem; margin: 0;">How to Play</h1>
          <button id="instr-close" style="${CLOSE_BTN_STYLE}">Close</button>
        </div>

        <h2 style="color: #ffd700; font-size: 1.1rem;">Objective</h2>
        <p style="color: #ccc; line-height: 1.5;">Capture all enemy cities to win. Expand your territory, build units, and destroy your opponent's forces.</p>

        <h2 style="color: #ffd700; font-size: 1.1rem;">Moving Units</h2>
        <p style="color: #ccc; line-height: 1.5;">Click a unit to select it. Blue-highlighted tiles show where it can move. Click a highlighted tile to move. Each unit has limited movement points per turn.</p>

        <h2 style="color: #ffd700; font-size: 1.1rem;">Attacking</h2>
        <p style="color: #ccc; line-height: 1.5;">Select a unit, then click an adjacent enemy (shown in red highlight) to attack. Melee units may receive counterattack damage. Each unit can attack once per turn.</p>

        <h2 style="color: #ffd700; font-size: 1.1rem;">Unit Types</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 0.5rem 0; color: #ccc; font-size: 0.85rem;">
          <tr style="border-bottom: 1px solid #444;">
            <th style="text-align: left; padding: 4px;">Unit</th>
            <th>HP</th><th>Move</th><th>Atk</th><th>Def</th><th>Range</th><th>Vision</th><th>Cost</th>
          </tr>
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 4px;"><b style="color:#88aaff;">Scout</b></td>
            <td style="text-align:center;">3</td><td style="text-align:center;">5</td>
            <td style="text-align:center;">2</td><td style="text-align:center;">1</td>
            <td style="text-align:center;">1</td><td style="text-align:center;">4</td>
            <td style="text-align:center;">$100</td>
          </tr>
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 4px;"><b style="color:#88aaff;">Infantry</b></td>
            <td style="text-align:center;">5</td><td style="text-align:center;">3</td>
            <td style="text-align:center;">4</td><td style="text-align:center;">3</td>
            <td style="text-align:center;">1</td><td style="text-align:center;">2</td>
            <td style="text-align:center;">$200</td>
          </tr>
          <tr>
            <td style="padding: 4px;"><b style="color:#88aaff;">Artillery</b></td>
            <td style="text-align:center;">4</td><td style="text-align:center;">2</td>
            <td style="text-align:center;">6</td><td style="text-align:center;">2</td>
            <td style="text-align:center;">2</td><td style="text-align:center;">2</td>
            <td style="text-align:center;">$300</td>
          </tr>
        </table>

        <h2 style="color: #ffd700; font-size: 1.1rem;">Settlements</h2>
        <p style="color: #ccc; line-height: 1.5;"><b>Cities</b> generate $100/turn and can produce units. <b>Towns</b> generate $50/turn but cannot produce units. Towns can be upgraded to cities for $500. Move a unit onto a neutral or enemy settlement to capture it.</p>

        <h2 style="color: #ffd700; font-size: 1.1rem;">Fog of War</h2>
        <p style="color: #ccc; line-height: 1.5;">You can only see areas within your units' and settlements' vision range. Dark areas are unexplored. Dimmed areas were previously explored but are not currently visible. Enemy units are only shown on visible tiles.</p>

        <h2 style="color: #ffd700; font-size: 1.1rem;">Victory</h2>
        <p style="color: #ccc; line-height: 1.5;">Capture all enemy cities to win. If you lose all your cities, you lose the game.</p>

        <h2 style="color: #ffd700; font-size: 1.1rem;">Controls</h2>
        <p style="color: #ccc; line-height: 1.5;">
          <b>Pan:</b> Click and drag the map<br>
          <b>Zoom:</b> Mouse wheel or pinch gesture<br>
          <b>Select:</b> Click a unit or settlement<br>
          <b>End Turn:</b> Click the End Turn button when done
        </p>
      </div>
    `;

    const closeBtn = el.querySelector('#instr-close')!;
    closeBtn.addEventListener('click', () => this.hideInstructions());

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hideInstructions();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    applyMobileStyles(el);
    document.body.appendChild(el);
    this.instructionsEl = el;
  }

  hideInstructions(): void {
    this.instructionsEl?.remove();
    this.instructionsEl = null;
  }

  isInstructionsOpen(): boolean {
    return this.instructionsEl !== null;
  }

  // ---------------------------------------------------------------------------
  // Event handler registration
  // ---------------------------------------------------------------------------

  onEndTurn(handler: () => void): void {
    this.endTurnHandler = handler;
  }

  onProduceOrder(handler: (settlementId: string, unitType: UnitType) => void): void {
    this.produceOrderHandler = handler;
  }

  onUpgrade(handler: (settlementId: string) => void): void {
    this.upgradeHandler = handler;
  }

  destroy(): void {
    if (this.hudEl) { this.hudEl.innerHTML = ''; this.hudEl = null; }
    this.menuEl?.remove();
    this.unitInfoEl?.remove();
    this.productionMenuEl?.remove();
    this.upgradeEl?.remove();
    this.victoryEl?.remove();
    this.controlPanelEl?.remove();
    this.tooltipEl?.remove();
    this.instructionsEl?.remove();
  }
}

// ---------------------------------------------------------------------------
// Shared CSS snippets
// ---------------------------------------------------------------------------

const MENU_BTN_STYLE = `
  background: #2244aa; color: #fff; border: 2px solid #4466cc;
  padding: 1rem 1.5rem; font-size: 1rem; font-family: monospace;
  border-radius: 6px; cursor: pointer; min-width: 100px;
  transition: background 0.15s;
`.replace(/\n\s*/g, ' ');

const END_TURN_BTN_STYLE = `
  background: #aa4422; color: #fff; border: 2px solid #cc6644;
  padding: 8px 16px; font-size: 1rem; font-family: monospace;
  border-radius: 4px; cursor: pointer; min-height: 44px; min-width: 44px;
`.replace(/\n\s*/g, ' ');

const PROD_BTN_STYLE = `
  display: block; width: 100%; margin: 4px 0; padding: 10px 8px;
  background: #224488; color: #fff; border: 1px solid #446699;
  font-family: monospace; cursor: pointer; border-radius: 4px; min-height: 44px;
`.replace(/\n\s*/g, ' ');

const CLOSE_BTN_STYLE = `
  background: #444; color: #ccc; border: 1px solid #666;
  padding: 8px 12px; font-family: monospace; cursor: pointer; border-radius: 3px;
  min-height: 44px; min-width: 44px;
`.replace(/\n\s*/g, ' ');

const HELP_BTN_STYLE = `
  background: #335; color: #aac; border: 1px solid #557;
  padding: 4px 10px; font-size: 1rem; font-family: monospace; font-weight: bold;
  border-radius: 50%; cursor: pointer; min-height: 32px; min-width: 32px;
  margin-left: auto;
`.replace(/\n\s*/g, ' ');
