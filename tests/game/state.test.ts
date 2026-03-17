import { describe, it, expect } from 'vitest';
import { newGame } from '../../src/game/state';
import { UNIT_CONFIG, STARTING_FUNDS } from '../../src/game/constants';
import type { PlayerId } from '../../src/game/types';

describe('newGame', () => {
  it('creates exactly 2 starting scouts', () => {
    const state = newGame('small', 1);
    const units = Object.values(state.units);
    expect(units.length).toBe(2);
    expect(units.every(u => u.type === 'scout')).toBe(true);
  });

  it('starting scouts are on player starting city tiles', () => {
    const state = newGame('small', 1);
    const units = Object.values(state.units);

    const player1Scout = units.find(u => u.owner === 'player1');
    const player2Scout = units.find(u => u.owner === 'player2');
    expect(player1Scout).toBeDefined();
    expect(player2Scout).toBeDefined();

    // Find each player's starting city tile
    const player1City = Object.values(state.settlements).find(
      s => s.type === 'city' && s.owner === 'player1',
    );
    const player2City = Object.values(state.settlements).find(
      s => s.type === 'city' && s.owner === 'player2',
    );
    expect(player1City).toBeDefined();
    expect(player2City).toBeDefined();

    expect(player1Scout!.tileId).toBe(player1City!.tileId);
    expect(player2Scout!.tileId).toBe(player2City!.tileId);

    // Tile should reference the unit
    expect(state.tiles[player1City!.tileId].unitId).toBe(player1Scout!.id);
    expect(state.tiles[player2City!.tileId].unitId).toBe(player2Scout!.id);
  });

  it('starting scouts have full HP and MP', () => {
    const state = newGame('medium', 42);
    const units = Object.values(state.units);

    for (const unit of units) {
      expect(unit.hp).toBe(UNIT_CONFIG.scout.maxHp);
      expect(unit.movementPoints).toBe(UNIT_CONFIG.scout.movementAllowance);
      expect(unit.hasAttacked).toBe(false);
    }
  });

  it('starting funds are not deducted for starting scouts', () => {
    const state = newGame('small', 1);
    // After startTurn for player1, income is collected: player1 owns 1 city = $100 income
    // Player2 hasn't had their turn yet so stays at STARTING_FUNDS
    const cityIncome = 100; // SETTLEMENT_INCOME.city
    expect(state.players['player1'].funds).toBe(STARTING_FUNDS + cityIncome);
    expect(state.players['player2'].funds).toBe(STARTING_FUNDS);
  });
});
