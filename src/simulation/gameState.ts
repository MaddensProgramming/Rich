import { chapterById, chapterUpgradeProjectById } from '../data/chapterProjects';
import { buildingById, buildingIds } from '../data/buildings';
import { bookById, rarities } from '../data/books';
import { resourceIds } from '../data/resources';
import type {
  BuildingState,
  BookKey,
  BookRarity,
  BuildingId,
  CampaignState,
  ChapterId,
  EquippedBook,
  GameState,
  MarketAutomationRule,
  MarketResourceState,
  ResourceId,
  SystemId,
} from './types';
import { asFiniteNumber, clamp, cloneGameState, createEmptyStats, createResourceRecord } from './utils';

export const SAVE_VERSION = 2;
export const DEFAULT_RNG_SEED = 0xdecafbad;
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
export const MAX_OFFLINE_BOOST_GAME_SECONDS = 20 * 60;
export const OFFLINE_BOOST_MULTIPLIER = 5;
export const FOOD_CONSUMPTION_PER_WORKER = 0.05;
export const DEFAULT_AUTO_MARKET_BATCH_SIZE = 10;
export const INITIAL_CLEARING_WOOD = 60;
export const INITIAL_CLEARING_STONE = 45;
export const INITIAL_CLEARING_VEGETABLES = 35;

const initialWorkers: Record<BuildingId, number> = {
  mine: 0,
  lumberjack: 0,
  farm: 0,
  food_maker: 0,
  smelter: 0,
  blacksmith: 0,
};

