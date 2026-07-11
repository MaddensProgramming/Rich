export type ResourceId =
  | 'coal'
  | 'iron_ore'
  | 'stone'
  | 'wood'
  | 'vegetables'
  | 'food'
  | 'iron_bars'
  | 'swords'
  | 'bows'
  | 'planks'
  | 'tools'
  | 'stone_blocks';

export type ResourceMap = Partial<Record<ResourceId, number>>;

export type ChapterId = 'arrival' | 'hamlet' | 'village' | 'mountain_town';

export type SystemId = 'construction' | 'manualGather' | 'market' | 'library' | 'offlineBoost' | 'contracts';

export type BuildingId =
  | 'mine'
  | 'lumberjack'
  | 'farm'
  | 'food_maker'
  | 'smelter'
  | 'blacksmith'
  | 'stonemason';

export type RecipeId =
  | 'mine_coal_focus'
  | 'mine_iron_focus'
  | 'mine_stone_focus'
  | 'mine_balanced'
  | 'lumberjack_wood'
  | 'lumberjack_planks'
  | 'farm_vegetables'
  | 'food_maker_basic_food'
  | 'smelter_iron_bars'
  | 'blacksmith_swords'
  | 'blacksmith_bows'
  | 'blacksmith_tools'
  | 'stonemason_blocks';

export type BookRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type BookId =
  | 'deep_veins'
  | 'mine_cart_rails'
  | 'sharp_axes'
  | 'forest_paths'
  | 'crop_rotation'
  | 'efficient_harvesting'
  | 'preservation_methods'
  | 'hearty_recipes'
  | 'hotter_furnaces'
  | 'coal_efficiency'
  | 'bowyer_techniques'
  | 'weapon_contracts'
  | 'mason_squares'
  | 'hoist_rigging';

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
  secondaryRecipeId: RecipeId | null;
  workerShare: number;
  equippedBooks: EquippedBook[];
}

export interface ChapterUpgradeProjectDefinition {
  id: string;
  label: string;
  description: string;
  requirements: Partial<Record<ResourceId, number>>;
  moneyRequirement?: number;
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

export interface ContractRewardBook {
  bookId: BookId;
  rarity: BookRarity;
  count: number;
}

export interface ContractDefinition {
  id: string;
  label: string;
  description: string;
  minChapterId: ChapterId;
  requiredResources: Partial<Record<ResourceId, number>>;
  rewardMoney: number;
  rewardBooks?: ContractRewardBook[];
}

export interface CampaignState {
  chapterId: ChapterId;
  completedUpgradeProjectIds: string[];
  upgradeProjectDeliveries: Partial<Record<string, Partial<Record<ResourceId, number>>>>;
  upgradeProjectMoneyDelivered: Partial<Record<string, number>>;
  constructedBuildings: Partial<Record<BuildingId, boolean>>;
  unlockedSystems: Partial<Record<SystemId, boolean>>;
  clearingWood: number;
  clearingStone: number;
  clearingVegetables: number;
  campaignComplete: boolean;
  seenStoryChapters: ChapterId[];
  seenVictory: boolean;
  activeContractIds: string[];
  completedContractIds: string[];
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

export type TroopId = 'militia' | 'archer' | 'guard';

export type ExperiencePerkId =
  | 'pioneering_spirit'
  | 'prepared_stores'
  | 'merchant_contacts'
  | 'battle_wisdom';

export type ExpeditionPhase = 'exploring' | 'invasion' | 'defeated' | 'victorious';

export interface BattleReport {
  nodeId: string;
  victory: boolean;
  armyPower: number;
  enemyPower: number;
  casualties: Record<TroopId, number>;
}

export interface ExpeditionState {
  phase: ExpeditionPhase;
  barracksConstructed: boolean;
  troops: Record<TroopId, number>;
  defeatedNodeIds: string[];
  invasionSecondsRemaining: number;
  evacuationPrepared: boolean;
  relicSecured: boolean;
  experienceEarnedThisRun: number;
  lastBattle: BattleReport | null;
}

export interface LegacyState {
  runNumber: number;
  experiencePoints: number;
  totalExperienceEarned: number;
  perks: Record<ExperiencePerkId, number>;
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
  expedition: ExpeditionState;
  legacy: LegacyState;
  offline: OfflineState;
  stats: SimulationStats;
  recentBookPack: EquippedBook[];
}

export interface MarketPrice {
  sell: number;
  buy: number;
}
