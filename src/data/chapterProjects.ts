import type {
  ChapterDefinition,
  ChapterId,
  ChapterUpgradeProjectDefinition,
} from '../simulation/types';

export const chapterUpgradeProjects: ChapterUpgradeProjectDefinition[] = [
  {
    id: 'arrival_upgrade_to_hamlet',
    label: 'Upgrade to Hamlet',
    description: 'Deliver the exact wood and stone needed for the first proper settlement milestone.',
    requirements: {
      wood: 40,
      stone: 35,
    },
    completionStoryText: 'The clearing has enough work and shelter to become a hamlet.',
    nextChapterId: 'hamlet',
  },
  {
    id: 'hamlet_upgrade_to_village',
    label: 'Upgrade to Village',
    description: 'Deliver food, fuel, and building materials so the hamlet can become a true village.',
    requirements: {
      wood: 160,
      stone: 160,
      food: 53,
      coal: 80,
    },
    completionStoryText: 'The hamlet has grown into a village.',
    nextChapterId: 'village',
  },
  {
    id: 'village_upgrade_to_mountain_town',
    label: 'Upgrade to Mountain Town',
    description: 'Deliver metalwork, weapons, food stores, and trade wealth for one town-scale push.',
    requirements: {
      stone: 180,
      food: 60,
      iron_bars: 80,
      bows: 30,
      swords: 20,
    },
    moneyRequirement: 1500,
    completionStoryText: 'The village has become a working mountain town.',
    nextChapterId: 'mountain_town',
  },
  {
    id: 'great_hall',
    label: 'Complete the Great Hall',
    description: 'Deliver dressed stone, tools, planks, and provisions to prove the town can endure.',
    requirements: {
      stone_blocks: 60,
      tools: 80,
      planks: 150,
      swords: 50,
      food: 200,
    },
    moneyRequirement: 4000,
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
    unlockedSystemIds: ['construction', 'manualGather', 'market', 'library', 'offlineBoost', 'contracts'],
    upgradeProjectId: 'village_upgrade_to_mountain_town',
    nextChapterId: 'mountain_town',
  },
  {
    id: 'mountain_town',
    label: 'Mountain Town',
    storyText: 'The town is established. Finished goods and masonry feed the final Great Hall project.',
    townBackdropKey: 'mountain_town',
    availableBuildingIds: ['mine', 'lumberjack', 'farm', 'food_maker', 'smelter', 'blacksmith', 'stonemason'],
    availableRecipeIds: [
      'mine_coal_focus',
      'mine_iron_focus',
      'mine_stone_focus',
      'mine_balanced',
      'lumberjack_wood',
      'lumberjack_planks',
      'farm_vegetables',
      'food_maker_basic_food',
      'smelter_iron_bars',
      'blacksmith_swords',
      'blacksmith_bows',
      'blacksmith_tools',
      'stonemason_blocks',
    ],
    unlockedSystemIds: ['construction', 'manualGather', 'market', 'library', 'offlineBoost', 'contracts'],
    upgradeProjectId: 'great_hall',
  },
];

export const chapterById = Object.fromEntries(
  chapters.map((chapter) => [chapter.id, chapter]),
) as Record<ChapterId, ChapterDefinition>;

export const chapterIds = chapters.map((chapter) => chapter.id) as ChapterId[];
