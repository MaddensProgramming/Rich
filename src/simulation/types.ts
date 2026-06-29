export type ResourceId =
  | 'coal'
  | 'iron_ore'
  | 'stone'
  | 'wood'
  | 'vegetables'
  | 'food'
  | 'iron_bars'
  | 'swords'
  | 'bows';

export type ResourceMap = Partial<Record<ResourceId, number>>;

export type ChapterId = 'arrival' | 'hamlet' | 'village' | 'mountain_town';

export type SystemId = 'construction' | 'manualGather' | 'market' | 'library' | 'offlineBoost';

export type BuildingId =
  | 'mine'
  | 'lumberjack'
  | 'farm'
  | 'food_maker'
  | 'smelter'
  | 'blacksmith';

export type RecipeId =
  | 'mine_coal_focus'
  | 'mine_iron_focus'
  | 'mine_stone_focus'
  | 'mine_balanced'
  | 'lumberjack_wood'
  | 'farm_vegetables'
  | 'food_maker_basic_food'
  | 'smelter_iron_bars'
  | 'blacksmith_swords'
  | 'blacksmith_bows';

export type BookRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type BookId =
  | 'deep_veins'
  | 'coal_seams'
  | 'stone_surveying'
  | 'mine_cart_rails'
  | 'sharp_axes'
  | 'forest_paths'
  | 'crop_rotation'
  | 'efficient_harvesting'
  | 'preservation_methods'
  | 'efficient_kitchens'
  | 'hearty_recipes'
  | 'hotter_furnaces'
  | 'coal_efficiency'
  | 'refining_techniques'
  | 'swordsmith_manual'
  | 'bowyer_techniques'
  | 'weapon_contracts';

export type BookKey = `${BookId}:${BookRarity}`;

export interface ResourceDefinition {
  id: ResourceId;
  label: string;
  icon: string;
  basePrice: number;
  marketDepth: number;
  category: 'basic' | 'processed';
}

export interface RecipeDefinition {
  id: RecipeId;
  buildingId: BuildingId;
  label: string;
  inputs: ResourceMap;
  outputs: ResourceMap;
}

export interface BuildingDefinition {
  id: BuildingId;
  label: string;
  description: string;
  recipes: RecipeId[];
  baseProductionMultiplier: number;
  upgradeCosts: Partial<Record<number, ResourceMap>>;
  constructionCost?: ResourceMap;
  availableInChapters?: ChapterId[];
}

export type BookEffect =
  | {
      type: 'outputMultiplier';
      resourceId: ResourceId;
      value: number;
    }
  | {
      type: 'inputMultiplier';
      resourceId: ResourceId;
      value: number;
    }
  | {
      type: 'efficiencyExponent';
      value: number;
    }
  | {
      type: 'foodConsumptionMultiplier';
      value: number;
    }
  | {
      type: 'marketImpactMultiplier';
      resourceId: ResourceId;
      value: number;
    };

export interface BookDefinition {
  id: BookId;
  label: string;
  buildingId: BuildingId;
  description: string;
  effect: BookEffect;
}

export interface EquippedBook {
  bookId: BookId;
  rarity: BookRarity;
}

export interface BuildingState {
  id: BuildingId;
  level: number;
  workers: number;
  recipeId: RecipeId;
  equippedBooks: EquippedBook[];
}

export interface ChapterUpgradeProjectDefinition {
  id: string;
  label: string;
  description: string;
  targetProgress: number;
  resourceContributions: Partial<Record<ResourceId, number>>;
  moneyContributionRate?: number;
  completionStoryText: string;
  nextChapterId?: ChapterId;
}

export interface ChapterDefinition {
  id: ChapterId;
  label: string;
  storyText: string;
  townBackdropKey: string;
  availableBuildingIds: BuildingId[];
  availableRecipeIds: RecipeId[];
  unlockedSystemIds: SystemId[];
  upgradeProjectId: string;
  nextChapterId?: ChapterId;
}

export interface CampaignState {
  chapterId: ChapterId;
  completedUpgradeProjectIds: string[];
  upgradeProjectProgress: Partial<Record<string, number>>;
  constructedBuildings: Partial<Record<BuildingId, boolean>>;
  unlockedSystems: Partial<Record<SystemId, boolean>>;
  clearingWood: number;
  clearingStone: number;
  clearingVegetables: number;
  campaignComplete: boolean;
}

export interface MarketResourceState {
  pressure: number;
}

export interface MarketAutomationRule {
  buyBelow: number | null;
  sellAbove: number | null;
  batchSize: number;
  lastRunAt: number;
}

export interface OfflineState {
  chargeSeconds: number;
  active: boolean;
}

export interface SimulationStats {
  productionPerSecond: ResourceMap;
  consumptionPerSecond: ResourceMap;
  netPerSecond: ResourceMap;
  buildingProductionPerSecond: Record<BuildingId, ResourceMap>;
  buildingConsumptionPerSecond: Record<BuildingId, ResourceMap>;
  effectiveWorkers: Record<BuildingId, number>;
  blockedBuildings: Partial<Record<BuildingId, string>>;
  globalProductionMultiplier: number;
  gameSpeed: number;
}

export interface GameState {
  version: number;
  rngSeed: number;
  createdAt: number;
  lastSavedAt: number;
  totalGameSeconds: number;
  money: number;
  resources: Record<ResourceId, number>;
  workers: {
    total: number;
    housingCapacity: number;
  };
  buildings: Record<BuildingId, BuildingState>;
  market: Record<ResourceId, MarketResourceState>;
  marketAutomation: Record<ResourceId, MarketAutomationRule>;
  books: {
    owned: Partial<Record<BookKey, number>>;
  };
  campaign: CampaignState;
  offline: OfflineState;
  stats: SimulationStats;
  recentBookPack: EquippedBook[];
}

export interface MarketPrice {
  sell: number;
  buy: number;
}
