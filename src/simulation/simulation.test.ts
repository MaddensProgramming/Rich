import { describe, expect, it } from 'vitest';
import {
  advanceChapter,
  applyOfflineProgress,
  assignWorkers,
  buyBookPack,
  buyResource,
  canAdvanceChapter,
  canConstructBuilding,
  contributeToUpgradeProject,
  constructBuilding,
  createInitialGameState,
  forageVegetables,
  gatherClearingWood,
  gatherLooseStone,
  getCurrentUpgradeProject,
  getCurrentUpgradeProjectProgress,
  hydrateGameState,
  prepareGameStateForSave,
  sanitizeGameState,
  setRecipe,
  tickGame,
} from './index';

const reachHamlet = () => {
  let state = createInitialGameState(0);
  state.resources.wood = 200;
  state.resources.stone = 200;
  state = contributeToUpgradeProject(state, { wood: 75 });
  return advanceChapter(state);
};

const reachVillage = () => {
  let state = reachHamlet();
  state.resources.wood = 600;
  state.resources.stone = 600;
  state.resources.food = 600;
  state.resources.coal = 600;
  state.resources.iron_ore = 600;
  state = contributeToUpgradeProject(state, { wood: 450 });
  return advanceChapter(state);
};

describe('simulation campaign cut', () => {
  it('starts in Arrival with no constructed buildings and a finite clearing pool', () => {
    const state = createInitialGameState(0);

    expect(state.campaign.chapterId).toBe('arrival');
    expect(state.campaign.clearingWood).toBeGreaterThan(0);
    expect(state.campaign.clearingStone).toBeGreaterThan(0);
    expect(state.campaign.clearingVegetables).toBeGreaterThan(0);
    expect(state.campaign.unlockedSystems.manualGather).toBe(true);
    expect(state.campaign.unlockedSystems.offlineBoost).toBe(false);
    expect(Object.values(state.campaign.constructedBuildings)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(getCurrentUpgradeProject(state).id).toBe('arrival_upgrade_to_hamlet');
    expect(getCurrentUpgradeProjectProgress(state)).toBe(0);
  });

  it('manual gathering adds one resource per click and exhausts finite clearing pools', () => {
    let state = createInitialGameState(0);
    state = gatherClearingWood(state);
    state = gatherLooseStone(state);
    state = forageVegetables(state);

    expect(state.resources.wood).toBe(13);
    expect(state.resources.stone).toBe(11);
    expect(state.resources.vegetables).toBe(9);
    expect(state.campaign.clearingWood).toBe(59);
    expect(state.campaign.clearingStone).toBe(44);
    expect(state.campaign.clearingVegetables).toBe(34);

    state = {
      ...state,
      campaign: {
        ...state.campaign,
        clearingWood: 2,
        clearingStone: 1,
        clearingVegetables: 1,
      },
    };
    let exhausted = gatherClearingWood(state, 5);
    exhausted = gatherLooseStone(exhausted, 5);
    exhausted = forageVegetables(exhausted, 5);

    expect(exhausted.campaign.clearingWood).toBe(0);
    expect(exhausted.campaign.clearingStone).toBe(0);
    expect(exhausted.campaign.clearingVegetables).toBe(0);
    expect(exhausted.resources.wood).toBe(15);
    expect(exhausted.resources.stone).toBe(12);
    expect(exhausted.resources.vegetables).toBe(10);
    expect(gatherClearingWood(exhausted, 1)).toBe(exhausted);
    expect(gatherLooseStone(exhausted, 1)).toBe(exhausted);
    expect(forageVegetables(exhausted, 1)).toBe(exhausted);
  });

  it('keeps buildings dormant until constructed and gates the arrival mine to stone output', () => {
    let state = createInitialGameState(0);
    state.resources.food = 100;
    state.resources.wood = 100;
    state.resources.stone = 100;

    const idleTick = tickGame(state, 10);
    expect(idleTick.resources.stone).toBe(100);
    expect(idleTick.stats.effectiveWorkers.mine).toBe(0);

    expect(setRecipe(state, 'mine', 'mine_balanced')).toBe(state);
    expect(canConstructBuilding(state, 'mine')).toBe(true);

    state = constructBuilding(state, 'mine');
    state = assignWorkers(state, 'mine', 1);
    const stoneBefore = state.resources.stone;

    const activeTick = tickGame(state, 10);

    expect(activeTick.resources.stone).toBeGreaterThan(stoneBefore);
    expect(activeTick.resources.coal).toBe(0);
    expect(activeTick.resources.iron_ore).toBe(0);
    expect(activeTick.stats.effectiveWorkers.mine).toBeGreaterThan(0);
  });

  it('fills the Arrival project but only advances when the player chooses to do so', () => {
    let state = createInitialGameState(0);
    state.resources.wood = 100;
    state.resources.stone = 100;

    state = contributeToUpgradeProject(state, { wood: 30, stone: 25 });

    expect(getCurrentUpgradeProjectProgress(state)).toBe(55);
    expect(state.campaign.chapterId).toBe('arrival');
    expect(canAdvanceChapter(state)).toBe(false);

    state = contributeToUpgradeProject(state, { wood: 20, stone: 20 });

    expect(getCurrentUpgradeProjectProgress(state)).toBe(75);
    expect(canAdvanceChapter(state)).toBe(true);
    expect(state.campaign.chapterId).toBe('arrival');

    const advanced = advanceChapter(state);

    expect(advanced.campaign.chapterId).toBe('hamlet');
    expect(advanced.campaign.completedUpgradeProjectIds).toContain('arrival_upgrade_to_hamlet');
    expect(advanced.campaign.unlockedSystems.offlineBoost).toBe(true);
    expect(advanced.campaign.upgradeProjectProgress.arrival_upgrade_to_hamlet).toBe(75);
    expect(getCurrentUpgradeProject(advanced).id).toBe('hamlet_upgrade_to_village');
    expect(canConstructBuilding(advanced, 'farm')).toBe(true);
  });

  it('preserves campaign state on save/load and migrates old saves into a valid chapter', () => {
    let state = createInitialGameState(0);
    state.resources.wood = 100;
    state.resources.stone = 100;
    state = contributeToUpgradeProject(state, { wood: 75 });
    state = advanceChapter(state);
    state = constructBuilding(state, 'mine');
    state = assignWorkers(state, 'mine', 1);

    const saved = prepareGameStateForSave(state, 10_000);
    const reloaded = hydrateGameState(saved, 10_000);

    expect(reloaded.campaign.chapterId).toBe('hamlet');
    expect(reloaded.campaign.constructedBuildings.mine).toBe(true);
    expect(reloaded.campaign.completedUpgradeProjectIds).toContain('arrival_upgrade_to_hamlet');
    expect(reloaded.campaign.unlockedSystems.offlineBoost).toBe(true);

    const migrated = sanitizeGameState({
      workers: {
        total: 2,
        housingCapacity: 4,
      },
      buildings: {
        mine: { workers: 1, level: 2, recipeId: 'mine_balanced', equippedBooks: [] },
      },
    });

    expect(migrated.campaign.chapterId).toBe('hamlet');
    expect(migrated.campaign.constructedBuildings.mine).toBe(true);
    expect(migrated.campaign.unlockedSystems.offlineBoost).toBe(true);

    const arrivalCharged = applyOfflineProgress(createInitialGameState(0), 4 * 60 * 60 * 1000);
    expect(arrivalCharged.offline.chargeSeconds).toBe(0);

    const hamletCharged = applyOfflineProgress(reloaded, 4 * 60 * 60 * 1000);
    expect(hamletCharged.offline.chargeSeconds).toBeGreaterThan(0);
  });

  it('runs gated Hamlet food production after buildings are constructed', () => {
    let state = reachHamlet();
    state.workers.total = 2;
    state.resources.vegetables = 100;

    state = constructBuilding(state, 'farm');
    state = constructBuilding(state, 'food_maker');
    state = assignWorkers(state, 'farm', 1);
    state = assignWorkers(state, 'food_maker', 1);

    const initialFood = state.resources.food;
    const next = tickGame(state, 10);

    expect(next.resources.food).toBeGreaterThan(initialFood);
    expect(next.stats.productionPerSecond.vegetables).toBeGreaterThan(0);
    expect(next.stats.consumptionPerSecond.vegetables).toBeGreaterThan(0);
    expect(next.stats.productionPerSecond.food).toBeGreaterThan(0);
  });

  it('keeps market and library actions locked until their chapter systems unlock', () => {
    const arrival = createInitialGameState(0);
    expect(buyResource(arrival, 'wood', 1)).toBe(arrival);
    expect(buyBookPack(arrival)).toBe(arrival);

    const hamlet = reachHamlet();
    const afterMarketBuy = buyResource(hamlet, 'wood', 1);
    expect(afterMarketBuy.resources.wood).toBeGreaterThan(hamlet.resources.wood);
    expect(buyBookPack(hamlet)).toBe(hamlet);

    const village = reachVillage();
    const afterBookPack = buyBookPack({ ...village, money: 200 });
    expect(afterBookPack.money).toBeLessThan(200);
    expect(afterBookPack.recentBookPack).toHaveLength(3);
  });
});
