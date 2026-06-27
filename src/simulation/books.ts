import { buildingIds } from '../data/buildings';
import { bookById, books, rarities, rarityStrength } from '../data/books';
import { resourceIds } from '../data/resources';
import type {
  BookId,
  BookKey,
  BookRarity,
  BuildingId,
  EquippedBook,
  GameState,
  ResourceId,
  ResourceMap,
} from './types';
import { clamp, cloneGameState } from './utils';

export const BASIC_BOOK_PACK_COST = 120;
export const BASIC_BOOK_PACK_SIZE = 3;
export const BOOK_UPGRADE_COPY_COST = 5;
export const MAX_EQUIPPED_BOOKS_PER_BUILDING = 2;

export interface BuildingBookEffects {
  outputMultiplierBonus: ResourceMap;
  inputMultiplierBonus: ResourceMap;
  efficiencyExponentBonus: number;
}

const rarityIndex = Object.fromEntries(
  rarities.map((rarity, index) => [rarity, index]),
) as Record<BookRarity, number>;

export const makeBookKey = (bookId: BookId, rarity: BookRarity): BookKey => `${bookId}:${rarity}`;

export const parseBookKey = (bookKey: BookKey) => {
  const [bookId, rarity] = bookKey.split(':') as [BookId, BookRarity];
  return { bookId, rarity };
};

export const nextRandom = (seed: number) => {
  const nextSeed = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return {
    seed: nextSeed,
    value: nextSeed / 0x100000000,
  };
};

export const getNextRarity = (rarity: BookRarity): BookRarity | null =>
  rarities[rarityIndex[rarity] + 1] ?? null;

export const getOwnedBookCount = (state: GameState, bookId: BookId, rarity: BookRarity) =>
  state.books.owned[makeBookKey(bookId, rarity)] ?? 0;

const countEquippedBook = (
  state: GameState,
  bookId: BookId,
  rarity: BookRarity,
  ignoredBuildingId?: BuildingId,
  ignoredSlot?: number,
) =>
  buildingIds.reduce((count, buildingId) => {
    return (
      count +
      state.buildings[buildingId].equippedBooks.filter((book, index) => {
        if (buildingId === ignoredBuildingId && index === ignoredSlot) {
          return false;
        }

        return book.bookId === bookId && book.rarity === rarity;
      }).length
    );
  }, 0);

const grantBookCopy = (state: GameState, book: EquippedBook) => {
  const key = makeBookKey(book.bookId, book.rarity);
  state.books.owned[key] = (state.books.owned[key] ?? 0) + 1;
};

const rollBookRarity = (roll: number): BookRarity => {
  if (roll < 0.8) {
    return 'common';
  }

  if (roll < 0.97) {
    return 'uncommon';
  }

  return 'rare';
};

export const buyBookPack = (state: GameState): GameState => {
  if (state.money + 1e-9 < BASIC_BOOK_PACK_COST) {
    return state;
  }

  const next = cloneGameState(state);
  const pack: EquippedBook[] = [];
  next.money -= BASIC_BOOK_PACK_COST;

  for (let index = 0; index < BASIC_BOOK_PACK_SIZE; index += 1) {
    const rarityRoll = nextRandom(next.rngSeed);
    next.rngSeed = rarityRoll.seed;

    const bookRoll = nextRandom(next.rngSeed);
    next.rngSeed = bookRoll.seed;

    const definition = books[Math.floor(bookRoll.value * books.length)];
    const book = {
      bookId: definition.id,
      rarity: rollBookRarity(rarityRoll.value),
    };

    grantBookCopy(next, book);
    pack.push(book);
  }

  next.recentBookPack = pack;
  return next;
};

export const equipBook = (
  state: GameState,
  buildingId: BuildingId,
  bookId: BookId | null,
  rarity: BookRarity = 'common',
  slotIndex?: number,
): GameState => {
  if (bookId === null) {
    if (slotIndex === undefined) {
      return state;
    }

    const next = cloneGameState(state);
    next.buildings[buildingId].equippedBooks = next.buildings[buildingId].equippedBooks.filter(
      (_, index) => index !== slotIndex,
    );
    return next;
  }

  const definition = bookById[bookId];
  if (!definition || definition.buildingId !== buildingId || getOwnedBookCount(state, bookId, rarity) <= 0) {
    return state;
  }

  const existing = state.buildings[buildingId].equippedBooks;
  const normalizedSlot = slotIndex === undefined ? undefined : Math.trunc(slotIndex);
  const replacingSlot =
    normalizedSlot !== undefined && normalizedSlot >= 0 && normalizedSlot < MAX_EQUIPPED_BOOKS_PER_BUILDING
      ? normalizedSlot
      : undefined;

  if (existing.some((book, index) => book.bookId === bookId && index !== replacingSlot)) {
    return state;
  }

  if (replacingSlot === undefined && existing.length >= MAX_EQUIPPED_BOOKS_PER_BUILDING) {
    return state;
  }

  if (countEquippedBook(state, bookId, rarity, buildingId, replacingSlot) >= getOwnedBookCount(state, bookId, rarity)) {
    return state;
  }

  const next = cloneGameState(state);
  const equipped = [...next.buildings[buildingId].equippedBooks];
  const nextBook = { bookId, rarity };

  if (replacingSlot === undefined) {
    equipped.push(nextBook);
  } else if (replacingSlot < equipped.length) {
    equipped[replacingSlot] = nextBook;
  } else {
    equipped.push(nextBook);
  }

  next.buildings[buildingId].equippedBooks = equipped.slice(0, MAX_EQUIPPED_BOOKS_PER_BUILDING);
  return next;
};

