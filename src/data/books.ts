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
    description: 'Iron ore output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'iron_ore', value: 0.18 },
  },
  {
    id: 'coal_seams',
    label: 'Coal Seams',
    buildingId: 'mine',
    description: 'Coal output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'coal', value: 0.18 },
  },
  {
    id: 'stone_surveying',
    label: 'Stone Surveying',
    buildingId: 'mine',
    description: 'Stone output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'stone', value: 0.18 },
  },
  {
    id: 'mine_cart_rails',
    label: 'Mine Cart Rails',
    buildingId: 'mine',
    description: 'Mine worker crowding is reduced.',
    effect: { type: 'efficiencyExponent', value: 0.035 },
  },
  {
    id: 'sharp_axes',
    label: 'Sharp Axes',
    buildingId: 'lumberjack',
    description: 'Wood output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'wood', value: 0.2 },
  },
  {
    id: 'forest_paths',
    label: 'Forest Paths',
    buildingId: 'lumberjack',
    description: 'Lumberjack worker crowding is reduced.',
    effect: { type: 'efficiencyExponent', value: 0.035 },
  },
  {
    id: 'crop_rotation',
    label: 'Crop Rotation',
    buildingId: 'farm',
    description: 'Vegetable output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'vegetables', value: 0.2 },
  },
  {
    id: 'efficient_harvesting',
    label: 'Efficient Harvesting',
    buildingId: 'farm',
    description: 'Farm worker crowding is reduced.',
    effect: { type: 'efficiencyExponent', value: 0.035 },
  },
  {
    id: 'preservation_methods',
    label: 'Preservation Methods',
    buildingId: 'food_maker',
    description: 'Food output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'food', value: 0.22 },
  },
  {
    id: 'efficient_kitchens',
    label: 'Efficient Kitchens',
    buildingId: 'food_maker',
    description: 'Vegetable input cost is reduced.',
    effect: { type: 'inputMultiplier', resourceId: 'vegetables', value: -0.12 },
  },
  {
    id: 'hearty_recipes',
    label: 'Hearty Recipes',
    buildingId: 'food_maker',
    description: 'Workers consume less food.',
    effect: { type: 'foodConsumptionMultiplier', value: -0.06 },
  },
  {
    id: 'hotter_furnaces',
    label: 'Hotter Furnaces',
    buildingId: 'smelter',
    description: 'Iron bar output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'iron_bars', value: 0.22 },
  },
  {
    id: 'coal_efficiency',
    label: 'Coal Efficiency',
    buildingId: 'smelter',
    description: 'Coal input cost is reduced.',
    effect: { type: 'inputMultiplier', resourceId: 'coal', value: -0.1 },
  },
  {
    id: 'refining_techniques',
    label: 'Refining Techniques',
    buildingId: 'smelter',
    description: 'Iron ore input cost is reduced.',
    effect: { type: 'inputMultiplier', resourceId: 'iron_ore', value: -0.1 },
  },
  {
    id: 'swordsmith_manual',
    label: 'Swordsmith Manual',
    buildingId: 'blacksmith',
    description: 'Sword output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'swords', value: 0.25 },
  },
  {
    id: 'bowyer_techniques',
    label: 'Bowyer Techniques',
    buildingId: 'blacksmith',
    description: 'Bow output is increased.',
    effect: { type: 'outputMultiplier', resourceId: 'bows', value: 0.22 },
  },
  {
    id: 'weapon_contracts',
    label: 'Weapon Contracts',
    buildingId: 'blacksmith',
    description: 'Selling weapons has less market price impact.',
    effect: { type: 'marketImpactMultiplier', resourceId: 'swords', value: -0.22 },
  },
];

export const bookById = Object.fromEntries(books.map((book) => [book.id, book])) as Record<
  BookId,
  BookDefinition
>;
