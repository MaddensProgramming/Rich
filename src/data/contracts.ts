import type { ContractDefinition } from '../simulation/types';

export const contracts: ContractDefinition[] = [
  {
    id: 'mountain_road',
    label: 'Mountain Road Crew',
    description: 'Trade caravans need timber and stone to widen the pass.',
    minChapterId: 'village',
    requiredResources: { wood: 120, stone: 90 },
    rewardMoney: 420,
  },
  {
    id: 'garrison_order',
    label: 'Garrison Weapon Order',
    description: 'The valley garrison wants a batch of finished weapons.',
    minChapterId: 'village',
    requiredResources: { swords: 12, bows: 16 },
    rewardMoney: 760,
    rewardBooks: [{ bookId: 'weapon_contracts', rarity: 'uncommon', count: 1 }],
  },
  {
    id: 'winter_stores',
    label: 'Winter Stores',
    description: 'Stock the cellars with food and iron before the snows.',
    minChapterId: 'mountain_town',
    requiredResources: { food: 200, iron_bars: 30 },
    rewardMoney: 1100,
    rewardBooks: [{ bookId: 'hearty_recipes', rarity: 'rare', count: 1 }],
  },
];

export const contractById = Object.fromEntries(
  contracts.map((contract) => [contract.id, contract]),
) as Record<string, ContractDefinition>;
