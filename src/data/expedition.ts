import type {
  ExperiencePerkId,
  ResourceMap,
  TroopId,
} from '../simulation/types';

export interface TroopDefinition {
  id: TroopId;
  label: string;
  description: string;
  power: number;
  cost: ResourceMap;
  moneyCost: number;
}

export interface ExpeditionNodeDefinition {
  id: string;
  label: string;
  description: string;
  enemyLabel: string;
  enemyPower: number;
  prerequisiteIds: string[];
  reward: ResourceMap;
  rewardMoney: number;
  x: number;
  y: number;
  isRaidTown?: boolean;
}

export interface ExperiencePerkDefinition {
  id: ExperiencePerkId;
  label: string;
  description: string;
  levelDescription: string;
}

export const BARRACKS_CONSTRUCTION_COST: ResourceMap = {
  wood: 100,
  stone: 80,
  tools: 20,
};

export const EVACUATION_COST: ResourceMap = {
  food: 120,
  wood: 60,
  tools: 20,
};

export const INVASION_DURATION_SECONDS = 240;
export const NORTHERN_HOST_POWER = 2_200;
export const NORTHERN_HOST_REWARD_MONEY = 25_000;
export const NORTHERN_HOST_REWARD_EXPERIENCE = 20;
export const MAX_EXPERIENCE_PERK_LEVEL = 5;

export const troops: TroopDefinition[] = [
  {
    id: 'militia',
    label: 'Militia',
    description: 'Cheap front-line troops who absorb the first casualties.',
    power: 10,
    cost: { food: 20, tools: 2 },
    moneyCost: 20,
  },
  {
    id: 'archer',
    label: 'Archer',
    description: 'Strong ranged troops equipped with bows.',
    power: 14,
    cost: { food: 25, bows: 1 },
    moneyCost: 35,
  },
  {
    id: 'guard',
    label: 'Guard',
    description: 'Powerful professionals protected by forged equipment.',
    power: 19,
    cost: { food: 30, swords: 1, iron_bars: 2 },
    moneyCost: 55,
  },
];

export const troopById = Object.fromEntries(troops.map((troop) => [troop.id, troop])) as Record<
  TroopId,
  TroopDefinition
>;

