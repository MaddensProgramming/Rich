import type { ResourceDefinition, ResourceId } from '../simulation/types';

export const resources: ResourceDefinition[] = [
  { id: 'vegetables', label: 'Vegetables', icon: 'V', basePrice: 1, marketDepth: 220, category: 'basic' },
  { id: 'food', label: 'Food', icon: 'F', basePrice: 1.8, marketDepth: 190, category: 'basic' },
  { id: 'wood', label: 'Wood', icon: 'W', basePrice: 3, marketDepth: 160, category: 'basic' },
  { id: 'stone', label: 'Stone', icon: 'S', basePrice: 3.5, marketDepth: 150, category: 'basic' },
  { id: 'coal', label: 'Coal', icon: 'C', basePrice: 4.4, marketDepth: 135, category: 'basic' },
  { id: 'iron_ore', label: 'Iron Ore', icon: 'O', basePrice: 5.7, marketDepth: 125, category: 'basic' },
  { id: 'iron_bars', label: 'Iron Bars', icon: 'I', basePrice: 12.5, marketDepth: 78, category: 'processed' },
  { id: 'bows', label: 'Bows', icon: 'B', basePrice: 18.5, marketDepth: 58, category: 'processed' },
  { id: 'swords', label: 'Swords', icon: 'X', basePrice: 29, marketDepth: 48, category: 'processed' },
];

export const resourceIds = resources.map((resource) => resource.id) as ResourceId[];

export const resourceById = Object.fromEntries(
  resources.map((resource) => [resource.id, resource]),
) as Record<ResourceId, ResourceDefinition>;