export const upgradeBook = (state: GameState, bookId: BookId, rarity: BookRarity): GameState => {
  if (!canUpgradeBook(state, bookId, rarity)) {
    return state;
  }

  const nextRarity = getNextRarity(rarity);
  const ownedCount = getOwnedBookCount(state, bookId, rarity);
  const upgradedRarity = nextRarity!;

  const next = cloneGameState(state);
  next.books.owned[makeBookKey(bookId, rarity)] = ownedCount - BOOK_UPGRADE_COPY_COST;
  next.books.owned[makeBookKey(bookId, upgradedRarity)] =
    (next.books.owned[makeBookKey(bookId, upgradedRarity)] ?? 0) + 1;

  return next;
};

export const canUpgradeBook = (state: GameState, bookId: BookId, rarity: BookRarity) => {
  const nextRarity = getNextRarity(rarity);
  const ownedCount = getOwnedBookCount(state, bookId, rarity);
  const equippedCount = countEquippedBook(state, bookId, rarity);

  return Boolean(
    nextRarity &&
      ownedCount >= BOOK_UPGRADE_COPY_COST &&
      ownedCount - BOOK_UPGRADE_COPY_COST >= equippedCount,
  );
};

export const getBuildingBookEffects = (state: GameState, buildingId: BuildingId): BuildingBookEffects => {
  const totals: BuildingBookEffects = {
    outputMultiplierBonus: {},
    inputMultiplierBonus: {},
    efficiencyExponentBonus: 0,
  };

  for (const equippedBook of state.buildings[buildingId].equippedBooks) {
    if (getOwnedBookCount(state, equippedBook.bookId, equippedBook.rarity) <= 0) {
      continue;
    }

    const definition = bookById[equippedBook.bookId];
    if (!definition || definition.buildingId !== buildingId) {
      continue;
    }

    const power = rarityStrength[equippedBook.rarity];
    const effect = definition.effect;

    if (effect.type === 'outputMultiplier') {
      totals.outputMultiplierBonus[effect.resourceId] =
        (totals.outputMultiplierBonus[effect.resourceId] ?? 0) + effect.value * power;
    }

    if (effect.type === 'inputMultiplier') {
      totals.inputMultiplierBonus[effect.resourceId] =
        (totals.inputMultiplierBonus[effect.resourceId] ?? 0) + effect.value * power;
    }

    if (effect.type === 'efficiencyExponent') {
      totals.efficiencyExponentBonus += effect.value * power;
    }
  }

  return totals;
};

export const getFoodConsumptionMultiplier = (state: GameState) => {
  let multiplierBonus = 0;

  for (const buildingId of buildingIds) {
    for (const equippedBook of state.buildings[buildingId].equippedBooks) {
      if (getOwnedBookCount(state, equippedBook.bookId, equippedBook.rarity) <= 0) {
        continue;
      }

      const definition = bookById[equippedBook.bookId];
      if (definition?.effect.type === 'foodConsumptionMultiplier') {
        multiplierBonus += definition.effect.value * rarityStrength[equippedBook.rarity];
      }
    }
  }

  return clamp(1 + multiplierBonus, 0.5, 1.5);
};

export const getMarketSellImpactMultiplier = (state: GameState, resourceId: ResourceId) => {
  let multiplierBonus = 0;

  for (const buildingId of buildingIds) {
    for (const equippedBook of state.buildings[buildingId].equippedBooks) {
      if (getOwnedBookCount(state, equippedBook.bookId, equippedBook.rarity) <= 0) {
        continue;
      }

      const definition = bookById[equippedBook.bookId];
      if (definition?.effect.type === 'marketImpactMultiplier') {
        if (definition.effect.resourceId === resourceId) {
          multiplierBonus += definition.effect.value * rarityStrength[equippedBook.rarity];
        }

        if (definition.id === 'weapon_contracts' && resourceId === 'bows') {
          multiplierBonus += definition.effect.value * rarityStrength[equippedBook.rarity];
        }
      }
    }
  }

  return clamp(1 + multiplierBonus, 0.35, 1);
};

export const describeBookEffect = (bookId: BookId, rarity: BookRarity) => {
  const definition = bookById[bookId];
  const power = rarityStrength[rarity];
  const effect = definition.effect;

  if (effect.type === 'outputMultiplier') {
    return `+${Math.round(effect.value * power * 100)}% ${effect.resourceId.replace('_', ' ')} output`;
  }

  if (effect.type === 'inputMultiplier') {
    return `${Math.round(effect.value * power * 100)}% ${effect.resourceId.replace('_', ' ')} input`;
  }

  if (effect.type === 'efficiencyExponent') {
    return `+${(effect.value * power).toFixed(2)} worker efficiency`;
  }

  if (effect.type === 'foodConsumptionMultiplier') {
    return `${Math.round(effect.value * power * 100)}% food consumption`;
  }

  return `${Math.round(effect.value * power * 100)}% market impact`;
};

export const ownedBookEntries = (state: GameState) =>
  Object.entries(state.books.owned)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([bookKey, count]) => ({
      ...parseBookKey(bookKey as BookKey),
      count: count ?? 0,
    }))
    .sort((left, right) => {
      const leftDefinition = bookById[left.bookId];
      const rightDefinition = bookById[right.bookId];
      return (
        leftDefinition.buildingId.localeCompare(rightDefinition.buildingId) ||
        leftDefinition.label.localeCompare(rightDefinition.label) ||
        rarityIndex[left.rarity] - rarityIndex[right.rarity]
      );
    });

export const resourceIdsWithBookEffects = resourceIds;
