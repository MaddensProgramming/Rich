import type { BuildingId } from '../simulation';

export type TownHotspotKind = 'building' | 'market' | 'library' | 'town' | 'project' | 'gathering' | 'contracts';

export type TownHotspotId = BuildingId | 'market' | 'library' | 'town' | 'project' | 'gathering' | 'contracts';

export interface TownHotspotPlacement {
  id: TownHotspotId;
  kind: TownHotspotKind;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TownHotspotSnapshot extends TownHotspotPlacement {
  detail: string;
  blocked: boolean;
  selected: boolean;
  buildingId?: BuildingId;
}

export interface TownHotspotSelection {
  id: TownHotspotId;
  kind: TownHotspotKind;
  label: string;
  buildingId?: BuildingId;
}

export const townHotspotPlacements: TownHotspotPlacement[] = [
  { id: 'mine', kind: 'building', label: 'Mine', x: 0.18, y: 0.29, width: 0.14, height: 0.08 },
  { id: 'lumberjack', kind: 'building', label: 'Lumberjack', x: 0.47, y: 0.33, width: 0.17, height: 0.08 },
  { id: 'farm', kind: 'building', label: 'Farm', x: 0.57, y: 0.51, width: 0.13, height: 0.08 },
  { id: 'food_maker', kind: 'building', label: 'Food Maker', x: 0.75, y: 0.37, width: 0.17, height: 0.08 },
  { id: 'smelter', kind: 'building', label: 'Smelter', x: 0.29, y: 0.74, width: 0.15, height: 0.08 },
  { id: 'blacksmith', kind: 'building', label: 'Blacksmith', x: 0.69, y: 0.78, width: 0.16, height: 0.08 },
  { id: 'stonemason', kind: 'building', label: 'Stonemason', x: 0.10, y: 0.44, width: 0.15, height: 0.08 },
  { id: 'gathering', kind: 'gathering', label: 'Gathering', x: 0.12, y: 0.58, width: 0.16, height: 0.08 },
  { id: 'project', kind: 'project', label: 'Town Project', x: 0.48, y: 0.18, width: 0.17, height: 0.08 },
  { id: 'market', kind: 'market', label: 'Market', x: 0.84, y: 0.58, width: 0.14, height: 0.08 },
  { id: 'library', kind: 'library', label: 'Library', x: 0.85, y: 0.24, width: 0.14, height: 0.08 },
  { id: 'contracts', kind: 'contracts', label: 'Contracts', x: 0.62, y: 0.66, width: 0.14, height: 0.08 },
  { id: 'town', kind: 'town', label: 'Town Hall', x: 0.43, y: 0.87, width: 0.15, height: 0.08 },
];
