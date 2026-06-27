import { describe, expect, it } from 'vitest';
import {
  applyOfflineProgress,
  advanceWallClockState,
  assignWorkers,
  buyResource,
  canUpgradeBook,
  createInitialGameState,
  equipBook,
  makeBookKey,
  MAX_OFFLINE_BOOST_GAME_SECONDS,
  prepareGameStateForSave,
  sanitizeGameState,
  sellResource,
  tickGame,
  upgradeBook,
} from './index';

describe('simulation economy', () => {
  it('runs the farm to food production chain with food consumption', () => {
    let state = createInitialGameState(0);
    state = assignWorkers(state, 'mine', 0);
    state = assignWorkers(state, 'lumberjack', 0);
    state = assignWorkers(state, 'smelter', 0);
    state = assignWorkers(state, 'blacksmith', 0);

    const initialFood = state.resources.food;
    const next = tickGame(state, 10);

    expect(next.resources.food).toBeGreaterThan(initialFood);
    expect(next.stats.productionPerSecond.vegetables).toBeGreaterThan(0);
    expect(next.stats.consumptionPerSecond.vegetables).toBeGreaterThan(0);
    expect(next.stats.productionPerSecond.food).toBeGreaterThan(0);
    expect(next.stats.consumptionPerSecond.food).toBeGreaterThan(0);
  });

  it('updates market pressure on trades and drifts back toward base pressure', () => {
    let state = createInitialGameState(0);
    state.resources.wood = 200;

    const afterSell = sellResource(state, 'wood', 50);
    expect(afterSell.market.wood.pressure).toBeLessThan(1);
    expect(afterSell.money).toBeGreaterThan(state.money);

    const afterBuy = buyResource(afterSell, 'wood', 20);
    expect(afterBuy.market.wood.pressure).toBeGreaterThan(afterSell.market.wood.pressure);

    const afterDrift = tickGame(afterSell, 60);
    expect(afterDrift.market.wood.pressure).toBeGreaterThan(afterSell.market.wood.pressure);
    expect(afterDrift.market.wood.pressure).toBeLessThanOrEqual(1);
  });

  it('enforces book equip limits and preserves equipped copies during upgrades', () => {
    let state = createInitialGameState(0);
    state.books.owned[makeBookKey('deep_veins', 'common')] = 6;
    state.books.owned[makeBookKey('coal_seams', 'common')] = 1;
    state.books.owned[makeBookKey('stone_surveying', 'common')] = 1;

    state = equipBook(state, 'mine', 'deep_veins', 'common');
    state = equipBook(state, 'mine', 'coal_seams', 'common');
    const fullMine = equipBook(state, 'mine', 'stone_surveying', 'common');
    expect(fullMine.buildings.mine.equippedBooks).toHaveLength(2);
    expect(canUpgradeBook({ ...state, books: { owned: { ...state.books.owned, [makeBookKey('deep_veins', 'common')]: 5 } } }, 'deep_veins', 'common')).toBe(false);
    expect(canUpgradeBook(state, 'deep_veins', 'common')).toBe(true);

    const upgraded = upgradeBook(state, 'deep_veins', 'common');
    expect(upgraded.books.owned[makeBookKey('deep_veins', 'common')]).toBe(1);
    expect(upgraded.books.owned[makeBookKey('deep_veins', 'uncommon')]).toBe(1);
    expect(upgraded.buildings.mine.equippedBooks[0]).toEqual({
      bookId: 'deep_veins',
      rarity: 'common',
    });
  });

  it('converts offline elapsed time into boost charge and drains charge as game time', () => {
    const saved = createInitialGameState(0);
    const loaded = applyOfflineProgress(saved, 4 * 60 * 60 * 1000);

    expect(loaded.offline.chargeSeconds).toBeCloseTo(MAX_OFFLINE_BOOST_GAME_SECONDS / 2);

    loaded.offline.active = true;
    loaded.offline.chargeSeconds = 10;

    const boosted = tickGame(loaded, 1);
    expect(boosted.totalGameSeconds).toBeCloseTo(5);
    expect(boosted.offline.chargeSeconds).toBeCloseTo(5);
    expect(boosted.stats.gameSpeed).toBeCloseTo(5);
  });

  it('reports only actual food consumed during shortages', () => {
    const state = createInitialGameState(0);
    state.resources.food = 0.05;
    for (const building of Object.values(state.buildings)) {
      building.workers = 0;
    }

    const next = tickGame(state, 10);

    expect(next.resources.food).toBe(0);
    expect(next.stats.consumptionPerSecond.food).toBeCloseTo(0.005);
    expect(next.stats.globalProductionMultiplier).toBe(0.25);
  });

  it('converts long foreground gaps to offline charge before saving', () => {
    const state = createInitialGameState(0);
    const advanced = advanceWallClockState(state, 7_000, 0);
    const saved = prepareGameStateForSave(advanced, 7_000);
    const reloaded = applyOfflineProgress(saved, 7_000);

    expect(advanced.totalGameSeconds).toBe(0);
    expect(saved.offline.chargeSeconds).toBeGreaterThan(0);
    expect(reloaded.offline.chargeSeconds).toBe(saved.offline.chargeSeconds);
  });

  it('sanitizes malformed saves so workers cannot exceed housing or assignments', () => {
    const state = sanitizeGameState({
      workers: {
        total: 99,
        housingCapacity: 3,
      },
      buildings: {
        mine: { workers: 50, level: 99, recipeId: 'mine_balanced', equippedBooks: [] },
        lumberjack: { workers: 50, level: 1, recipeId: 'lumberjack_wood', equippedBooks: [] },
      },
    });

    const assignedWorkers = Object.values(state.buildings).reduce(
      (total, building) => total + building.workers,
      0,
    );

    expect(state.workers.total).toBe(3);
    expect(state.workers.housingCapacity).toBe(3);
    expect(assignedWorkers).toBeLessThanOrEqual(state.workers.total);
    expect(state.buildings.mine.level).toBe(5);
  });
});
