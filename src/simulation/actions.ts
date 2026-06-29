import { chapterById, chapterUpgradeProjectById } from '../data/chapterProjects';
import { buildingById } from '../data/buildings';
import { resourceIds } from '../data/resources';
import type { BuildingId, GameState, RecipeId, ResourceId, ResourceMap } from './types';
import {
  clamp,
  cloneGameState,
  canAffordResources,
  spendResources,
  sumAssignedWorkers,
} from './utils';
import { getCampaignChapter, isBuildingConstructed } from './gameState';

export const MAX_BUILDING_LEVEL = 5;

export const getBuildingUpgradeCost = (state: GameState, buildingId: BuildingId): ResourceMap => {
  const nextLevel = state.buildings[buildingId].level + 1;
  return buildingById[buildingId].upgradeCosts[nextLevel] ?? {};
};

export const getWorkerHireCost = (state: GameState) => 95 + state.workers.total * 30;

export const getHousingUpgradeCost = (state: GameState): ResourceMap => {
  const step = Math.max(1, Math.floor((state.workers.housingCapacity - 8) / 4) + 1);
  return {
    wood: Math.round(18 * step ** 1.25),
    stone: Math.round(14 * step ** 1.2),
  };
};

export const getBuildingConstructionCost = (buildingId: BuildingId): ResourceMap =>
  buildingById[buildingId].constructionCost ?? {};

export const getCurrentUpgradeProject = (state: GameState) => {
  const chapter = getCampaignChapter(state);
  return chapterUpgradeProjectById[chapter.upgradeProjectId];
};

export const getCurrentUpgradeProjectProgress = (state: GameState) => {
  const project = getCurrentUpgradeProject(state);
  return Math.min(
    project.targetProgress,
    Math.max(0, state.campaign.upgradeProjectProgress[project.id] ?? 0),
  );
};

export const canAdvanceChapter = (state: GameState) => {
  const project = getCurrentUpgradeProject(state);
  return getCurrentUpgradeProjectProgress(state) >= project.targetProgress;
};

const getFirstAvailableRecipeId = (state: GameState, buildingId: BuildingId) => {
  const chapter = getCampaignChapter(state);
  const definition = buildingById[buildingId];

  return (
    definition.recipes.find((recipeId) => chapter.availableRecipeIds.includes(recipeId)) ??
    definition.recipes[0]
  );
};

const isBuildingAvailableInCurrentChapter = (state: GameState, buildingId: BuildingId) => {
  const chapter = getCampaignChapter(state);
  const definition = buildingById[buildingId];

  return (
    chapter.availableBuildingIds.includes(buildingId) &&
    (!definition.availableInChapters || definition.availableInChapters.includes(chapter.id))
  );
};

const isRecipeAvailableInCurrentChapter = (state: GameState, recipeId: RecipeId) =>
  getCampaignChapter(state).availableRecipeIds.includes(recipeId);

type ManualGatherPoolKey = 'clearingWood' | 'clearingStone' | 'clearingVegetables';

const manualGatherPoolByResource: Partial<Record<ResourceId, ManualGatherPoolKey>> = {
  wood: 'clearingWood',
  stone: 'clearingStone',
  vegetables: 'clearingVegetables',
};

export const canConstructBuilding = (state: GameState, buildingId: BuildingId) => {
  if (
    !state.campaign.unlockedSystems.construction ||
    isBuildingConstructed(state, buildingId) ||
    !isBuildingAvailableInCurrentChapter(state, buildingId)
  ) {
    return false;
  }

  return canAffordResources(state.resources, getBuildingConstructionCost(buildingId));
};

export const constructBuilding = (state: GameState, buildingId: BuildingId): GameState => {
  if (!canConstructBuilding(state, buildingId)) {
    return state;
  }

  const next = cloneGameState(state);
  if (!spendResources(next.resources, getBuildingConstructionCost(buildingId))) {
    return state;
  }

  next.campaign.constructedBuildings[buildingId] = true;
  next.buildings[buildingId].recipeId = getFirstAvailableRecipeId(next, buildingId);
  return next;
};

export const assignWorkers = (
  state: GameState,
  buildingId: BuildingId,
  requestedWorkers: number,
): GameState => {
  if (!isBuildingConstructed(state, buildingId) || !isBuildingAvailableInCurrentChapter(state, buildingId)) {
    return state;
  }

  const nextWorkerCount = Math.max(0, Math.trunc(requestedWorkers));
  const currentBuilding = state.buildings[buildingId];
  const assignedElsewhere = sumAssignedWorkers(state.buildings) - currentBuilding.workers;
  const maxForBuilding = Math.max(0, state.workers.total - assignedElsewhere);
  const next = cloneGameState(state);

  next.buildings[buildingId].workers = clamp(nextWorkerCount, 0, maxForBuilding);
  return next;
};

export const setRecipe = (state: GameState, buildingId: BuildingId, recipeId: RecipeId): GameState => {
  if (!isBuildingConstructed(state, buildingId) || !isRecipeAvailableInCurrentChapter(state, recipeId)) {
    return state;
  }

  const definition = buildingById[buildingId];
  if (!definition.recipes.includes(recipeId)) {
    return state;
  }

  const next = cloneGameState(state);
  next.buildings[buildingId].recipeId = recipeId;
  return next;
};

