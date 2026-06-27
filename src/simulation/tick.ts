import { buildingById, buildingIds, recipeById } from '../data/buildings';
import { resourceIds } from '../data/resources';
import { getBuildingBookEffects, getFoodConsumptionMultiplier } from './books';
import {
  FOOD_CONSUMPTION_PER_WORKER,
  MAX_OFFLINE_BOOST_GAME_SECONDS,
  OFFLINE_BOOST_MULTIPLIER,
} from './gameState';
import { driftMarketPressureInPlace } from './market';
import type { BuildingId, GameState, ResourceMap } from './types';
import {
  addResourceMap,
  asFiniteNumber,
  clamp,
  cloneGameState,
  createEmptyStats,
  createResourceMap,
} from './utils';

const MAX_STEP_SECONDS = 1;
const FOOD_SHORTAGE_PRODUCTION_MULTIPLIER = 0.25;

const computeBoostedGameSeconds = (state: GameState, realDeltaSeconds: number) => {
  if (!state.offline.active || state.offline.chargeSeconds <= 0) {
    return {
      gameSeconds: realDeltaSeconds,
      remainingChargeSeconds: state.offline.chargeSeconds,
      active: false,
    };
  }

  const boostedGameSeconds = Math.min(
    state.offline.chargeSeconds,
    realDeltaSeconds * OFFLINE_BOOST_MULTIPLIER,
  );
  const realSecondsSpentBoosting = boostedGameSeconds / OFFLINE_BOOST_MULTIPLIER;
  const normalGameSeconds = Math.max(0, realDeltaSeconds - realSecondsSpentBoosting);
  const remainingChargeSeconds = Math.max(0, state.offline.chargeSeconds - boostedGameSeconds);

  return {
    gameSeconds: boostedGameSeconds + normalGameSeconds,
    remainingChargeSeconds,
    active: remainingChargeSeconds > 1e-6,
  };
};

const getInputMultiplier = (inputBonuses: ResourceMap, resourceId: keyof ResourceMap) =>
  clamp(1 + (inputBonuses[resourceId] ?? 0), 0.35, 2);

const getOutputMultiplier = (outputBonuses: ResourceMap, resourceId: keyof ResourceMap) =>
  Math.max(0, 1 + (outputBonuses[resourceId] ?? 0));

export const getTownFoodConsumptionPerSecond = (state: GameState) =>
  state.workers.total * FOOD_CONSUMPTION_PER_WORKER * getFoodConsumptionMultiplier(state);

const runSimulationStep = (
  state: GameState,
  deltaSeconds: number,
  totals: {
    produced: ResourceMap;
    consumed: ResourceMap;
    buildingProduced: Record<BuildingId, ResourceMap>;
    buildingConsumed: Record<BuildingId, ResourceMap>;
    effectiveWorkers: Record<BuildingId, number>;
    blockedBuildings: GameState['stats']['blockedBuildings'];
  },
) => {
  const foodConsumption = getTownFoodConsumptionPerSecond(state) * deltaSeconds;

  if (foodConsumption > 0) {
    const actualFoodConsumed = Math.min(state.resources.food, foodConsumption);
    state.resources.food = Math.max(0, state.resources.food - actualFoodConsumed);
    totals.consumed.food = (totals.consumed.food ?? 0) + actualFoodConsumed;
  }

  const globalProductionMultiplier =
    state.resources.food <= 0 ? FOOD_SHORTAGE_PRODUCTION_MULTIPLIER : 1;

  for (const buildingId of buildingIds) {
    const building = state.buildings[buildingId];
    const workerCount = Math.max(0, building.workers);

    if (workerCount <= 0) {
      totals.effectiveWorkers[buildingId] = 0;
      continue;
    }

    const definition = buildingById[buildingId];
    const recipe = recipeById[building.recipeId];
    const bookEffects = getBuildingBookEffects(state, buildingId);
    const exponent = clamp(
      0.85 + (building.level - 1) * 0.015 + bookEffects.efficiencyExponentBonus,
      0.65,
      0.97,
    );
    const effectiveWorkers = workerCount ** exponent;
    const buildingMultiplier = definition.baseProductionMultiplier * (1 + (building.level - 1) * 0.25);
    const recipeRuns = effectiveWorkers * buildingMultiplier * globalProductionMultiplier * deltaSeconds;

    totals.effectiveWorkers[buildingId] = effectiveWorkers;

    if (recipeRuns <= 0) {
      continue;
    }

    const requiredInputs: ResourceMap = {};
    let bottleneck = 1;

    for (const resourceId of resourceIds) {
      const baseInput = recipe.inputs[resourceId] ?? 0;
      if (baseInput <= 0) {
        continue;
      }

      const required =
        baseInput * getInputMultiplier(bookEffects.inputMultiplierBonus, resourceId) * recipeRuns;
      requiredInputs[resourceId] = required;
      bottleneck = Math.min(bottleneck, required > 0 ? state.resources[resourceId] / required : 1);
    }

    const scale = clamp(bottleneck, 0, 1);
    if (scale < 0.999) {
      const missingResource = resourceIds.find(
        (resourceId) => (requiredInputs[resourceId] ?? 0) > state.resources[resourceId] + 1e-9,
      );
      totals.blockedBuildings[buildingId] = missingResource
        ? `Short on ${missingResource.replace('_', ' ')}`
        : 'Input limited';
    } else {
      delete totals.blockedBuildings[buildingId];
    }

    if (scale <= 1e-9) {
      continue;
    }

    for (const resourceId of resourceIds) {
      const consumed = (requiredInputs[resourceId] ?? 0) * scale;
      if (consumed > 0) {
        state.resources[resourceId] = Math.max(0, state.resources[resourceId] - consumed);
        totals.consumed[resourceId] = (totals.consumed[resourceId] ?? 0) + consumed;
        totals.buildingConsumed[buildingId][resourceId] =
          (totals.buildingConsumed[buildingId][resourceId] ?? 0) + consumed;
      }
    }

    const produced: ResourceMap = {};
    for (const resourceId of resourceIds) {
      const baseOutput = recipe.outputs[resourceId] ?? 0;
      if (baseOutput <= 0) {
        continue;
      }

      produced[resourceId] =
        baseOutput * getOutputMultiplier(bookEffects.outputMultiplierBonus, resourceId) * recipeRuns * scale;
    }

    addResourceMap(totals.produced, produced);
    addResourceMap(totals.buildingProduced[buildingId], produced);
    for (const resourceId of resourceIds) {
      state.resources[resourceId] += produced[resourceId] ?? 0;
    }
  }

  driftMarketPressureInPlace(state, deltaSeconds);
  state.stats.globalProductionMultiplier = globalProductionMultiplier;
};

