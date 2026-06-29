import { buildingIds } from '../data/buildings';
import { resourceIds } from '../data/resources';
import type {
  BuildingId,
  BuildingState,
  BookKey,
  CampaignState,
  EquippedBook,
  GameState,
  MarketResourceState,
  ResourceId,
  ResourceMap,
  SimulationStats,
} from './types';

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const asFiniteNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const createResourceRecord = (amounts: ResourceMap = {}) =>
  Object.fromEntries(
    resourceIds.map((resourceId) => [
      resourceId,
      Math.max(0, asFiniteNumber(amounts[resourceId], 0)),
    ]),
  ) as Record<ResourceId, number>;

export const createResourceMap = (amounts: ResourceMap = {}): ResourceMap => {
  const next: ResourceMap = {};

  for (const resourceId of resourceIds) {
    const amount = amounts[resourceId];
    if (amount !== undefined && amount !== 0) {
      next[resourceId] = amount;
    }
  }

  return next;
};

export const createEmptyStats = (): SimulationStats => ({
  productionPerSecond: {},
  consumptionPerSecond: {},
  netPerSecond: {},
  buildingProductionPerSecond: Object.fromEntries(
    buildingIds.map((buildingId) => [buildingId, {}]),
  ) as Record<BuildingId, ResourceMap>,
  buildingConsumptionPerSecond: Object.fromEntries(
    buildingIds.map((buildingId) => [buildingId, {}]),
  ) as Record<BuildingId, ResourceMap>,
  effectiveWorkers: Object.fromEntries(
    buildingIds.map((buildingId) => [buildingId, 0]),
  ) as Record<BuildingId, number>,
  blockedBuildings: {},
  globalProductionMultiplier: 1,
  gameSpeed: 1,
});

export const addResourceMap = (target: ResourceMap, source: ResourceMap, multiplier = 1) => {
  for (const resourceId of resourceIds) {
    const amount = source[resourceId] ?? 0;
    if (amount !== 0) {
      target[resourceId] = (target[resourceId] ?? 0) + amount * multiplier;
    }
  }
};

export const addResourcesInPlace = (
  resources: Record<ResourceId, number>,
  amounts: ResourceMap,
  multiplier = 1,
) => {
  for (const resourceId of resourceIds) {
    const amount = amounts[resourceId] ?? 0;
    if (amount !== 0) {
      resources[resourceId] = Math.max(0, resources[resourceId] + amount * multiplier);
    }
  }
};

export const canAffordResources = (
  resources: Record<ResourceId, number>,
  cost: ResourceMap,
) =>
  resourceIds.every((resourceId) => resources[resourceId] + 1e-9 >= (cost[resourceId] ?? 0));

export const spendResources = (resources: Record<ResourceId, number>, cost: ResourceMap) => {
  if (!canAffordResources(resources, cost)) {
    return false;
  }

  for (const resourceId of resourceIds) {
    const amount = cost[resourceId] ?? 0;
    if (amount > 0) {
      resources[resourceId] = Math.max(0, resources[resourceId] - amount);
    }
  }

  return true;
};

export const sumAssignedWorkers = (buildings: Record<BuildingId, BuildingState>) =>
  buildingIds.reduce((total, buildingId) => total + buildings[buildingId].workers, 0);

