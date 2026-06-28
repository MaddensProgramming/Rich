import { create } from 'zustand';
import { buildings, buildingById, recipes, recipeById } from '../data/buildings';
import { books, bookById, rarities, rarityLabels } from '../data/books';
import { resources, resourceById, resourceIds } from '../data/resources';
import {
  activateOfflineBoost as activateOfflineBoostInState,
  advanceWallClockState,
  assignWorkers as assignWorkersInState,
  buyBookPack as buyBookPackInState,
  buyResource as buyResourceInState,
  equipBook as equipBookInState,
  getMarketPrices,
  hireWorker as hireWorkerInState,
  hydrateGameState,
  prepareGameStateForSave,
  sellResource as sellResourceInState,
  setMarketAutomationRule as setMarketAutomationRuleInState,
  setRecipe as setRecipeInState,
  stopOfflineBoost as stopOfflineBoostInState,
  tickGame,
  upgradeBook as upgradeBookInState,
  upgradeBuilding as upgradeBuildingInState,
  upgradeHousing as upgradeHousingInState,
  createInitialGameState,
} from '../simulation';
import type {
  BookId,
  BookRarity,
  BuildingId,
  GameState,
  MarketPrice,
  MarketAutomationRule,
  RecipeId,
  ResourceId,
} from '../simulation';

const SAVE_KEY = 'mountain-factory-idle-save-v1';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readSavedState = (): GameState => {
  const storage = getStorage();
  if (!storage) {
    return createInitialGameState();
  }

  try {
    const raw = storage.getItem(SAVE_KEY);
    return raw ? hydrateGameState(JSON.parse(raw)) : createInitialGameState();
  } catch {
    return createInitialGameState();
  }
};

const writeSavedState = (state: GameState) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be disabled or quota-limited. The in-memory game can continue.
  }
};

const definitions = {
  resources,
  resourceById,
  resourceIds,
  buildings,
  buildingById,
  recipes,
  recipeById,
  books,
  bookById,
  rarities,
  rarityLabels,
};

type Definitions = typeof definitions;

export interface GameStore extends GameState {
  definitions: Definitions;
  marketPrices: Record<ResourceId, MarketPrice>;
  advanceTime: (now?: number) => void;
  tick: (deltaSeconds: number) => void;
  assignWorkers: (buildingId: BuildingId, workerCount: number) => void;
  setRecipe: (buildingId: BuildingId, recipeId: RecipeId) => void;
  buyResource: (resourceId: ResourceId, quantity: number) => void;
  sellResource: (resourceId: ResourceId, quantity: number) => void;
  setMarketAutomationRule: (
    resourceId: ResourceId,
    patch: Partial<Omit<MarketAutomationRule, 'lastRunAt'>>,
  ) => void;
  upgradeBuilding: (buildingId: BuildingId) => void;
  buyBookPack: () => void;
  equipBook: (
    buildingId: BuildingId,
    bookId: BookId | null,
    rarity?: BookRarity,
    slotIndex?: number,
  ) => void;
  upgradeBook: (bookId: BookId, rarity: BookRarity) => void;
  activateOfflineBoost: () => void;
  stopOfflineBoost: () => void;
  hireWorker: () => void;
  upgradeHousing: () => void;
  saveNow: () => void;
  resetGame: () => void;
}

const withDerivedState = (state: GameState) => ({
  ...state,
  marketPrices: getMarketPrices(state),
});

export const useGameStore = create<GameStore>((set, get) => {
  const initialState = readSavedState();
  let lastWallClockMs = Date.now();

  const advanceForWallClock = (state: GameState, now = Date.now()) => {
    const next = advanceWallClockState(state, now, lastWallClockMs);
    lastWallClockMs = now;
    return next;
  };

  return {
    ...withDerivedState(initialState),
    definitions,

    advanceTime: (now = Date.now()) => {
      set((state) => withDerivedState(advanceForWallClock(state, now)));
    },

    tick: (deltaSeconds) => {
      lastWallClockMs = Date.now();
      set((state) => withDerivedState(tickGame(state, deltaSeconds)));
    },

    assignWorkers: (buildingId, workerCount) => {
      set((state) => withDerivedState(assignWorkersInState(state, buildingId, workerCount)));
    },

    setRecipe: (buildingId, recipeId) => {
      set((state) => withDerivedState(setRecipeInState(state, buildingId, recipeId)));
    },

    buyResource: (resourceId, quantity) => {
      set((state) => withDerivedState(buyResourceInState(state, resourceId, quantity)));
    },

    sellResource: (resourceId, quantity) => {
      set((state) => withDerivedState(sellResourceInState(state, resourceId, quantity)));
    },

    setMarketAutomationRule: (resourceId, patch) => {
      set((state) => withDerivedState(setMarketAutomationRuleInState(state, resourceId, patch)));
    },

    upgradeBuilding: (buildingId) => {
      set((state) => withDerivedState(upgradeBuildingInState(state, buildingId)));
    },

    buyBookPack: () => {
      set((state) => withDerivedState(buyBookPackInState(state)));
    },

    equipBook: (buildingId, bookId, rarity = 'common', slotIndex) => {
      set((state) => withDerivedState(equipBookInState(state, buildingId, bookId, rarity, slotIndex)));
    },

    upgradeBook: (bookId, rarity) => {
      set((state) => withDerivedState(upgradeBookInState(state, bookId, rarity)));
    },

    activateOfflineBoost: () => {
      set((state) => withDerivedState(activateOfflineBoostInState(state)));
    },

    stopOfflineBoost: () => {
      set((state) => withDerivedState(stopOfflineBoostInState(state)));
    },

    hireWorker: () => {
      set((state) => withDerivedState(hireWorkerInState(state)));
    },

    upgradeHousing: () => {
      set((state) => withDerivedState(upgradeHousingInState(state)));
    },

    saveNow: () => {
      const now = Date.now();
      const advanced = advanceForWallClock(get(), now);
      const prepared = prepareGameStateForSave(advanced, now);
      writeSavedState(prepared);
      set(withDerivedState(prepared));
    },

    resetGame: () => {
      const now = Date.now();
      lastWallClockMs = now;
      const next = createInitialGameState(now);
      writeSavedState(prepareGameStateForSave(next, now));
      set(withDerivedState(next));
    },
  };
});