export const tickGame = (state: GameState, requestedDeltaSeconds: number): GameState => {
  const realDeltaSeconds = clamp(asFiniteNumber(requestedDeltaSeconds, 0), 0, 60);
  if (realDeltaSeconds <= 0) {
    return state;
  }

  const next = cloneGameState(state);
  const boost = computeBoostedGameSeconds(next, realDeltaSeconds);
  const gameSeconds = boost.gameSeconds;
  const emptyStats = createEmptyStats();
  const totals = {
    produced: {} as ResourceMap,
    consumed: {} as ResourceMap,
    buildingProduced: emptyStats.buildingProductionPerSecond,
    buildingConsumed: emptyStats.buildingConsumptionPerSecond,
    effectiveWorkers: emptyStats.effectiveWorkers,
    blockedBuildings: {} as GameState['stats']['blockedBuildings'],
  };

  next.offline.chargeSeconds = clamp(
    boost.remainingChargeSeconds,
    0,
    MAX_OFFLINE_BOOST_GAME_SECONDS,
  );
  next.offline.active = boost.active;

  let remaining = gameSeconds;
  while (remaining > 1e-9) {
    const step = Math.min(MAX_STEP_SECONDS, remaining);
    runSimulationStep(next, step, totals);
    remaining -= step;
  }

  next.totalGameSeconds += gameSeconds;
  const productionPerSecond = createResourceMap();
  const consumptionPerSecond = createResourceMap();
  const netPerSecond = createResourceMap();
  const buildingProductionPerSecond = createEmptyStats().buildingProductionPerSecond;
  const buildingConsumptionPerSecond = createEmptyStats().buildingConsumptionPerSecond;

  for (const resourceId of resourceIds) {
    const produced = (totals.produced[resourceId] ?? 0) / gameSeconds;
    const consumed = (totals.consumed[resourceId] ?? 0) / gameSeconds;
    const net = produced - consumed;

    if (Math.abs(produced) > 1e-9) {
      productionPerSecond[resourceId] = produced;
    }

    if (Math.abs(consumed) > 1e-9) {
      consumptionPerSecond[resourceId] = consumed;
    }

    if (Math.abs(net) > 1e-9) {
      netPerSecond[resourceId] = net;
    }
  }

  for (const buildingId of buildingIds) {
    for (const resourceId of resourceIds) {
      const produced = (totals.buildingProduced[buildingId][resourceId] ?? 0) / gameSeconds;
      const consumed = (totals.buildingConsumed[buildingId][resourceId] ?? 0) / gameSeconds;

      if (Math.abs(produced) > 1e-9) {
        buildingProductionPerSecond[buildingId][resourceId] = produced;
      }

      if (Math.abs(consumed) > 1e-9) {
        buildingConsumptionPerSecond[buildingId][resourceId] = consumed;
      }
    }
  }

  next.stats = {
    productionPerSecond,
    consumptionPerSecond,
    netPerSecond,
    buildingProductionPerSecond,
    buildingConsumptionPerSecond,
    effectiveWorkers: totals.effectiveWorkers,
    blockedBuildings: totals.blockedBuildings,
    globalProductionMultiplier: next.stats.globalProductionMultiplier,
    gameSpeed: gameSeconds / realDeltaSeconds,
  };

  return next;
};
