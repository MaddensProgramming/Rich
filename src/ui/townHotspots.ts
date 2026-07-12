import type { BuildingId, ChapterId } from '../simulation';

export type TownHotspotKind = 'building' | 'market' | 'library' | 'town' | 'project' | 'contracts';

export type TownHotspotId = BuildingId | 'market' | 'library' | 'town' | 'project' | 'contracts';

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
  canAddWorker?: boolean;
  canRemoveWorker?: boolean;
  workers?: number;
}

export interface TownHotspotSelection {
  id: TownHotspotId;
  kind: TownHotspotKind;
  label: string;
  buildingId?: BuildingId;
}

const hamletHotspotPlacements: TownHotspotPlacement[] = [
  { id: 'mine', kind: 'building', label: 'Mine', x: 0.18, y: 0.29, width: 0.14, height: 0.08 },
  { id: 'lumberjack', kind: 'building', label: 'Lumberjack', x: 0.47, y: 0.33, width: 0.17, height: 0.08 },
  { id: 'farm', kind: 'building', label: 'Farm', x: 0.57, y: 0.51, width: 0.13, height: 0.08 },
  { id: 'food_maker', kind: 'building', label: 'Food Maker', x: 0.8, y: 0.35, width: 0.17, height: 0.08 },
  { id: 'smelter', kind: 'building', label: 'Smelter', x: 0.29, y: 0.74, width: 0.15, height: 0.08 },
  { id: 'blacksmith', kind: 'building', label: 'Blacksmith', x: 0.69, y: 0.78, width: 0.16, height: 0.08 },
  { id: 'stonemason', kind: 'building', label: 'Stonemason', x: 0.10, y: 0.44, width: 0.15, height: 0.08 },
  { id: 'project', kind: 'project', label: 'Town Project', x: 0.48, y: 0.18, width: 0.17, height: 0.08 },
  { id: 'market', kind: 'market', label: 'Market', x: 0.84, y: 0.58, width: 0.14, height: 0.08 },
  { id: 'library', kind: 'library', label: 'Library', x: 0.85, y: 0.24, width: 0.14, height: 0.08 },
  { id: 'contracts', kind: 'contracts', label: 'Contracts', x: 0.62, y: 0.66, width: 0.14, height: 0.08 },
  { id: 'town', kind: 'town', label: 'Town Hall', x: 0.43, y: 0.87, width: 0.15, height: 0.08 },
];

type HotspotCoordinateOverrides = Partial<Record<TownHotspotId, Pick<TownHotspotPlacement, 'x' | 'y'>>>;

const hotspotCoordinatesByChapter: Record<ChapterId, HotspotCoordinateOverrides> = {
  arrival: {
    mine: { x: 0.18, y: 0.29 },
    lumberjack: { x: 0.47, y: 0.32 },
    town: { x: 0.37, y: 0.82 },
  },
  hamlet: {},
  village: {
    mine: { x: 0.18, y: 0.24 },
    lumberjack: { x: 0.49, y: 0.3 },
    farm: { x: 0.54, y: 0.47 },
    food_maker: { x: 0.75, y: 0.31 },
    smelter: { x: 0.19, y: 0.62 },
    blacksmith: { x: 0.7, y: 0.75 },
    project: { x: 0.37, y: 0.2 },
    market: { x: 0.82, y: 0.52 },
    library: { x: 0.88, y: 0.35 },
    contracts: { x: 0.59, y: 0.62 },
    town: { x: 0.41, y: 0.78 },
  },
  mountain_town: {
    mine: { x: 0.14, y: 0.21 },
    lumberjack: { x: 0.43, y: 0.43 },
    farm: { x: 0.55, y: 0.54 },
    food_maker: { x: 0.72, y: 0.36 },
    smelter: { x: 0.18, y: 0.69 },
    blacksmith: { x: 0.79, y: 0.76 },
    stonemason: { x: 0.2, y: 0.39 },
    project: { x: 0.48, y: 0.18 },
    market: { x: 0.85, y: 0.54 },
    library: { x: 0.82, y: 0.22 },
    contracts: { x: 0.64, y: 0.68 },
    town: { x: 0.41, y: 0.82 },
  },
};

export const getTownHotspotPlacements = (chapterId: ChapterId): TownHotspotPlacement[] => {
  const overrides = hotspotCoordinatesByChapter[chapterId];
  return hamletHotspotPlacements.map((placement) => ({
    ...placement,
    ...overrides[placement.id],
  }));
};
