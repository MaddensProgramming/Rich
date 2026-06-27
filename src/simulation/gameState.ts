import { buildingById, buildingIds } from '../data/buildings';
import { bookById, rarities } from '../data/books';
import { resourceIds } from '../data/resources';
import type {
  BookKey,
  BookRarity,
  BuildingId,
  BuildingState,
  EquippedBook,
  GameState,
  MarketResourceState,
  ResourceId,
} from './types';
import { asFiniteNumber, clamp, cloneGameState, createEmptyStats, createResourceRecord } from './utils';

export const SAVE_VERSION = 1;
export const DEFAULT_RNG_SEED = 0xdecafbad;
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
export const MAX_OFFLINE_BOOST_GAME_SECONDS = 20 * 60;
export const OFFLINE_BOOST_MULTIPLIER = 5;
export const FOOD_CONSUMPTION_PER_WORKER = 0.025;

const initialWorkers: Record<BuildingId, number> = {
  mine: 2,
  lumberjack: 1,
  farm: 2,
  food_maker: 1,
  smelter: 1,
  blacksmith: 1,
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

export const createInitialGameState = (now = Date.now()): GameState => ({
  version: SAVE_VERSION,
  rngSeed: DEFAULT_RNG_SEED,
  createdAt: now,
  lastSavedAt: now,
  totalGameSeconds: 0,
  money: 150,
  resources: createResourceRecord({
    coal: 20,
    iron_ore: 18,
    stone: 36,
    wood: 48,
    vegetables: 90,
    food: 45,
    iron_bars: 4,
  }),
  workers: {
    total: 8,
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
  books: {
    owned: {},
  },
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
  const rawBooks = isObject(value.books) ? value.books : {};
  const rawOwnedBooks = isObject(rawBooks.owned) ? rawBooks.owned : {};
  const rawOffline = isObject(value.offline) ? value.offline : {};

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

  return next;
};

export const addOfflineCharge = (state: GameState, elapsedSeconds: number): GameState => {
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
