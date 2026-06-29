import { chapterById, chapterUpgradeProjectById } from '../data/chapterProjects';
import { buildingById } from '../data/buildings';
import { resourceIds } from '../data/resources';
import type {
  BuildingId,
  ChapterId,
  ChapterUpgradeProjectDefinition,
  GameState,
  RecipeId,
  ResourceId,
  ResourceMap,
} from './types';
import {
  clamp,
  cloneGameState,
  canAffordResources,
  spendResources,
  sumAssignedWorkers,
} from './utils';
import { getCampaignChapter, isBuildingConstructed, isSecondRecipeSlotUnlocked } from './gameState';

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

export const getUpgradeProjectDeliveries = (
  state: GameState,
  projectId: string,
): Partial<Record<ResourceId, number>> => state.campaign.upgradeProjectDeliveries[projectId] ?? {};

export const getUpgradeProjectMoneyDelivered = (state: GameState, projectId: string): number =>
  Math.max(0, state.campaign.upgradeProjectMoneyDelivered[projectId] ?? 0);

const getUpgradeProjectRequirementLines = (project: ChapterUpgradeProjectDefinition) => {
  const lines: { resourceId: ResourceId; required: number }[] = [];
  for (const resourceId of resourceIds) {
    const required = project.requirements[resourceId] ?? 0;
    if (required > 0) {
      lines.push({ resourceId, required });
    }
  }
  return lines;
};

export const isUpgradeProjectComplete = (state: GameState, projectId: string): boolean => {
  const project = chapterUpgradeProjectById[projectId];
  if (!project) {
    return false;
  }

  const deliveries = getUpgradeProjectDeliveries(state, projectId);
  for (const { resourceId, required } of getUpgradeProjectRequirementLines(project)) {
    if ((deliveries[resourceId] ?? 0) + 1e-6 < required) {
      return false;
    }
  }

  const moneyRequired = project.moneyRequirement ?? 0;
  return getUpgradeProjectMoneyDelivered(state, projectId) + 1e-6 >= moneyRequired;
};

export const getCurrentUpgradeProjectProgress = (state: GameState): number => {
  const project = getCurrentUpgradeProject(state);
  const deliveries = getUpgradeProjectDeliveries(state, project.id);
  const fractions: number[] = [];

  for (const { resourceId, required } of getUpgradeProjectRequirementLines(project)) {
    fractions.push(clamp((deliveries[resourceId] ?? 0) / required, 0, 1));
  }

  const moneyRequired = project.moneyRequirement ?? 0;
  if (moneyRequired > 0) {
    fractions.push(clamp(getUpgradeProjectMoneyDelivered(state, project.id) / moneyRequired, 0, 1));
  }

  if (fractions.length === 0) {
    return 1;
  }

  return fractions.reduce((sum, value) => sum + value, 0) / fractions.length;
};

export const canAdvanceChapter = (state: GameState) => {
  const project = getCurrentUpgradeProject(state);
  return isUpgradeProjectComplete(state, project.id);
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
  if (next.buildings[buildingId].secondaryRecipeId === recipeId) {
    next.buildings[buildingId].secondaryRecipeId = null;
  }
  return next;
};

export const canUseSecondRecipeSlot = (state: GameState, buildingId: BuildingId) =>
  isBuildingConstructed(state, buildingId) &&
  isBuildingAvailableInCurrentChapter(state, buildingId) &&
  isSecondRecipeSlotUnlocked(state, buildingId);

export const setSecondaryRecipe = (
  state: GameState,
  buildingId: BuildingId,
  recipeId: RecipeId | null,
): GameState => {
  if (!isBuildingConstructed(state, buildingId)) {
    return state;
  }

  if (recipeId === null) {
    if (state.buildings[buildingId].secondaryRecipeId === null) {
      return state;
    }
    const next = cloneGameState(state);
    next.buildings[buildingId].secondaryRecipeId = null;
    return next;
  }

  const definition = buildingById[buildingId];
  if (
    !canUseSecondRecipeSlot(state, buildingId) ||
    !definition.recipes.includes(recipeId) ||
    !isRecipeAvailableInCurrentChapter(state, recipeId) ||
    recipeId === state.buildings[buildingId].recipeId
  ) {
    return state;
  }

  const next = cloneGameState(state);
  next.buildings[buildingId].secondaryRecipeId = recipeId;
  return next;
};

export const setWorkerShare = (
  state: GameState,
  buildingId: BuildingId,
  share: number,
): GameState => {
  if (!isBuildingConstructed(state, buildingId) || !Number.isFinite(share)) {
    return state;
  }

  const clampedShare = clamp(share, 0.1, 0.9);
  if (Math.abs(clampedShare - state.buildings[buildingId].workerShare) < 1e-9) {
    return state;
  }

  const next = cloneGameState(state);
  next.buildings[buildingId].workerShare = clampedShare;
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
  if (isUpgradeProjectComplete(state, project.id)) {
    return state;
  }

  const next = cloneGameState(state);
  const deliveries = { ...getUpgradeProjectDeliveries(state, project.id) };
  let changed = false;

  for (const resourceId of resourceIds) {
    const required = project.requirements[resourceId] ?? 0;
    if (required <= 0) {
      continue;
    }

    const already = deliveries[resourceId] ?? 0;
    const remaining = required - already;
    if (remaining <= 0) {
      continue;
    }

    const requestedAmount = Math.max(0, Math.trunc(contributions[resourceId] ?? 0));
    const spendable = Math.min(requestedAmount, Math.floor(next.resources[resourceId]), remaining);
    if (spendable <= 0) {
      continue;
    }

    next.resources[resourceId] -= spendable;
    deliveries[resourceId] = already + spendable;
    changed = true;
  }

  const moneyRequired = project.moneyRequirement ?? 0;
  if (moneyRequired > 0) {
    const alreadyMoney = getUpgradeProjectMoneyDelivered(state, project.id);
    const remainingMoney = moneyRequired - alreadyMoney;
    if (remainingMoney > 0) {
      const requestedMoneyAmount = Math.max(0, Math.trunc(requestedMoney));
      const spendableMoney = Math.min(requestedMoneyAmount, Math.floor(next.money), remainingMoney);
      if (spendableMoney > 0) {
        next.money -= spendableMoney;
        next.campaign.upgradeProjectMoneyDelivered[project.id] = alreadyMoney + spendableMoney;
        changed = true;
      }
    }
  }

  if (!changed) {
    return state;
  }

  next.campaign.upgradeProjectDeliveries[project.id] = deliveries;
  return next;
};

export const advanceChapter = (state: GameState): GameState => {
  const project = getCurrentUpgradeProject(state);
  if (!isUpgradeProjectComplete(state, project.id)) {
    return state;
  }

  if (state.campaign.completedUpgradeProjectIds.includes(project.id)) {
    return state;
  }

  const next = cloneGameState(state);
  next.campaign.completedUpgradeProjectIds = Array.from(
    new Set([...next.campaign.completedUpgradeProjectIds, project.id]),
  );
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

export const markStorySeen = (state: GameState, segmentId: ChapterId | 'victory'): GameState => {
  if (segmentId === 'victory') {
    if (state.campaign.seenVictory) {
      return state;
    }
    const next = cloneGameState(state);
    next.campaign.seenVictory = true;
    return next;
  }

  if (state.campaign.seenStoryChapters.includes(segmentId)) {
    return state;
  }

  const next = cloneGameState(state);
  next.campaign.seenStoryChapters = Array.from(
    new Set([...next.campaign.seenStoryChapters, segmentId]),
  );
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
