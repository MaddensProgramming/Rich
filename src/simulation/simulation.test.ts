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
  getOwnedBookCount,
  getAvailableContracts,
  acceptContract,
  canCompleteContract,
  completeContract,
  hydrateGameState,
  markStorySeen,
  maxAvailableContracts,
  prepareGameStateForSave,
  sanitizeGameState,
  setRecipe,
  setSecondaryRecipe,
  setWorkerShare,
  isSecondRecipeSlotUnlocked,
  tickGame,
  upgradeAllBooks,
  upgradeAllPossibleBooks,
} from './index';

const fulfilCurrentProject = (input: ReturnType<typeof createInitialGameState>) => {
  let state = input;
  const project = getCurrentUpgradeProject(state);
  for (const resourceId of Object.keys(state.resources) as Array<keyof typeof state.resources>) {
    const required = project.requirements[resourceId] ?? 0;
    state.resources[resourceId] = Math.max(state.resources[resourceId], required + 500);
  }
  if (project.moneyRequirement) {
    state.money = Math.max(state.money, project.moneyRequirement + 500);
  }
  state = contributeToUpgradeProject(state, project.requirements, project.moneyRequirement ?? 0);
  return advanceChapter(state);
};

const reachHamlet = () => fulfilCurrentProject(createInitialGameState(0));

const reachVillage = () => fulfilCurrentProject(reachHamlet());

