import { buildingById, buildingIds, recipeById } from '../data/buildings';
import { resourceIds } from '../data/resources';
import { assignWorkers, getCurrentUpgradeProject, getHousingUpgradeCost, getUpgradeProjectDeliveries, setRecipe, setSecondaryRecipe, setWorkerShare } from './actions';
import { getBuildingBookEffects } from './books';
import { getActiveContracts } from './contracts';
import { FOOD_CONSUMPTION_PER_WORKER, getCampaignChapter, isBuildingConstructed, isSecondRecipeSlotUnlocked } from './gameState';
import { getSellPrice } from './market';
import type { BuildingId, GameState, RecipeId, ResourceId, ResourceMap } from './types';
import { clamp, createResourceRecord } from './utils';

export interface ProductionPlannerContext {
  additionalDemand?: ResourceMap;
  foodHorizonSeconds?: number;
  moneyTarget?: number;
  reserveNextHousingUpgrade?: boolean;
  includeContractDemand?: boolean;
}

export interface ProductionPlan {
  demand: Record<ResourceId, number>;
  recipeEffort: Partial<Record<RecipeId, number>>;
  buildingEffort: Record<BuildingId, number>;
  workerAssignments: Record<BuildingId, number>;
  primaryRecipes: Partial<Record<BuildingId, RecipeId>>;
  secondaryRecipes: Partial<Record<BuildingId, RecipeId | null>>;
  primaryWorkerShares: Partial<Record<BuildingId, number>>;
  estimatedSeconds: number;
  bestProfitRecipeId: RecipeId | null;
  bestProfitPerWorkerSecond: number;
}

const producerByResource: Record<ResourceId, RecipeId> = {
  vegetables: 'farm_vegetables',
  food: 'food_maker_basic_food',
  wood: 'lumberjack_wood',
  stone: 'mine_stone_focus',
  coal: 'mine_coal_focus',
  iron_ore: 'mine_iron_focus',
  iron_bars: 'smelter_iron_bars',
  bows: 'blacksmith_bows',
  swords: 'blacksmith_swords',
  planks: 'lumberjack_planks',
  tools: 'blacksmith_tools',
  stone_blocks: 'stonemason_blocks',
};

// Process finished goods before their inputs so demand propagates through the full chain.
const expansionOrder: ResourceId[] = [
  'stone_blocks',
  'tools',
  'swords',
  'bows',
  'planks',
  'iron_bars',
  'food',
  'stone',
  'coal',
  'iron_ore',
  'wood',
  'vegetables',
];

const addDemand = (demand: Record<ResourceId, number>, resourceId: ResourceId, amount: number) => {
  if (amount > 0 && Number.isFinite(amount)) demand[resourceId] += amount;
};

const getAvailableProfitRecipe = (state: GameState) => {
  const chapter = getCampaignChapter(state);
  return chapter.availableRecipeIds
    .map((recipeId) => recipeById[recipeId])
    .filter(
      (recipe) =>
        isBuildingConstructed(state, recipe.buildingId) &&
        resourceIds.every((resourceId) => (recipe.inputs[resourceId] ?? 0) <= 0),
    )
    .map((recipe) => {
      const valuePerRun = resourceIds.reduce(
        (value, resourceId) =>
          value + (recipe.outputs[resourceId] ?? 0) * getSellPrice(state, resourceId),
        0,
      );
      return {
        recipe,
        valuePerWorkerSecond: valuePerRun * buildingById[recipe.buildingId].baseProductionMultiplier,
      };
    })
    .sort((left, right) => right.valuePerWorkerSecond - left.valuePerWorkerSecond)[0] ?? null;
};

const getEffectiveWorkerExponent = (state: GameState, buildingId: BuildingId) => {
  const building = state.buildings[buildingId];
  const bookEffects = getBuildingBookEffects(state, buildingId);
  return clamp(
    0.85 + (building.level - 1) * 0.015 + bookEffects.efficiencyExponentBonus,
    0.65,
    0.97,
  );
};

const estimateBuildingSeconds = (
  state: GameState,
  buildingId: BuildingId,
  effort: number,
  workers: number,
) => {
  if (effort <= 0) return 0;
  if (workers <= 0) return Number.POSITIVE_INFINITY;
  const levelMultiplier = 1 + (state.buildings[buildingId].level - 1) * 0.25;
  return effort / (workers ** getEffectiveWorkerExponent(state, buildingId) * levelMultiplier);
};

