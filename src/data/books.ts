import type { BookDefinition, BookId, BookRarity } from '../simulation/types';

export const rarities: BookRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const rarityLabels: Record<BookRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const rarityStrength: Record<BookRarity, number> = {
  common: 1,
  uncommon: 1.6,
  rare: 2.4,
  epic: 3.4,
  legendary: 5,
};

export const books: BookDefinition[] = [
  {
    id: 'deep_veins',
    label: 'Deep Veins',
    buildingId: 'mine',
    description: 'Mine output is increased when working rich ore.',
    effect: { type: 'outputMultiplier', resourceId: 'iron_ore', value: 0.18 },
  },
  {
    id: 'mine_cart_rails',
    label: 'Mine Cart Rails',
    buildingId: 'mine',
    description: 'Mine worker crowding is reduced.',
    effect: { type: 'efficiencyExponent', value: 0.05 },
  },
  {
    id: 'sharp_axes',
    label: 'Sharp Axes',
    buildingId: 'lumberjack',
    description: 'Wood output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'wood', value: 0.17 },
  },
  {
    id: 'forest_paths',
    label: 'Forest Paths',
    buildingId: 'lumberjack',
    description: 'Lumberjack worker crowding is reduced.',
    effect: { type: 'efficiencyExponent', value: 0.05 },
  },
  {
    id: 'crop_rotation',
    label: 'Crop Rotation',
    buildingId: 'farm',
    description: 'Vegetable output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'vegetables', value: 0.28 },
  },
  {
    id: 'efficient_harvesting',
    label: 'Efficient Harvesting',
    buildingId: 'farm',
    description: 'Farm worker crowding is reduced.',
    effect: { type: 'efficiencyExponent', value: 0.05 },
  },
  {
    id: 'preservation_methods',
    label: 'Preservation Methods',
    buildingId: 'food_maker',
    description: 'Food output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'food', value: 0.18 },
  },
  {
    id: 'hearty_recipes',
    label: 'Hearty Recipes',
    buildingId: 'food_maker',
    description: 'Workers consume less food.',
    effect: { type: 'foodConsumptionMultiplier', value: -0.2 },
  },
  {
    id: 'hotter_furnaces',
    label: 'Hotter Furnaces',
    buildingId: 'smelter',
    description: 'Iron bar output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'iron_bars', value: 0.06 },
  },
  {
    id: 'coal_efficiency',
    label: 'Coal Efficiency',
    buildingId: 'smelter',
    description: 'Coal input cost is reduced.',
    effect: { type: 'inputMultiplier', resourceId: 'coal', value: -0.15 },
  },
  {
    id: 'bowyer_techniques',
    label: 'Bowyer Techniques',
    buildingId: 'blacksmith',
    description: 'Bow output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'bows', value: 0.07 },
  },
  {
    id: 'weapon_contracts',
    label: 'Weapon Contracts',
    buildingId: 'blacksmith',
    description: 'Selling weapons has less market price impact.',
    effect: { type: 'marketImpactMultiplier', resourceId: 'swords', value: -0.18 },
  },
  {
    id: 'mason_squares',
    label: 'Mason Squares',
    buildingId: 'stonemason',
    description: 'Stone block output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'stone_blocks', value: 0.1 },
  },
  {
    id: 'hoist_rigging',
    label: 'Hoist Rigging',
    buildingId: 'stonemason',
    description: 'Stonemason worker crowding is reduced.',
    effect: { type: 'efficiencyExponent', value: 0.05 },
  },
];

export const bookById = Object.fromEntries(books.map((book) => [book.id, book])) as Record<
  BookId,
  BookDefinition
>;
