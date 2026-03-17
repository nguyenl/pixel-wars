/**
 * src/renderer/ui.ts
 *
 * HTML overlay UI: main menu, HUD, unit info panel, city production menu, victory screen.
 * Uses DOM elements overlaid on the PixiJS canvas.
 */

import type { GameState, PlayerId, MapSizeOption, UnitType, Settlement, Unit } from '../game/types';

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
      const el = document.createElement('div');
      el.id = 'hud';
      el.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; padding: 8px 16px;
        background: rgba(0,0,0,0.7); color: #fff; font-family: monospace;
        display: flex; gap: 2rem; align-items: center; z-index: 50;
      `;
      document.body.appendChild(el);
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
    `;

    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn && this.endTurnHandler) {
      endTurnBtn.addEventListener('click', this.endTurnHandler);
    }
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
      <h1 style="font-size:3rem; margin-bottom:1rem;">🏆 ${winnerName} Wins!</h1>
      <button id="return-menu" style="${MENU_BTN_STYLE}">Return to Main Menu</button>
    `;
    el.querySelector('#return-menu')?.addEventListener('click', () => {
      el.remove();
      onReturnToMenu();
    });
    document.body.appendChild(el);
    this.victoryEl = el;
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
    this.hudEl?.remove();
    this.menuEl?.remove();
    this.unitInfoEl?.remove();
    this.productionMenuEl?.remove();
    this.upgradeEl?.remove();
    this.victoryEl?.remove();
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
  padding: 4px 12px; font-size: 0.85rem; font-family: monospace;
  border-radius: 4px; cursor: pointer;
`.replace(/\n\s*/g, ' ');

const PROD_BTN_STYLE = `
  display: block; width: 100%; margin: 4px 0; padding: 6px;
  background: #224488; color: #fff; border: 1px solid #446699;
  font-family: monospace; cursor: pointer; border-radius: 4px;
`.replace(/\n\s*/g, ' ');

const CLOSE_BTN_STYLE = `
  background: #444; color: #ccc; border: 1px solid #666;
  padding: 4px 10px; font-family: monospace; cursor: pointer; border-radius: 3px;
`.replace(/\n\s*/g, ' ');
