import type { ResourceDefinition, ResourceId } from '../simulation/types';

export const resources: ResourceDefinition[] = [
  { id: 'vegetables', label: 'Vegetables', icon: 'V', basePrice: 1, marketDepth: 220, category: 'basic' },
  { id: 'food', label: 'Food', icon: 'F', basePrice: 2.8, marketDepth: 190, category: 'basic' },
  { id: 'wood', label: 'Wood', icon: 'W', basePrice: 2.6, marketDepth: 160, category: 'basic' },
  { id: 'stone', label: 'Stone', icon: 'S', basePrice: 2.8, marketDepth: 150, category: 'basic' },
  { id: 'coal', label: 'Coal', icon: 'C', basePrice: 3.6, marketDepth: 135, category: 'basic' },
  { id: 'iron_ore', label: 'Iron Ore', icon: 'O', basePrice: 4.2, marketDepth: 125, category: 'basic' },
  { id: 'iron_bars', label: 'Iron Bars', icon: 'I', basePrice: 17, marketDepth: 78, category: 'processed' },
  { id: 'bows', label: 'Bows', icon: 'B', basePrice: 14, marketDepth: 58, category: 'processed' },
  { id: 'swords', label: 'Swords', icon: 'X', basePrice: 40, marketDepth: 48, category: 'processed' },
  { id: 'planks', label: 'Planks', icon: 'P', basePrice: 10.5, marketDepth: 70, category: 'processed' },
  { id: 'tools', label: 'Tools', icon: 'T', basePrice: 38, marketDepth: 42, category: 'processed' },
  { id: 'stone_blocks', label: 'Stone Blocks', icon: 'K', basePrice: 75, marketDepth: 36, category: 'processed' },
];

export const resourceIds = resources.map((resource) => resource.id) as ResourceId[];

export const resourceById = Object.fromEntries(
  resources.map((resource) => [resource.id, resource]),
) as Record<ResourceId, ResourceDefinition>;
