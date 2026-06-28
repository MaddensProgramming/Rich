import { describe, expect, it } from 'vitest';
import {
  applyOfflineProgress,
  advanceWallClockState,
  assignWorkers,
  BASIC_BOOK_PACK_COST,
  buyResource,
  canUpgradeBook,
  createInitialGameState,
  equipBook,
  getBuildingUpgradeCost,
  getWorkerHireCost,
  makeBookKey,
  MAX_OFFLINE_BOOST_GAME_SECONDS,
  prepareGameStateForSave,
  sanitizeGameState,
  sellResource,
  setMarketAutomationRule,
  sumAssignedWorkers,
  tickGame,
  upgradeBook,
} from './index';

describe('simulation economy', () => {
  it('starts with constrained resources so early choices have tradeoffs', () => {
    const state = createInitialGameState(0);

    expect(sumAssignedWorkers(state.buildings)).toBe(state.workers.total);
    expect(state.workers.total).toBeLessThan(state.workers.housingCapacity);
    expect(state.money).toBeLessThan(BASIC_BOOK_PACK_COST);
    expect(state.money).toBeLessThan(getWorkerHireCost(state));
    expect(state.resources.iron_bars).toBeLessThan(
      getBuildingUpgradeCost(state, 'blacksmith').iron_bars ?? 0,
    );
  });

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

  it('runs auto-market rules on a game-time cooldown', () => {
    let seller = createInitialGameState(0);
    for (const buildingId of Object.keys(seller.buildings) as Array<keyof typeof seller.buildings>) {
      seller = assignWorkers(seller, buildingId, 0);
    }
    seller.resources.wood = 50;
    seller = setMarketAutomationRule(seller, 'wood', { sellAbove: 40, batchSize: 5 });

    const beforeCooldown = tickGame(seller, 0.5);
    expect(beforeCooldown.resources.wood).toBe(50);

    const afterCooldown = tickGame(beforeCooldown, 0.5);
    expect(afterCooldown.resources.wood).toBeCloseTo(45);
    expect(afterCooldown.money).toBeGreaterThan(beforeCooldown.money);

    let buyer = createInitialGameState(0);
    for (const buildingId of Object.keys(buyer.buildings) as Array<keyof typeof buyer.buildings>) {
      buyer = assignWorkers(buyer, buildingId, 0);
    }
    buyer.resources.coal = 0;
    buyer.money = 100;
    buyer = setMarketAutomationRule(buyer, 'coal', { buyBelow: 5, batchSize: 3 });

    const bought = tickGame(buyer, 1);
    expect(bought.resources.coal).toBeCloseTo(3);
    expect(bought.money).toBeLessThan(buyer.money);
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