const allocateWorkers = (
  state: GameState,
  buildingEffort: Record<BuildingId, number>,
): Record<BuildingId, number> => {
  const assignments = Object.fromEntries(buildingIds.map((buildingId) => [buildingId, 0])) as Record<
    BuildingId,
    number
  >;
  const activeBuildingIds = buildingIds.filter(
    (buildingId) => buildingEffort[buildingId] > 1e-6 && isBuildingConstructed(state, buildingId),
  );
  if (activeBuildingIds.length === 0) return assignments;

  let workersLeft = state.workers.total;
  const foodAtRisk =
    state.resources.food < state.workers.total * FOOD_CONSUMPTION_PER_WORKER * 120;
  for (const buildingId of [...activeBuildingIds].sort((left, right) => {
    const leftFoodPriority = foodAtRisk && (left === 'farm' || left === 'food_maker') ? 1 : 0;
    const rightFoodPriority = foodAtRisk && (right === 'farm' || right === 'food_maker') ? 1 : 0;
    return rightFoodPriority - leftFoodPriority || buildingEffort[right] - buildingEffort[left];
  })) {
    if (workersLeft <= 0) break;
    assignments[buildingId] += 1;
    workersLeft -= 1;
  }

  while (workersLeft > 0) {
    const slowestBuildingId = activeBuildingIds.reduce((slowest, buildingId) => {
      const seconds = estimateBuildingSeconds(
        state,
        buildingId,
        buildingEffort[buildingId],
        assignments[buildingId],
      );
      const slowestSeconds = estimateBuildingSeconds(
        state,
        slowest,
        buildingEffort[slowest],
        assignments[slowest],
      );
      return seconds > slowestSeconds ? buildingId : slowest;
    });
    assignments[slowestBuildingId] += 1;
    workersLeft -= 1;
  }
  return assignments;
};

