import type { ResourceDefinition, ResourceId } from '../simulation/types';

export const resources: ResourceDefinition[] = [
  { id: 'vegetables', label: 'Vegetables', basePrice: 1.2, marketDepth: 260, category: 'basic' },
  { id: 'food', label: 'Food', basePrice: 2.2, marketDepth: 220, category: 'basic' },
  { id: 'wood', label: 'Wood', basePrice: 3.5, marketDepth: 190, category: 'basic' },
  { id: 'stone', label: 'Stone', basePrice: 4, marketDepth: 180, category: 'basic' },
  { id: 'coal', label: 'Coal', basePrice: 5, marketDepth: 160, category: 'basic' },
  { id: 'iron_ore', label: 'Iron Ore', basePrice: 6.5, marketDepth: 145, category: 'basic' },
  { id: 'iron_bars', label: 'Iron Bars', basePrice: 15, marketDepth: 90, category: 'processed' },
  { id: 'bows', label: 'Bows', basePrice: 24, marketDepth: 70, category: 'processed' },
  { id: 'swords', label: 'Swords', basePrice: 36, marketDepth: 55, category: 'processed' },
];

export const resourceIds = resources.map((resource) => resource.id) as ResourceId[];

export const resourceById = Object.fromEntries(
  resources.map((resource) => [resource.id, resource]),
) as Record<ResourceId, ResourceDefinition>;