export const upgradeBuilding = (state: GameState, buildingId: BuildingId): GameState => {
  if (!isBuildingConstructed(state, buildingId) || !isBuildingAvailableInCurrentChapter(state, buildingId)) {
    return state;
  }

  const building = state.buildings[buildingId];
  if (building.level >= MAX_BUILDING_LEVEL) {
    return state;
  }

  const cost = getBuildingUpgradeCost(state, buildingId);
  const next = cloneGameState(state);
  if (!spendResources(next.resources, cost)) {
    return state;
  }

  next.buildings[buildingId].level += 1;
  return next;
};

const gatherManualResource = (state: GameState, resourceId: ResourceId, requestedAmount: number) => {
  if (!state.campaign.unlockedSystems.manualGather) {
    return state;
  }

  const poolKey = manualGatherPoolByResource[resourceId];
  if (!poolKey) {
    return state;
  }

  const amount = Math.max(0, Math.trunc(requestedAmount));
  if (amount <= 0) {
    return state;
  }

  const next = cloneGameState(state);
  const actualAmount = Math.min(amount, next.campaign[poolKey]);

  if (actualAmount <= 0) {
    return state;
  }

  next.resources[resourceId] += actualAmount;
  next.campaign[poolKey] -= actualAmount;

  return next;
};

export const gatherClearingWood = (state: GameState, requestedAmount = 1) =>
  gatherManualResource(state, 'wood', requestedAmount);

export const gatherLooseStone = (state: GameState, requestedAmount = 1) =>
  gatherManualResource(state, 'stone', requestedAmount);

export const forageVegetables = (state: GameState, requestedAmount = 1) =>
  gatherManualResource(state, 'vegetables', requestedAmount);

export const contributeToUpgradeProject = (
  state: GameState,
  contributions: Partial<Record<ResourceId, number>>,
  requestedMoney = 0,
): GameState => {
  const project = getCurrentUpgradeProject(state);
  const currentProgress = getCurrentUpgradeProjectProgress(state);
  if (currentProgress >= project.targetProgress) {
    return state;
  }

  let remainingProgress = project.targetProgress - currentProgress;
  const next = cloneGameState(state);
  let nextProgress = currentProgress;

  for (const resourceId of resourceIds) {
    const requestedAmount = Math.max(0, Math.trunc(contributions[resourceId] ?? 0));
    const contributionRate = project.resourceContributions[resourceId] ?? 0;
    if (requestedAmount <= 0 || contributionRate <= 0 || remainingProgress <= 0) {
      continue;
    }

    const spendable = Math.min(
      requestedAmount,
      next.resources[resourceId],
      remainingProgress / contributionRate,
    );
    if (spendable <= 0) {
      continue;
    }

    next.resources[resourceId] -= spendable;
    const progress = spendable * contributionRate;
    nextProgress += progress;
    remainingProgress -= progress;
  }

  const moneyRate = project.moneyContributionRate ?? 0;
  const moneyAmount = Math.max(0, Math.trunc(requestedMoney));
  if (moneyRate > 0 && moneyAmount > 0 && remainingProgress > 0) {
    const spendableMoney = Math.min(moneyAmount, next.money, remainingProgress / moneyRate);
    if (spendableMoney > 0) {
      next.money -= spendableMoney;
      const progress = spendableMoney * moneyRate;
      nextProgress += progress;
      remainingProgress -= progress;
    }
  }

  const clampedProgress = Math.min(project.targetProgress, nextProgress);
  if (clampedProgress <= currentProgress + 1e-9) {
    return state;
  }

  next.campaign.upgradeProjectProgress[project.id] = clampedProgress;
  return next;
};

export const advanceChapter = (state: GameState): GameState => {
  const project = getCurrentUpgradeProject(state);
  if (getCurrentUpgradeProjectProgress(state) < project.targetProgress) {
    return state;
  }

  if (state.campaign.completedUpgradeProjectIds.includes(project.id)) {
    return state;
  }

  const next = cloneGameState(state);
  next.campaign.completedUpgradeProjectIds = Array.from(
    new Set([...next.campaign.completedUpgradeProjectIds, project.id]),
  );
  next.campaign.upgradeProjectProgress[project.id] = project.targetProgress;
  if (!project.nextChapterId) {
    next.campaign.campaignComplete = true;
    return next;
  }

  if (state.campaign.chapterId === project.nextChapterId) {
    return state;
  }

  next.campaign.chapterId = project.nextChapterId;
  const nextChapter = chapterById[project.nextChapterId];
  for (const systemId of nextChapter.unlockedSystemIds) {
    next.campaign.unlockedSystems[systemId] = true;
  }

  return next;
};

export const hireWorker = (state: GameState): GameState => {
  if (state.workers.total >= state.workers.housingCapacity) {
    return state;
  }

  const cost = getWorkerHireCost(state);
  if (state.money + 1e-9 < cost) {
    return state;
  }

  const next = cloneGameState(state);
  next.money -= cost;
  next.workers.total += 1;
  return next;
};

export const upgradeHousing = (state: GameState): GameState => {
  const next = cloneGameState(state);
  if (!spendResources(next.resources, getHousingUpgradeCost(state))) {
    return state;
  }

  next.workers.housingCapacity += 4;
  return next;
};

export const activateOfflineBoost = (state: GameState): GameState => {
  if (!state.campaign.unlockedSystems.offlineBoost || state.offline.chargeSeconds <= 0) {
    return state;
  }

  const next = cloneGameState(state);
  next.offline.active = true;
  return next;
};

export const stopOfflineBoost = (state: GameState): GameState => {
  const next = cloneGameState(state);
  next.offline.active = false;
  return next;
};