export const createProductionPlan = (
  state: GameState,
  context: ProductionPlannerContext = {},
): ProductionPlan => {
  const chapter = getCampaignChapter(state);
  const demand = createResourceRecord();
  const project = getCurrentUpgradeProject(state);
  const deliveries = getUpgradeProjectDeliveries(state, project.id);
  const emergencyFoodRecovery =
    state.workers.total > 0 &&
    state.resources.food < 1 &&
    isBuildingConstructed(state, 'farm') &&
    isBuildingConstructed(state, 'food_maker');
  const unconstructedBuildingIds = chapter.availableBuildingIds.filter(
    (buildingId) => !isBuildingConstructed(state, buildingId),
  );

  if (emergencyFoodRecovery) {
    if (state.resources.vegetables < state.workers.total * 2.5) {
      addDemand(demand, 'vegetables', state.workers.total * 2.5);
    } else {
      const foodRecipe = recipeById.food_maker_basic_food;
      const vegetableInput = foodRecipe.inputs.vegetables ?? 1;
      const foodOutput = foodRecipe.outputs.food ?? 0;
      addDemand(demand, 'food', (state.resources.vegetables / vegetableInput) * foodOutput);
    }
  } else {
    if (unconstructedBuildingIds.length === 0) {
      for (const resourceId of resourceIds) {
        addDemand(
          demand,
          resourceId,
          Math.max(0, (project.requirements[resourceId] ?? 0) - (deliveries[resourceId] ?? 0)),
        );
      }
      if (context.includeContractDemand ?? true) {
        for (const contract of getActiveContracts(state)) {
          for (const resourceId of resourceIds) {
            addDemand(demand, resourceId, contract.requiredResources[resourceId] ?? 0);
          }
        }
      }
    }
    for (const buildingId of unconstructedBuildingIds) {
      const constructionCost = buildingById[buildingId].constructionCost ?? {};
      for (const resourceId of resourceIds) {
        addDemand(demand, resourceId, constructionCost[resourceId] ?? 0);
      }
    }
    if (context.reserveNextHousingUpgrade) {
      const housingCost = getHousingUpgradeCost(state);
      for (const resourceId of resourceIds) {
        addDemand(demand, resourceId, housingCost[resourceId] ?? 0);
      }
    }
    for (const resourceId of resourceIds) {
      addDemand(demand, resourceId, context.additionalDemand?.[resourceId] ?? 0);
    }
    addDemand(
      demand,
      'food',
      state.workers.total *
        FOOD_CONSUMPTION_PER_WORKER *
        Math.max(0, context.foodHorizonSeconds ?? 120),
    );
  }

  const recipeEffort: Partial<Record<RecipeId, number>> = {};
  const remainingInventory = createResourceRecord(state.resources);
  for (const resourceId of expansionOrder) {
    const required = demand[resourceId];
    const fromInventory = Math.min(required, remainingInventory[resourceId]);
    remainingInventory[resourceId] -= fromInventory;
    const quantityToProduce = Math.max(0, required - fromInventory);
    if (quantityToProduce <= 1e-6) continue;

    const recipeId = producerByResource[resourceId];
    if (!chapter.availableRecipeIds.includes(recipeId)) continue;
    const recipe = recipeById[recipeId];
    if (!isBuildingConstructed(state, recipe.buildingId)) continue;
    const output = recipe.outputs[resourceId] ?? 0;
    if (output <= 0) continue;
    const runs = quantityToProduce / output;
    recipeEffort[recipeId] =
      (recipeEffort[recipeId] ?? 0) + runs / buildingById[recipe.buildingId].baseProductionMultiplier;
    for (const inputId of resourceIds) {
      addDemand(demand, inputId, (recipe.inputs[inputId] ?? 0) * runs);
    }
  }

  const bestProfit = getAvailableProfitRecipe(state);
  const moneyShortfall = emergencyFoodRecovery
    ? 0
    : Math.max(0, (context.moneyTarget ?? state.money) - state.money);
  if (bestProfit && moneyShortfall > 0 && bestProfit.valuePerWorkerSecond > 0) {
    recipeEffort[bestProfit.recipe.id] =
      (recipeEffort[bestProfit.recipe.id] ?? 0) +
      moneyShortfall / bestProfit.valuePerWorkerSecond;
  }

  const buildingEffort = Object.fromEntries(buildingIds.map((buildingId) => [buildingId, 0])) as Record<
    BuildingId,
    number
  >;
  for (const [recipeId, effort] of Object.entries(recipeEffort) as Array<[RecipeId, number]>) {
    buildingEffort[recipeById[recipeId].buildingId] += effort;
  }
  const workerAssignments = allocateWorkers(state, buildingEffort);
  const primaryRecipes: Partial<Record<BuildingId, RecipeId>> = {};
  const secondaryRecipes: Partial<Record<BuildingId, RecipeId | null>> = {};
  const primaryWorkerShares: Partial<Record<BuildingId, number>> = {};

  for (const buildingId of buildingIds) {
    if (!isBuildingConstructed(state, buildingId)) continue;
    const rankedRecipes = buildingById[buildingId].recipes
      .filter((recipeId) => chapter.availableRecipeIds.includes(recipeId))
      .map((recipeId) => ({ recipeId, effort: recipeEffort[recipeId] ?? 0 }))
      .filter((entry) => entry.effort > 1e-6)
      .sort((left, right) => right.effort - left.effort);
    if (rankedRecipes.length === 0) continue;
    primaryRecipes[buildingId] = rankedRecipes[0].recipeId;
    if (rankedRecipes.length > 1 && isSecondRecipeSlotUnlocked(state, buildingId)) {
      secondaryRecipes[buildingId] = rankedRecipes[1].recipeId;
      primaryWorkerShares[buildingId] = clamp(
        rankedRecipes[0].effort / (rankedRecipes[0].effort + rankedRecipes[1].effort),
        0.1,
        0.9,
      );
    } else {
      secondaryRecipes[buildingId] = null;
    }
  }

  const estimatedSeconds = buildingIds.reduce(
    (longest, buildingId) =>
      Math.max(
        longest,
        estimateBuildingSeconds(
          state,
          buildingId,
          buildingEffort[buildingId],
          workerAssignments[buildingId],
        ),
      ),
    0,
  );

  return {
    demand,
    recipeEffort,
    buildingEffort,
    workerAssignments,
    primaryRecipes,
    secondaryRecipes,
    primaryWorkerShares,
    estimatedSeconds,
    bestProfitRecipeId: bestProfit?.recipe.id ?? null,
    bestProfitPerWorkerSecond: bestProfit?.valuePerWorkerSecond ?? 0,
  };
};

export const applyProductionPlan = (input: GameState, plan: ProductionPlan): GameState => {
  let state = input;
  for (const buildingId of buildingIds) {
    state = assignWorkers(state, buildingId, 0);
  }
  for (const buildingId of buildingIds) {
    const primaryRecipe = plan.primaryRecipes[buildingId];
    if (primaryRecipe) state = setRecipe(state, buildingId, primaryRecipe);
    state = setSecondaryRecipe(state, buildingId, plan.secondaryRecipes[buildingId] ?? null);
    const share = plan.primaryWorkerShares[buildingId];
    if (share !== undefined) state = setWorkerShare(state, buildingId, share);
  }
  for (const buildingId of buildingIds) {
    state = assignWorkers(state, buildingId, plan.workerAssignments[buildingId]);
  }
  return state;
};
