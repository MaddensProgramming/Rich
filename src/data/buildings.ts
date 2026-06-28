import type {
  BuildingDefinition,
  BuildingId,
  RecipeDefinition,
  RecipeId,
} from '../simulation/types';

export const recipes: RecipeDefinition[] = [
  {
    id: 'mine_coal_focus',
    buildingId: 'mine',
    label: 'Coal Focus',
    inputs: {},
    outputs: { coal: 0.9, stone: 0.16 },
  },
  {
    id: 'mine_iron_focus',
    buildingId: 'mine',
    label: 'Iron Focus',
    inputs: {},
    outputs: { iron_ore: 0.84, stone: 0.15 },
  },
  {
    id: 'mine_stone_focus',
    buildingId: 'mine',
    label: 'Stone Focus',
    inputs: {},
    outputs: { stone: 1 },
  },
  {
    id: 'mine_balanced',
    buildingId: 'mine',
    label: 'Balanced Mining',
    inputs: {},
    outputs: { coal: 0.36, iron_ore: 0.31, stone: 0.39 },
  },
  {
    id: 'lumberjack_wood',
    buildingId: 'lumberjack',
    label: 'Gather Wood',
    inputs: {},
    outputs: { wood: 0.95 },
  },
  {
    id: 'farm_vegetables',
    buildingId: 'farm',
    label: 'Grow Vegetables',
    inputs: {},
    outputs: { vegetables: 1.08 },
  },
  {
    id: 'food_maker_basic_food',
    buildingId: 'food_maker',
    label: 'Basic Meals',
    inputs: { vegetables: 2.1 },
    outputs: { food: 0.9 },
  },
  {
    id: 'smelter_iron_bars',
    buildingId: 'smelter',
    label: 'Smelt Iron Bars',
    inputs: { iron_ore: 2, coal: 1 },
    outputs: { iron_bars: 0.9 },
  },
  {
    id: 'blacksmith_swords',
    buildingId: 'blacksmith',
    label: 'Forge Swords',
    inputs: { iron_bars: 2 },
    outputs: { swords: 0.9 },
  },
  {
    id: 'blacksmith_bows',
    buildingId: 'blacksmith',
    label: 'Craft Bows',
    inputs: { wood: 3 },
    outputs: { bows: 0.9 },
  },
];

export const recipeById = Object.fromEntries(
  recipes.map((recipe) => [recipe.id, recipe]),
) as Record<RecipeId, RecipeDefinition>;

export const buildings: BuildingDefinition[] = [
  {
    id: 'mine',
    label: 'Mine',
    description: 'Extracts coal, iron ore, and stone from the mountain.',
    recipes: ['mine_coal_focus', 'mine_iron_focus', 'mine_stone_focus', 'mine_balanced'],
    baseProductionMultiplier: 0.66,
    upgradeCosts: {
      2: { wood: 18, stone: 16 },
      3: { wood: 34, stone: 28, iron_bars: 4 },
      4: { stone: 60, coal: 35, iron_bars: 12 },
      5: { stone: 110, coal: 75, iron_bars: 30, swords: 3 },
    },
  },
  {
    id: 'lumberjack',
    label: 'Lumberjack',
    description: 'Cuts timber for buildings, tools, and bows.',
    recipes: ['lumberjack_wood'],
    baseProductionMultiplier: 0.66,
    upgradeCosts: {
      2: { wood: 14, stone: 8 },
      3: { wood: 32, iron_bars: 3 },
      4: { wood: 72, stone: 30, iron_bars: 9 },
      5: { wood: 140, iron_bars: 22, bows: 5 },
    },
  },
  {
    id: 'farm',
    label: 'Farm',
    description: 'Grows vegetables that can be cooked into food.',
    recipes: ['farm_vegetables'],
    baseProductionMultiplier: 0.66,
    upgradeCosts: {
      2: { wood: 12, stone: 10 },
      3: { wood: 28, stone: 22 },
      4: { wood: 60, stone: 42, iron_bars: 6 },
      5: { wood: 120, stone: 85, iron_bars: 18 },
    },
  },
  {
    id: 'food_maker',
    label: 'Food Maker',
    description: 'Turns vegetables into preserved meals for workers.',
    recipes: ['food_maker_basic_food'],
    baseProductionMultiplier: 0.56,
    upgradeCosts: {
      2: { wood: 16, stone: 10, vegetables: 20 },
      3: { wood: 36, stone: 24, iron_bars: 4 },
      4: { stone: 52, coal: 22, iron_bars: 10 },
      5: { stone: 95, coal: 50, iron_bars: 25 },
    },
  },
  {
    id: 'smelter',
    label: 'Smelter',
    description: 'Consumes coal and iron ore to produce iron bars.',
    recipes: ['smelter_iron_bars'],
    baseProductionMultiplier: 0.46,
    upgradeCosts: {
      2: { stone: 22, coal: 12 },
      3: { stone: 45, coal: 26, iron_bars: 5 },
      4: { stone: 90, coal: 55, iron_bars: 15 },
      5: { stone: 150, coal: 120, iron_bars: 38, swords: 4 },
    },
  },
  {
    id: 'blacksmith',
    label: 'Blacksmith',
    description: 'Makes swords from iron bars or bows from wood.',
    recipes: ['blacksmith_swords', 'blacksmith_bows'],
    baseProductionMultiplier: 0.36,
    upgradeCosts: {
      2: { wood: 20, stone: 16, iron_bars: 3 },
      3: { wood: 44, coal: 22, iron_bars: 9 },
      4: { stone: 70, coal: 45, iron_bars: 20 },
      5: { coal: 95, iron_bars: 45, swords: 8, bows: 12 },
    },
  },
];

export const buildingIds = buildings.map((building) => building.id) as BuildingId[];

export const buildingById = Object.fromEntries(
  buildings.map((building) => [building.id, building]),
) as Record<BuildingId, BuildingDefinition>;
