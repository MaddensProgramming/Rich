import type {
  ChapterDefinition,
  ChapterId,
  ChapterUpgradeProjectDefinition,
} from '../simulation/types';

export const chapterUpgradeProjects: ChapterUpgradeProjectDefinition[] = [
  {
    id: 'arrival_upgrade_to_hamlet',
    label: 'Upgrade to Hamlet',
    description: 'Pool wood and stone into the first proper settlement milestone.',
    targetProgress: 75,
    resourceContributions: {
      wood: 1,
      stone: 1,
    },
    completionStoryText: 'The clearing has enough work and shelter to become a hamlet.',
    nextChapterId: 'hamlet',
  },
  {
    id: 'hamlet_upgrade_to_village',
    label: 'Upgrade to Village',
    description: 'Stockpile food, fuel, and ore so the hamlet can become a true village.',
    targetProgress: 450,
    resourceContributions: {
      wood: 1,
      stone: 1,
      food: 1,
      coal: 1,
      iron_ore: 1,
    },
    completionStoryText: 'The hamlet has grown into a village.',
    nextChapterId: 'village',
  },
  {
    id: 'village_upgrade_to_mountain_town',
    label: 'Upgrade to Mountain Town',
    description: 'Bring metalwork, food stores, weapons, and trade wealth into one town-scale push.',
    targetProgress: 1200,
    resourceContributions: {
      wood: 1,
      stone: 1,
      food: 1.5,
      iron_bars: 6,
      bows: 9,
      swords: 14,
    },
    moneyContributionRate: 0.2,
    completionStoryText: 'The village has become a working mountain town.',
    nextChapterId: 'mountain_town',
  },
  {
    id: 'great_hall',
    label: 'Complete the Great Hall',
    description: 'Commit the whole production chain to a civic hall that proves the town can endure.',
    targetProgress: 3000,
    resourceContributions: {
      wood: 1,
      stone: 1,
      food: 1.5,
      iron_bars: 7,
      bows: 10,
      swords: 16,
    },
    moneyContributionRate: 0.25,
    completionStoryText: 'The Great Hall is complete. St. Moritz can continue growing from a stable town.',
  },
];

export const chapterUpgradeProjectById = Object.fromEntries(
  chapterUpgradeProjects.map((project) => [project.id, project]),
) as Record<string, ChapterUpgradeProjectDefinition>;

export const chapters: ChapterDefinition[] = [
  {
    id: 'arrival',
    label: 'Arrival',
    storyText: 'You arrive at an empty mountain clearing and start from hand work alone.',
    townBackdropKey: 'arrival',
    availableBuildingIds: ['mine', 'lumberjack'],
    availableRecipeIds: ['mine_stone_focus', 'lumberjack_wood'],
    unlockedSystemIds: ['construction', 'manualGather'],
    upgradeProjectId: 'arrival_upgrade_to_hamlet',
    nextChapterId: 'hamlet',
  },
  {
    id: 'hamlet',
    label: 'Hamlet',
    storyText: 'The clearing has become a small settlement with basic industry online.',
    townBackdropKey: 'hamlet',
    availableBuildingIds: ['mine', 'lumberjack', 'farm', 'food_maker'],
    availableRecipeIds: [
      'mine_coal_focus',
      'mine_iron_focus',
      'mine_stone_focus',
      'mine_balanced',
      'lumberjack_wood',
      'farm_vegetables',
      'food_maker_basic_food',
    ],
    unlockedSystemIds: ['construction', 'manualGather', 'market', 'offlineBoost'],
    upgradeProjectId: 'hamlet_upgrade_to_village',
    nextChapterId: 'village',
  },
  {
    id: 'village',
    label: 'Village',
    storyText: 'Trade, books, and metalworking turn the settlement into a specialized village.',
    townBackdropKey: 'village',
    availableBuildingIds: ['mine', 'lumberjack', 'farm', 'food_maker', 'smelter', 'blacksmith'],
    availableRecipeIds: [
      'mine_coal_focus',
      'mine_iron_focus',
      'mine_stone_focus',
      'mine_balanced',
      'lumberjack_wood',
      'farm_vegetables',
      'food_maker_basic_food',
      'smelter_iron_bars',
      'blacksmith_swords',
      'blacksmith_bows',
    ],
    unlockedSystemIds: ['construction', 'manualGather', 'market', 'library', 'offlineBoost'],
    upgradeProjectId: 'village_upgrade_to_mountain_town',
    nextChapterId: 'mountain_town',
  },
  {
    id: 'mountain_town',
    label: 'Mountain Town',
    storyText: 'The town is established. The Great Hall is the final campaign project.',
    townBackdropKey: 'mountain_town',
    availableBuildingIds: ['mine', 'lumberjack', 'farm', 'food_maker', 'smelter', 'blacksmith'],
    availableRecipeIds: [
      'mine_coal_focus',
      'mine_iron_focus',
      'mine_stone_focus',
      'mine_balanced',
      'lumberjack_wood',
      'farm_vegetables',
      'food_maker_basic_food',
      'smelter_iron_bars',
      'blacksmith_swords',
      'blacksmith_bows',
    ],
    unlockedSystemIds: ['construction', 'manualGather', 'market', 'library', 'offlineBoost'],
    upgradeProjectId: 'great_hall',
  },
];

export const chapterById = Object.fromEntries(
  chapters.map((chapter) => [chapter.id, chapter]),
) as Record<ChapterId, ChapterDefinition>;

export const chapterIds = chapters.map((chapter) => chapter.id) as ChapterId[];
