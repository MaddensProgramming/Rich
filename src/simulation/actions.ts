import { buildingById } from '../data/buildings';
import type { BuildingId, GameState, RecipeId, ResourceMap } from './types';
import { clamp, cloneGameState, spendResources, sumAssignedWorkers } from './utils';

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

export const assignWorkers = (
  state: GameState,
  buildingId: BuildingId,
  requestedWorkers: number,
): GameState => {
  const nextWorkerCount = Math.max(0, Math.trunc(requestedWorkers));
  const currentBuilding = state.buildings[buildingId];
  const assignedElsewhere = sumAssignedWorkers(state.buildings) - currentBuilding.workers;
  const maxForBuilding = Math.max(0, state.workers.total - assignedElsewhere);
  const next = cloneGameState(state);

  next.buildings[buildingId].workers = clamp(nextWorkerCount, 0, maxForBuilding);
  return next;
};

export const setRecipe = (state: GameState, buildingId: BuildingId, recipeId: RecipeId): GameState => {
  const definition = buildingById[buildingId];
  if (!definition.recipes.includes(recipeId)) {
    return state;
  }

  const next = cloneGameState(state);
  next.buildings[buildingId].recipeId = recipeId;
  return next;
};

export const upgradeBuilding = (state: GameState, buildingId: BuildingId): GameState => {
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
  if (state.offline.chargeSeconds <= 0) {
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