const initialRecipes: Record<BuildingId, BuildingState['recipeId']> = {
  mine: 'mine_balanced',
  lumberjack: 'lumberjack_wood',
  farm: 'farm_vegetables',
  food_maker: 'food_maker_basic_food',
  smelter: 'smelter_iron_bars',
  blacksmith: 'blacksmith_bows',
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isBookRarity = (value: unknown): value is BookRarity =>
  typeof value === 'string' && (rarities as string[]).includes(value);

const isChapterId = (value: unknown): value is ChapterId =>
  typeof value === 'string' && value in chapterById;

const normalizeEquippedBooks = (value: unknown, buildingId: BuildingId): EquippedBook[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((book): book is EquippedBook => {
      if (!isObject(book) || typeof book.bookId !== 'string' || !isBookRarity(book.rarity)) {
        return false;
      }

      return bookById[book.bookId as keyof typeof bookById]?.buildingId === buildingId;
    })
    .slice(0, 2)
    .map((book) => ({ bookId: book.bookId, rarity: book.rarity }));
};

const normalizeAutomationRule = (value: unknown): MarketAutomationRule => {
  const rawRule = isObject(value) ? value : {};
  const buyBelow = asFiniteNumber(rawRule.buyBelow, Number.NaN);
  const sellAbove = asFiniteNumber(rawRule.sellAbove, Number.NaN);
  const batchSize = Math.trunc(asFiniteNumber(rawRule.batchSize, DEFAULT_AUTO_MARKET_BATCH_SIZE));
  const lastRunAt = asFiniteNumber(rawRule.lastRunAt, 0);

  return {
    buyBelow: Number.isFinite(buyBelow) && buyBelow > 0 ? buyBelow : null,
    sellAbove: Number.isFinite(sellAbove) && sellAbove >= 0 ? sellAbove : null,
    batchSize: clamp(batchSize, 1, 1000),
    lastRunAt: Math.max(0, lastRunAt),
  };
};

const createDefaultConstructedBuildings = (constructed = false) =>
  Object.fromEntries(buildingIds.map((buildingId) => [buildingId, constructed])) as Partial<
    Record<BuildingId, boolean>
  >;

const normalizeUnlockedSystems = (
  value: unknown,
  chapterId: ChapterId,
): Partial<Record<SystemId, boolean>> => {
  const rawSystems = isObject(value) ? value : {};
  const initialChapter = chapterById[chapterId];

  return initialChapter.unlockedSystemIds.reduce<Partial<Record<SystemId, boolean>>>(
    (systems, id) => {
      systems[id] = true;
      return systems;
    },
    {
      construction: Boolean(rawSystems.construction),
      manualGather: Boolean(rawSystems.manualGather),
      market: Boolean(rawSystems.market),
      library: Boolean(rawSystems.library),
      offlineBoost: Boolean(rawSystems.offlineBoost),
    },
  );
};

const createDefaultCampaignState = (): CampaignState => ({
  chapterId: 'arrival',
  completedUpgradeProjectIds: [],
  upgradeProjectProgress: {},
  constructedBuildings: createDefaultConstructedBuildings(false),
  unlockedSystems: {
    construction: true,
    manualGather: true,
    market: false,
    library: false,
    offlineBoost: false,
  },
  clearingWood: INITIAL_CLEARING_WOOD,
  clearingStone: INITIAL_CLEARING_STONE,
  clearingVegetables: INITIAL_CLEARING_VEGETABLES,
  campaignComplete: false,
});

const hasLegacyBuildingProgress = (rawBuildings: Record<string, unknown>) =>
  buildingIds.some((buildingId) => {
    const rawBuilding = isObject(rawBuildings[buildingId]) ? rawBuildings[buildingId] : {};
    return (
      Math.trunc(asFiniteNumber(rawBuilding.workers, 0)) > 0 ||
      Math.trunc(asFiniteNumber(rawBuilding.level, 1)) > 1
    );
  });

const normalizeCampaignState = (
  rawCampaign: unknown,
  rawBuildings: Record<string, unknown>,
  initialChapterId: ChapterId,
): CampaignState => {
  const fallback = createDefaultCampaignState();
  const legacyProgress = hasLegacyBuildingProgress(rawBuildings);
  const raw = isObject(rawCampaign) ? rawCampaign : {};
  const chapterId = isChapterId(raw.chapterId)
    ? raw.chapterId
    : legacyProgress
      ? 'hamlet'
      : initialChapterId;
  const chapter = chapterById[chapterId];
  const rawConstructedBuildings = isObject(raw.constructedBuildings) ? raw.constructedBuildings : {};
  const rawProgress = isObject(raw.upgradeProjectProgress) ? raw.upgradeProjectProgress : {};
  const rawCompletedProjects = Array.isArray(raw.completedUpgradeProjectIds)
    ? raw.completedUpgradeProjectIds
    : [];

  return {
    chapterId,
    completedUpgradeProjectIds: rawCompletedProjects.filter(
      (projectId): projectId is string =>
        typeof projectId === 'string' && projectId in chapterUpgradeProjectById,
    ),
    upgradeProjectProgress: Object.fromEntries(
      Object.entries(rawProgress)
        .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
        .map(([projectId, value]) => [projectId, Math.max(0, asFiniteNumber(value, 0))]),
    ),
    constructedBuildings: Object.fromEntries(
      buildingIds.map((buildingId) => [
        buildingId,
        Boolean(
          rawConstructedBuildings[buildingId] ??
            (legacyProgress && isObject(rawBuildings[buildingId])
              ? Math.trunc(asFiniteNumber(rawBuildings[buildingId].workers, 0)) > 0 ||
                Math.trunc(asFiniteNumber(rawBuildings[buildingId].level, 1)) > 1
              : false),
        ),
      ]),
    ) as Partial<Record<BuildingId, boolean>>,
    unlockedSystems: {
      ...fallback.unlockedSystems,
      ...normalizeUnlockedSystems(raw.unlockedSystems, chapterId),
      ...Object.fromEntries(chapter.unlockedSystemIds.map((id) => [id, true])),
    },
    clearingWood: Math.max(
      0,
      asFiniteNumber(raw.clearingWood, legacyProgress ? 0 : fallback.clearingWood),
    ),
    clearingStone: Math.max(
      0,
      asFiniteNumber(raw.clearingStone, legacyProgress ? 0 : fallback.clearingStone),
    ),
    clearingVegetables: Math.max(
      0,
      asFiniteNumber(raw.clearingVegetables, legacyProgress ? 0 : fallback.clearingVegetables),
    ),
    campaignComplete: Boolean(raw.campaignComplete),
  };
};

export const isBuildingConstructed = (state: GameState, buildingId: BuildingId) =>
  Boolean(state.campaign.constructedBuildings[buildingId]);

export const getCampaignChapter = (state: GameState) => chapterById[state.campaign.chapterId];

export const createDefaultMarketAutomation = () =>
  Object.fromEntries(
    resourceIds.map((resourceId) => [
      resourceId,
      {
        buyBelow: null,
        sellAbove: null,
        batchSize: DEFAULT_AUTO_MARKET_BATCH_SIZE,
        lastRunAt: 0,
      },
    ]),
  ) as Record<ResourceId, MarketAutomationRule>;

export const createInitialGameState = (now = Date.now()): GameState => ({
  version: SAVE_VERSION,
  rngSeed: DEFAULT_RNG_SEED,
  createdAt: now,
  lastSavedAt: now,
  totalGameSeconds: 0,
  money: 100,
  resources: createResourceRecord({
    coal: 0,
    iron_ore: 0,
    stone: 10,
    wood: 12,
    vegetables: 8,
    food: 18,
    iron_bars: 0,
  }),
  workers: {
    total: 1,
    housingCapacity: 8,
  },
  buildings: Object.fromEntries(
    buildingIds.map((buildingId) => [
      buildingId,
      {
        id: buildingId,
        level: 1,
        workers: initialWorkers[buildingId],
        recipeId: initialRecipes[buildingId],
        equippedBooks: [],
      },
    ]),
  ) as unknown as Record<BuildingId, BuildingState>,
  market: Object.fromEntries(
    resourceIds.map((resourceId) => [resourceId, { pressure: 1 }]),
  ) as Record<ResourceId, MarketResourceState>,
  marketAutomation: createDefaultMarketAutomation(),
  books: {
    owned: {},
  },
  campaign: createDefaultCampaignState(),
  offline: {
    chargeSeconds: 0,
    active: false,
  },
  stats: createEmptyStats(),
  recentBookPack: [],
});

export const sanitizeGameState = (value: unknown, now = Date.now()): GameState => {
  const initial = createInitialGameState(now);
  if (!isObject(value)) {
    return initial;
  }

  const rawWorkers = isObject(value.workers) ? value.workers : {};
  const rawResources = isObject(value.resources) ? value.resources : {};
  const rawBuildings = isObject(value.buildings) ? value.buildings : {};
  const rawMarket = isObject(value.market) ? value.market : {};
  const rawMarketAutomation = isObject(value.marketAutomation) ? value.marketAutomation : {};
  const rawBooks = isObject(value.books) ? value.books : {};
  const rawOwnedBooks = isObject(rawBooks.owned) ? rawBooks.owned : {};
  const rawOffline = isObject(value.offline) ? value.offline : {};
  const rawCampaign = isObject(value.campaign) ? value.campaign : {};

  const next = cloneGameState(initial);
  next.version = SAVE_VERSION;
  next.rngSeed = Math.trunc(asFiniteNumber(value.rngSeed, DEFAULT_RNG_SEED)) >>> 0;
  next.createdAt = asFiniteNumber(value.createdAt, now);
  next.lastSavedAt = asFiniteNumber(value.lastSavedAt, now);
  next.totalGameSeconds = Math.max(0, asFiniteNumber(value.totalGameSeconds, 0));
  next.money = Math.max(0, asFiniteNumber(value.money, initial.money));
  next.resources = createResourceRecord(rawResources);
  const housingCapacity = Math.max(
    1,
    Math.trunc(asFiniteNumber(rawWorkers.housingCapacity, initial.workers.housingCapacity)),
  );
  next.workers = {
    total: clamp(
      Math.trunc(asFiniteNumber(rawWorkers.total, initial.workers.total)),
      0,
      housingCapacity,
    ),
    housingCapacity,
  };

  let remainingAssignableWorkers = next.workers.total;

  for (const buildingId of buildingIds) {
    const rawBuilding = isObject(rawBuildings[buildingId]) ? rawBuildings[buildingId] : {};
    const definition = buildingById[buildingId];
    const rawRecipeId = rawBuilding.recipeId;
    const recipeId =
      typeof rawRecipeId === 'string' && definition.recipes.includes(rawRecipeId as never)
        ? (rawRecipeId as BuildingState['recipeId'])
        : initialRecipes[buildingId];

    const requestedWorkers = Math.max(0, Math.trunc(asFiniteNumber(rawBuilding.workers, 0)));
    const assignedWorkers = Math.min(requestedWorkers, remainingAssignableWorkers);
    remainingAssignableWorkers -= assignedWorkers;

    next.buildings[buildingId] = {
      id: buildingId,
      level: clamp(Math.trunc(asFiniteNumber(rawBuilding.level, 1)), 1, 5),
      workers: assignedWorkers,
      recipeId,
      equippedBooks: normalizeEquippedBooks(rawBuilding.equippedBooks, buildingId),
    };
  }

  for (const resourceId of resourceIds) {
    const rawMarketResource = isObject(rawMarket[resourceId]) ? rawMarket[resourceId] : {};
    next.market[resourceId] = {
      pressure: clamp(asFiniteNumber(rawMarketResource.pressure, 1), 0.25, 4),
    };
    next.marketAutomation[resourceId] = normalizeAutomationRule(rawMarketAutomation[resourceId]);
  }

  for (const [key, count] of Object.entries(rawOwnedBooks)) {
    const [bookId, rarity] = key.split(':');
    if (bookById[bookId as keyof typeof bookById] && isBookRarity(rarity)) {
      next.books.owned[key as BookKey] = Math.max(0, Math.trunc(asFiniteNumber(count, 0)));
    }
  }

  next.offline = {
    chargeSeconds: clamp(
      asFiniteNumber(rawOffline.chargeSeconds, 0),
      0,
      MAX_OFFLINE_BOOST_GAME_SECONDS,
    ),
    active: Boolean(rawOffline.active),
  };
  next.campaign = normalizeCampaignState(rawCampaign, rawBuildings, initial.campaign.chapterId);
  const currentChapter = chapterById[next.campaign.chapterId];

  for (const buildingId of buildingIds) {
    const building = next.buildings[buildingId];
    const buildingAvailable = currentChapter.availableBuildingIds.includes(buildingId);
    const fallbackRecipe = buildingById[buildingId].recipes.find((recipeId) =>
      currentChapter.availableRecipeIds.includes(recipeId),
    );

    if (next.campaign.constructedBuildings[buildingId] && buildingAvailable && fallbackRecipe) {
      if (!currentChapter.availableRecipeIds.includes(building.recipeId)) {
        building.recipeId = fallbackRecipe;
      }
    }

    if (!next.campaign.constructedBuildings[buildingId] || !buildingAvailable || !fallbackRecipe) {
      building.workers = 0;
    }
  }

  if (!isObject(value.campaign)) {
    const legacyChapter = next.campaign.chapterId;
    const legacyChapterDefinition = chapterById[legacyChapter];
    next.campaign.unlockedSystems = {
      construction: true,
      manualGather: true,
      market: legacyChapterDefinition.unlockedSystemIds.includes('market'),
      library: legacyChapterDefinition.unlockedSystemIds.includes('library'),
      offlineBoost: legacyChapterDefinition.unlockedSystemIds.includes('offlineBoost'),
    };
  }

  return next;
};

export const addOfflineCharge = (state: GameState, elapsedSeconds: number): GameState => {
  if (!state.campaign.unlockedSystems.offlineBoost) {
    return cloneGameState(state);
  }

  const next = cloneGameState(state);
  const cappedElapsed = clamp(elapsedSeconds, 0, MAX_OFFLINE_SECONDS);
  const earnedCharge = (cappedElapsed / MAX_OFFLINE_SECONDS) * MAX_OFFLINE_BOOST_GAME_SECONDS;

  next.offline.chargeSeconds = clamp(
    next.offline.chargeSeconds + earnedCharge,
    0,
    MAX_OFFLINE_BOOST_GAME_SECONDS,
  );
  next.offline.active = false;

  return next;
};

export const applyOfflineProgress = (state: GameState, now = Date.now()): GameState => {
  const elapsedSeconds = (now - state.lastSavedAt) / 1000;
  const next = addOfflineCharge(state, elapsedSeconds);
  next.lastSavedAt = now;

  return next;
};

export const hydrateGameState = (value: unknown, now = Date.now()) =>
  applyOfflineProgress(sanitizeGameState(value, now), now);

export const prepareGameStateForSave = (state: GameState, now = Date.now()): GameState => ({
  ...cloneGameState(state),
  lastSavedAt: now,
});