const reachMountainTown = () => fulfilCurrentProject(reachVillage());

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

    // Arrival requires wood: 40, stone: 35 (75 units across 2 lines).
    state = contributeToUpgradeProject(state, { wood: 20, stone: 20 });

    expect(getCurrentUpgradeProjectProgress(state)).toBeGreaterThan(0);
    expect(getCurrentUpgradeProjectProgress(state)).toBeLessThan(1);
    expect(state.campaign.chapterId).toBe('arrival');
    expect(canAdvanceChapter(state)).toBe(false);

    state = contributeToUpgradeProject(state, { wood: 20, stone: 15 });

    expect(getCurrentUpgradeProjectProgress(state)).toBe(1);
    expect(canAdvanceChapter(state)).toBe(true);
    expect(state.campaign.chapterId).toBe('arrival');
    expect(state.campaign.upgradeProjectDeliveries.arrival_upgrade_to_hamlet?.wood).toBe(40);
    expect(state.campaign.upgradeProjectDeliveries.arrival_upgrade_to_hamlet?.stone).toBe(35);

    const advanced = advanceChapter(state);

    expect(advanced.campaign.chapterId).toBe('hamlet');
    expect(advanced.campaign.completedUpgradeProjectIds).toContain('arrival_upgrade_to_hamlet');
    expect(advanced.campaign.unlockedSystems.offlineBoost).toBe(true);
    expect(getCurrentUpgradeProject(advanced).id).toBe('hamlet_upgrade_to_village');
    expect(canConstructBuilding(advanced, 'farm')).toBe(true);
  });

  it('cannot over-deliver beyond a project requirement', () => {
    let state = createInitialGameState(0);
    state.resources.wood = 1000;
    state.resources.stone = 1000;

    state = contributeToUpgradeProject(state, { wood: 500, stone: 500 });

    expect(state.campaign.upgradeProjectDeliveries.arrival_upgrade_to_hamlet?.wood).toBe(40);
    expect(state.campaign.upgradeProjectDeliveries.arrival_upgrade_to_hamlet?.stone).toBe(35);
    expect(state.resources.wood).toBe(960);
    expect(state.resources.stone).toBe(965);
  });

  it('preserves campaign state on save/load and migrates old saves into a valid chapter', () => {
    let state = createInitialGameState(0);
    state.resources.wood = 100;
    state.resources.stone = 100;
    state = contributeToUpgradeProject(state, { wood: 40, stone: 35 });
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

    const afterTenPacks = buyBookPack({ ...village, money: 2000 }, 10);
    expect(afterTenPacks.money).toBe(800);
    expect(afterTenPacks.recentBookPack).toHaveLength(30);
  });

  it('tracks seen story chapters and victory without duplicates', () => {
    const fresh = createInitialGameState(0);
    expect(fresh.campaign.seenStoryChapters).toEqual([]);
    expect(fresh.campaign.seenVictory).toBe(false);

    const seenArrival = markStorySeen(fresh, 'arrival');
    expect(seenArrival.campaign.seenStoryChapters).toEqual(['arrival']);
    expect(markStorySeen(seenArrival, 'arrival')).toBe(seenArrival);

    const victory = markStorySeen(fresh, 'victory');
    expect(victory.campaign.seenVictory).toBe(true);
    expect(markStorySeen(victory, 'victory')).toBe(victory);

    const reloaded = hydrateGameState(JSON.parse(JSON.stringify(prepareGameStateForSave(victory, 0))), 0);
    expect(reloaded.campaign.seenVictory).toBe(true);
  });

  it('upgrades all duplicates of a book and the whole library on demand', () => {
    const village = reachVillage();
    const stocked = {
      ...village,
      campaign: { ...village.campaign, unlockedSystems: { ...village.campaign.unlockedSystems, library: true } },
      books: { owned: { 'sharp_axes:common': 5, 'forest_paths:common': 1, 'crop_rotation:common': 4 } },
    };

    const upgraded = upgradeAllBooks(stocked, 'sharp_axes');
    expect(getOwnedBookCount(upgraded, 'sharp_axes', 'common')).toBe(0);
    expect(getOwnedBookCount(upgraded, 'sharp_axes', 'uncommon')).toBe(1);
    expect(upgraded.buildings.lumberjack.equippedBooks).toEqual([
      { bookId: 'sharp_axes', rarity: 'uncommon' },
      { bookId: 'forest_paths', rarity: 'common' },
    ]);

    const allUpgraded = upgradeAllPossibleBooks(stocked);
    expect(getOwnedBookCount(allUpgraded, 'sharp_axes', 'uncommon')).toBe(1);
    expect(getOwnedBookCount(allUpgraded, 'crop_rotation', 'common')).toBe(4);
  });

  it('auto-equips the highest owned rarity for each building book', () => {
    const village = reachVillage();
    const stocked = hydrateGameState(
      {
        ...village,
        campaign: { ...village.campaign, unlockedSystems: { ...village.campaign.unlockedSystems, library: true } },
        books: {
          owned: {
            'deep_veins:common': 1,
            'deep_veins:rare': 1,
            'mine_cart_rails:uncommon': 1,
            'sharp_axes:common': 1,
          },
        },
      },
      0,
    );

    expect(stocked.buildings.mine.equippedBooks).toEqual([
      { bookId: 'deep_veins', rarity: 'rare' },
      { bookId: 'mine_cart_rails', rarity: 'uncommon' },
    ]);
    expect(stocked.buildings.lumberjack.equippedBooks).toEqual([
      { bookId: 'sharp_axes', rarity: 'common' },
    ]);
  });

  it('accepts and completes contracts, consuming goods and granting rewards', () => {
    const village = reachVillage();
    expect(getAvailableContracts(village)).toHaveLength(maxAvailableContracts);

    let state = acceptContract(village, 'mountain_road');
    expect(state.campaign.activeContractIds).toContain('mountain_road');

    state = { ...state, resources: { ...state.resources, wood: 0, stone: 0 } };
    expect(canCompleteContract(state, 'mountain_road')).toBe(false);
    state = { ...state, resources: { ...state.resources, wood: 200, stone: 200 } };
    expect(canCompleteContract(state, 'mountain_road')).toBe(true);

    const moneyBefore = state.money;
    const done = completeContract(state, 'mountain_road');
    expect(done.money).toBe(moneyBefore + 720);
    expect(done.resources.wood).toBe(80);
    expect(done.resources.stone).toBe(110);
    expect(done.campaign.completedContractIds).toContain('mountain_road');
    expect(getAvailableContracts(done).some((c) => c.id === 'mountain_road')).toBe(false);

    const rewarded = completeContract({
      ...done,
      resources: { ...done.resources, swords: 12, bows: 16 },
      campaign: { ...done.campaign, activeContractIds: ['garrison_order'] },
    }, 'garrison_order');
    expect(rewarded.books.owned['weapon_contracts:uncommon']).toBe(1);
    expect(rewarded.campaign.lastContractCompletion).toEqual({
      contractId: 'garrison_order', rewardMoney: 760,
      rewardBooks: [{ bookId: 'weapon_contracts', rarity: 'uncommon', count: 1 }],
    });
  });

  it('shows two contract offers at a time from the finite queue', () => {
    const village = reachVillage();

    expect(getAvailableContracts(village).map((contract) => contract.id)).toEqual([
      'mountain_road',
      'garrison_order',
    ]);
    expect(acceptContract(village, 'bridge_repair')).toBe(village);

    let state = acceptContract(village, 'mountain_road');
    expect(getAvailableContracts(state).map((contract) => contract.id)).toEqual([
      'garrison_order',
      'bridge_repair',
    ]);

    state = acceptContract(state, 'garrison_order');
    expect(getAvailableContracts(state).map((contract) => contract.id)).toEqual([
      'bridge_repair',
      'harvest_relief',
    ]);
  });

  it('runs out after ten total contracts', () => {
    let state = reachMountainTown();
    for (const resourceId of Object.keys(state.resources) as Array<keyof typeof state.resources>) {
      state.resources[resourceId] = 10_000;
    }

    let completed = 0;
    let nextContract = getAvailableContracts(state)[0];
    while (nextContract) {
      state = acceptContract(state, nextContract.id);
      state = completeContract(state, nextContract.id);
      completed += 1;
      nextContract = getAvailableContracts(state)[0];
    }

    expect(completed).toBe(10);
    expect(getAvailableContracts(state)).toHaveLength(0);
  });

  it('keeps contracts locked before their chapter', () => {
    const hamlet = reachHamlet();
    expect(getAvailableContracts(hamlet)).toHaveLength(0);
    expect(acceptContract(hamlet, 'mountain_road')).toBe(hamlet);
  });

  it('unlocks the finished-goods chain only in Mountain Town', () => {
    const village = reachVillage();
    expect(village.campaign.chapterId).toBe('village');
    expect(canConstructBuilding(village, 'stonemason')).toBe(false);

    let state = reachMountainTown();
    expect(state.campaign.chapterId).toBe('mountain_town');
    state.workers.total = 3;
    state.resources.wood = 500;
    state.resources.stone = 500;
    state.resources.iron_bars = 200;
    state.resources.tools = 60;
    state.resources.food = 500;

    expect(canConstructBuilding(state, 'stonemason')).toBe(true);
    state = constructBuilding(state, 'lumberjack');
    state = constructBuilding(state, 'stonemason');
    state = setRecipe(state, 'lumberjack', 'lumberjack_planks');
    state = assignWorkers(state, 'lumberjack', 1);
    state = assignWorkers(state, 'stonemason', 1);

    const before = { planks: state.resources.planks, blocks: state.resources.stone_blocks };
    const next = tickGame(state, 10);

    expect(next.resources.planks).toBeGreaterThan(before.planks);
    expect(next.resources.stone_blocks).toBeGreaterThan(before.blocks);
    expect(next.stats.effectiveWorkers.stonemason).toBeGreaterThan(0);
  });

  it('accepts dressed stone toward the Great Hall project', () => {
    let state = reachMountainTown();
    const project = getCurrentUpgradeProject(state);
    expect(project.id).toBe('great_hall');
    expect(project.requirements.stone_blocks ?? 0).toBeGreaterThan(0);

    state.resources.stone_blocks = 50;
    const before = getCurrentUpgradeProjectProgress(state);
    state = contributeToUpgradeProject(state, { stone_blocks: 50 });

    expect(getCurrentUpgradeProjectProgress(state)).toBeGreaterThan(before);
    expect(state.resources.stone_blocks).toBeLessThan(50);
    expect(state.campaign.upgradeProjectDeliveries.great_hall?.stone_blocks).toBe(50);
  });

  it('gates the second recipe slot behind level and runs two recipes with split workers', () => {
    let state = reachHamlet();
    state.workers.total = 2;
    state = constructBuilding(state, 'mine');
    state = assignWorkers(state, 'mine', 2);
    state = setRecipe(state, 'mine', 'mine_stone_focus');

    expect(isSecondRecipeSlotUnlocked(state, 'mine')).toBe(false);
    expect(setSecondaryRecipe(state, 'mine', 'mine_coal_focus')).toBe(state);

    state.buildings.mine.level = 3;
    expect(isSecondRecipeSlotUnlocked(state, 'mine')).toBe(true);

    state = setSecondaryRecipe(state, 'mine', 'mine_coal_focus');
    expect(state.buildings.mine.secondaryRecipeId).toBe('mine_coal_focus');

    const before = { stone: state.resources.stone, coal: state.resources.coal };
    const next = tickGame(state, 10);

    expect(next.resources.stone).toBeGreaterThan(before.stone);
    expect(next.resources.coal).toBeGreaterThan(before.coal);
    expect(next.stats.effectiveWorkers.mine).toBeGreaterThan(0);
  });

  it('clears the secondary recipe when it matches the primary and clamps worker share', () => {
    let state = reachHamlet();
    state.workers.total = 2;
    state = constructBuilding(state, 'mine');
    state = assignWorkers(state, 'mine', 2);
    state = setRecipe(state, 'mine', 'mine_stone_focus');
    state.buildings.mine.level = 3;

    state = setSecondaryRecipe(state, 'mine', 'mine_coal_focus');
    state = setRecipe(state, 'mine', 'mine_coal_focus');
    expect(state.buildings.mine.secondaryRecipeId).toBeNull();

    state = setSecondaryRecipe(state, 'mine', 'mine_stone_focus');
    state = setWorkerShare(state, 'mine', 0.95);
    expect(state.buildings.mine.workerShare).toBeCloseTo(0.9);
    state = setWorkerShare(state, 'mine', 0.02);
    expect(state.buildings.mine.workerShare).toBeCloseTo(0.1);
  });

  it('preserves secondary recipe and worker share across save/load', () => {
    let state = reachHamlet();
    state.workers.total = 2;
    state = constructBuilding(state, 'mine');
    state = assignWorkers(state, 'mine', 2);
    state = setRecipe(state, 'mine', 'mine_stone_focus');
    state.buildings.mine.level = 3;
    state = setSecondaryRecipe(state, 'mine', 'mine_coal_focus');
    state = setWorkerShare(state, 'mine', 0.7);

    const saved = prepareGameStateForSave(state, 10_000);
    const reloaded = hydrateGameState(saved, 10_000);

    expect(reloaded.buildings.mine.secondaryRecipeId).toBe('mine_coal_focus');
    expect(reloaded.buildings.mine.workerShare).toBeCloseTo(0.7);
  });
});