export const cloneGameState = (state: GameState): GameState => ({
  version: state.version,
  rngSeed: Math.trunc(asFiniteNumber(state.rngSeed, 1)) >>> 0,
  createdAt: asFiniteNumber(state.createdAt, Date.now()),
  lastSavedAt: asFiniteNumber(state.lastSavedAt, Date.now()),
  totalGameSeconds: asFiniteNumber(state.totalGameSeconds, 0),
  money: Math.max(0, asFiniteNumber(state.money, 0)),
  resources: createResourceRecord(state.resources),
  workers: {
    total: Math.max(0, Math.trunc(asFiniteNumber(state.workers.total, 0))),
    housingCapacity: Math.max(0, Math.trunc(asFiniteNumber(state.workers.housingCapacity, 0))),
  },
  buildings: Object.fromEntries(
    buildingIds.map((buildingId) => {
      const building = state.buildings[buildingId];
      return [
        buildingId,
        {
          id: building.id,
          level: Math.max(1, Math.trunc(asFiniteNumber(building.level, 1))),
          workers: Math.max(0, Math.trunc(asFiniteNumber(building.workers, 0))),
          recipeId: building.recipeId,
          equippedBooks: building.equippedBooks.map((book) => ({ ...book })),
        },
      ];
    }),
  ) as Record<BuildingId, BuildingState>,
  market: Object.fromEntries(
    resourceIds.map((resourceId) => [
      resourceId,
      { pressure: asFiniteNumber(state.market[resourceId]?.pressure, 1) },
    ]),
  ) as Record<ResourceId, MarketResourceState>,
  marketAutomation: Object.fromEntries(
    resourceIds.map((resourceId) => {
      const rule = state.marketAutomation?.[resourceId];
      return [
        resourceId,
        {
          buyBelow:
            typeof rule?.buyBelow === 'number' && Number.isFinite(rule.buyBelow)
              ? Math.max(0, rule.buyBelow)
              : null,
          sellAbove:
            typeof rule?.sellAbove === 'number' && Number.isFinite(rule.sellAbove)
              ? Math.max(0, rule.sellAbove)
              : null,
          batchSize:
            typeof rule?.batchSize === 'number' && Number.isFinite(rule.batchSize)
              ? Math.max(1, Math.trunc(rule.batchSize))
              : 10,
          lastRunAt:
            typeof rule?.lastRunAt === 'number' && Number.isFinite(rule.lastRunAt)
              ? Math.max(0, rule.lastRunAt)
              : 0,
        },
      ];
    }),
  ) as GameState['marketAutomation'],
  books: {
    owned: Object.fromEntries(
      Object.entries(state.books.owned).map(([bookKey, count]) => [
        bookKey,
        Math.max(0, Math.trunc(asFiniteNumber(count, 0))),
      ]),
    ) as Partial<Record<BookKey, number>>,
  },
  campaign: {
    chapterId: state.campaign.chapterId,
    completedUpgradeProjectIds: [...state.campaign.completedUpgradeProjectIds],
    upgradeProjectProgress: Object.fromEntries(
      Object.entries(state.campaign.upgradeProjectProgress).map(([projectId, progress]) => [
        projectId,
        Math.max(0, asFiniteNumber(progress, 0)),
      ]),
    ) as CampaignState['upgradeProjectProgress'],
    constructedBuildings: Object.fromEntries(
      buildingIds.map((buildingId) => [
        buildingId,
        Boolean(state.campaign.constructedBuildings[buildingId]),
      ]),
    ) as CampaignState['constructedBuildings'],
    unlockedSystems: {
      ...state.campaign.unlockedSystems,
    },
    clearingWood: Math.max(0, asFiniteNumber(state.campaign.clearingWood, 0)),
    clearingStone: Math.max(0, asFiniteNumber(state.campaign.clearingStone, 0)),
    clearingVegetables: Math.max(0, asFiniteNumber(state.campaign.clearingVegetables, 0)),
    campaignComplete: Boolean(state.campaign.campaignComplete),
  },
  offline: {
    chargeSeconds: Math.max(0, asFiniteNumber(state.offline.chargeSeconds, 0)),
    active: Boolean(state.offline.active),
  },
  stats: {
    productionPerSecond: createResourceMap(state.stats.productionPerSecond),
    consumptionPerSecond: createResourceMap(state.stats.consumptionPerSecond),
    netPerSecond: createResourceMap(state.stats.netPerSecond),
    buildingProductionPerSecond: Object.fromEntries(
      buildingIds.map((buildingId) => [
        buildingId,
        createResourceMap(state.stats.buildingProductionPerSecond?.[buildingId]),
      ]),
    ) as Record<BuildingId, ResourceMap>,
    buildingConsumptionPerSecond: Object.fromEntries(
      buildingIds.map((buildingId) => [
        buildingId,
        createResourceMap(state.stats.buildingConsumptionPerSecond?.[buildingId]),
      ]),
    ) as Record<BuildingId, ResourceMap>,
    effectiveWorkers: Object.fromEntries(
      buildingIds.map((buildingId) => [
        buildingId,
        Math.max(0, asFiniteNumber(state.stats.effectiveWorkers[buildingId], 0)),
      ]),
    ) as Record<BuildingId, number>,
    blockedBuildings: { ...state.stats.blockedBuildings },
    globalProductionMultiplier: asFiniteNumber(state.stats.globalProductionMultiplier, 1),
    gameSpeed: asFiniteNumber(state.stats.gameSpeed, 1),
  },
  recentBookPack: state.recentBookPack.map((book: EquippedBook) => ({ ...book })),
});