export const expeditionNodes: ExpeditionNodeDefinition[] = [
  {
    id: 'foothill_road',
    label: 'Foothill Road',
    description: 'A small gang taxes every cart entering the valley.',
    enemyLabel: 'Road Cutthroats',
    enemyPower: 18,
    prerequisiteIds: [],
    reward: { food: 30 },
    rewardMoney: 180,
    x: 10,
    y: 76,
  },
  {
    id: 'pinewood_camp',
    label: 'Pinewood Camp',
    description: 'Bandits hide among the trees with stolen bows and provisions.',
    enemyLabel: 'Pinewood Bandits',
    enemyPower: 30,
    prerequisiteIds: ['foothill_road'],
    reward: { bows: 3, food: 35 },
    rewardMoney: 240,
    x: 25,
    y: 58,
  },
  {
    id: 'old_quarry',
    label: 'Old Quarry',
    description: 'Deserters have fortified the abandoned cutting terraces.',
    enemyLabel: 'Quarry Deserters',
    enemyPower: 38,
    prerequisiteIds: ['foothill_road'],
    reward: { stone: 90, tools: 6 },
    rewardMoney: 220,
    x: 24,
    y: 86,
  },
  {
    id: 'smugglers_track',
    label: "Smugglers' Track",
    description: 'A narrow path controlled by well-equipped contraband runners.',
    enemyLabel: 'Smuggler Company',
    enemyPower: 48,
    prerequisiteIds: ['pinewood_camp'],
    reward: { swords: 3, iron_bars: 10 },
    rewardMoney: 360,
    x: 41,
    y: 47,
  },
  {
    id: 'abandoned_mine',
    label: 'Abandoned Mine',
    description: 'A raider chief uses the deep galleries as an armory.',
    enemyLabel: 'Deep-Gallery Raiders',
    enemyPower: 58,
    prerequisiteIds: ['old_quarry'],
    reward: { coal: 70, iron_ore: 70, iron_bars: 15 },
    rewardMoney: 320,
    x: 42,
    y: 80,
  },
  {
    id: 'ruined_watchtower',
    label: 'Ruined Watchtower',
    description: 'Taking the tower reveals the roads into the high valley.',
    enemyLabel: 'Tower Reavers',
    enemyPower: 68,
    prerequisiteIds: ['smugglers_track', 'abandoned_mine'],
    reward: { bows: 5, tools: 8 },
    rewardMoney: 450,
    x: 56,
    y: 62,
  },
  {
    id: 'frozen_bridge',
    label: 'Frozen Bridge',
    description: 'Shield-bearers hold the only reliable crossing over the gorge.',
    enemyLabel: 'Bridge Wardens',
    enemyPower: 82,
    prerequisiteIds: ['ruined_watchtower'],
    reward: { planks: 45, food: 60 },
    rewardMoney: 520,
    x: 69,
    y: 42,
  },
  {
    id: 'mercenary_stockade',
    label: 'Mercenary Stockade',
    description: 'A professional company guards a rich military storehouse.',
    enemyLabel: 'Red Pike Company',
    enemyPower: 98,
    prerequisiteIds: ['ruined_watchtower'],
    reward: { swords: 7, bows: 7, iron_bars: 25 },
    rewardMoney: 700,
    x: 70,
    y: 76,
  },
  {
    id: 'mountain_monastery',
    label: 'Mountain Monastery',
    description: 'Robbers have occupied the library and demand tribute from pilgrims.',
    enemyLabel: 'False Pilgrims',
    enemyPower: 112,
    prerequisiteIds: ['frozen_bridge'],
    reward: { food: 100, tools: 12 },
    rewardMoney: 900,
    x: 82,
    y: 25,
  },
  {
    id: 'high_pass_fort',
    label: 'High Pass Fort',
    description: 'The fort controls the northern approach to the wealthy valley.',
    enemyLabel: 'Pass Garrison',
    enemyPower: 128,
    prerequisiteIds: ['frozen_bridge', 'mercenary_stockade'],
    reward: { stone_blocks: 35, swords: 8 },
    rewardMoney: 1_100,
    x: 84,
    y: 54,
  },
  {
    id: 'valley_outpost',
    label: 'Valley Outpost',
    description: 'The last patrol station before the walls of Sonnenburg.',
    enemyLabel: 'Valley Lancers',
    enemyPower: 145,
    prerequisiteIds: ['mercenary_stockade'],
    reward: { food: 120, iron_bars: 35 },
    rewardMoney: 1_250,
    x: 84,
    y: 83,
  },
  {
    id: 'sonnenburg',
    label: 'Raid Sonnenburg',
    description:
      'The prosperous town holds the Crown of the Pass and Saint Verena’s war chest. Raiding it will draw the Northern Host to St. Moritz.',
    enemyLabel: 'Sonnenburg Town Guard',
    enemyPower: 170,
    prerequisiteIds: ['mountain_monastery', 'high_pass_fort', 'valley_outpost'],
    reward: { food: 160, iron_bars: 120, swords: 12, bows: 12 },
    rewardMoney: 5_000,
    x: 94,
    y: 46,
    isRaidTown: true,
  },
];

export const expeditionNodeById = Object.fromEntries(
  expeditionNodes.map((node) => [node.id, node]),
) as Record<string, ExpeditionNodeDefinition>;

export const experiencePerks: ExperiencePerkDefinition[] = [
  {
    id: 'pioneering_spirit',
    label: 'Pioneering Spirit',
    description: 'Experienced settlers rally to your next foundation.',
    levelDescription: '+1 starting worker per level',
  },
  {
    id: 'prepared_stores',
    label: 'Prepared Stores',
    description: 'Escape plans place supplies where the next settlement can recover them.',
    levelDescription: '+15 wood, +12 stone, and +20 food per level',
  },
  {
    id: 'merchant_contacts',
    label: 'Merchant Contacts',
    description: 'Surviving traders extend credit to every new St. Moritz.',
    levelDescription: '+$150 starting money per level',
  },
  {
    id: 'battle_wisdom',
    label: 'Battle Wisdom',
    description: 'Each defeat becomes doctrine for the next army.',
    levelDescription: '+15% army power per level',
  },
];

export const experiencePerkById = Object.fromEntries(
  experiencePerks.map((perk) => [perk.id, perk]),
) as Record<ExperiencePerkId, ExperiencePerkDefinition>;
