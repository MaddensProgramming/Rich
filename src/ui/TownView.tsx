import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { TownScene, type TownGatherableSnapshot, type TownSnapshot } from '../game/scenes/TownScene';
import {
  INITIAL_CLEARING_STONE,
  INITIAL_CLEARING_VEGETABLES,
  INITIAL_CLEARING_WOOD,
  canConstructBuilding,
  getBuildingConstructionCost,
  getCampaignChapter,
  isBuildingConstructed,
} from '../simulation';
import type { BuildingId, ResourceMap } from '../simulation';
import type { GameStore } from '../store/gameStore';
import { townHotspotPlacements, type TownHotspotSelection } from './townHotspots';

interface TownViewProps {
  game: GameStore;
  selectedHotspotId: string | null;
  inputLocked: boolean;
  onSelectHotspot: (selection: TownHotspotSelection) => void;
  onGatherResource: (resourceId: TownGatherableSnapshot['resourceId']) => void;
}

const GATHERING_CACHE_SIZE = 10;

const gatheringPlacements: Record<
  TownGatherableSnapshot['resourceId'],
  Array<Pick<TownGatherableSnapshot, 'x' | 'y' | 'width' | 'height'>>
> = {
  wood: [
    { x: 0.22, y: 0.64, width: 0.12, height: 0.12 },
    { x: 0.34, y: 0.55, width: 0.11, height: 0.11 },
    { x: 0.16, y: 0.77, width: 0.12, height: 0.12 },
    { x: 0.43, y: 0.68, width: 0.11, height: 0.11 },
    { x: 0.28, y: 0.84, width: 0.12, height: 0.12 },
    { x: 0.53, y: 0.58, width: 0.1, height: 0.1 },
  ],
  stone: [
    { x: 0.16, y: 0.42, width: 0.11, height: 0.1 },
    { x: 0.28, y: 0.34, width: 0.1, height: 0.1 },
    { x: 0.23, y: 0.72, width: 0.1, height: 0.1 },
    { x: 0.38, y: 0.44, width: 0.1, height: 0.1 },
    { x: 0.11, y: 0.62, width: 0.1, height: 0.1 },
  ],
  vegetables: [
    { x: 0.63, y: 0.58, width: 0.12, height: 0.13 },
    { x: 0.72, y: 0.49, width: 0.11, height: 0.12 },
    { x: 0.55, y: 0.72, width: 0.12, height: 0.13 },
    { x: 0.79, y: 0.68, width: 0.11, height: 0.12 },
  ],
};

const createGatherableSnapshot = (
  resourceId: TownGatherableSnapshot['resourceId'],
  label: string,
  poolRemaining: number,
  initialPool: number,
): TownGatherableSnapshot[] => {
  const pool = Math.max(0, Math.trunc(poolRemaining));
  if (pool <= 0) {
    return [];
  }

  const spent = Math.max(0, initialPool - pool);
  const cacheIndex = Math.floor(spent / GATHERING_CACHE_SIZE);
  const clicksUsedInCache = spent % GATHERING_CACHE_SIZE;
  const clicksRemaining = Math.min(GATHERING_CACHE_SIZE - clicksUsedInCache, pool);
  const placementOptions = gatheringPlacements[resourceId];
  const placement = placementOptions[cacheIndex % placementOptions.length];

  return [
    {
      ...placement,
      id: `${resourceId}-${cacheIndex}`,
      resourceId,
      label,
      clicksRemaining,
      poolRemaining: pool,
    },
  ];
};

const getStageBuildingLabel = (game: GameStore, buildingId: BuildingId) => {
  if (game.campaign.chapterId === 'arrival') {
    if (buildingId === 'mine') {
      return 'Mine Entrance';
    }

    if (buildingId === 'lumberjack') {
      return 'Logging Camp';
    }
  }

  return game.definitions.buildingById[buildingId].label;
};

const formatCostSummary = (cost: ResourceMap, game: GameStore) => {
  const entries = Object.entries(cost).filter(([, amount]) => (amount ?? 0) > 0);
  if (entries.length === 0) {
    return 'No cost';
  }

  return entries
    .map(([resourceId, amount]) => {
      const resource = game.definitions.resourceById[resourceId as keyof typeof game.resources];
      return `${resource.label} ${Math.ceil(amount ?? 0)}`;
    })
    .join(' ');
};

const toSnapshot = (game: GameStore, selectedHotspotId: string | null, inputLocked: boolean): TownSnapshot => {
  const gatherables = game.campaign.unlockedSystems.manualGather
    ? [
        ...createGatherableSnapshot('wood', 'Wood', game.campaign.clearingWood, INITIAL_CLEARING_WOOD),
        ...createGatherableSnapshot('stone', 'Stone', game.campaign.clearingStone, INITIAL_CLEARING_STONE),
        ...createGatherableSnapshot('vegetables', 'Berries', game.campaign.clearingVegetables, INITIAL_CLEARING_VEGETABLES),
      ]
    : [];

  return {
    townBackdropKey: getCampaignChapter(game).townBackdropKey,
    inputLocked,
    money: game.money,
    food: game.resources.food,
    globalProductionMultiplier: game.stats.globalProductionMultiplier,
    selectedHotspotId,
    buildings: game.definitions.buildings.map((definition) => ({
      id: definition.id,
      label: getStageBuildingLabel(game, definition.id),
      level: game.buildings[definition.id].level,
      workers: game.buildings[definition.id].workers,
      blocked: Boolean(game.stats.blockedBuildings[definition.id]),
    })),
    gatherables,
    hotspots: townHotspotPlacements.flatMap((placement) => {
    const chapter = getCampaignChapter(game);

    if (placement.kind === 'building') {
      const buildingId = placement.id as BuildingId;
      if (!chapter.availableBuildingIds.includes(buildingId)) {
        return [];
      }

      const building = game.buildings[buildingId];
      const constructed = isBuildingConstructed(game, buildingId);
      const buildable = canConstructBuilding(game, buildingId);
      const blocked = Boolean(game.stats.blockedBuildings[buildingId]) || (!constructed && !buildable);

      return {
        ...placement,
        label: getStageBuildingLabel(game, buildingId),
        detail: constructed
          ? `Lv ${building.level} · ${building.workers} workers`
          : buildable
            ? 'Ready to build'
            : `Needs ${formatCostSummary(getBuildingConstructionCost(buildingId), game)}`,
        blocked,
        selected: selectedHotspotId === buildingId,
        buildingId,
      };
    }

    if (placement.kind === 'market' && !game.campaign.unlockedSystems.market) {
      return [];
    }

    if (placement.kind === 'library' && !game.campaign.unlockedSystems.library) {
      return [];
    }

    if (placement.kind === 'contracts' && !game.campaign.unlockedSystems.contracts) {
      return [];
    }

      return {
        ...placement,
        detail:
          placement.kind === 'market'
            ? 'Trade and price controls'
            : placement.kind === 'library'
              ? 'Books and upgrades'
              : placement.kind === 'town'
                ? 'Housing and save controls'
                : placement.kind === 'project'
                  ? 'Chapter progress'
                  : 'Town requests',
        blocked: false,
        selected: selectedHotspotId === placement.id,
      };
    }),
  };
};

export function TownView({ game, selectedHotspotId, inputLocked, onSelectHotspot, onGatherResource }: TownViewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || phaserGameRef.current) {
      return undefined;
    }

    phaserGameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: '#8fc7c9',
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: hostRef.current.clientWidth,
        height: hostRef.current.clientHeight,
      },
      scene: [TownScene],
    });

    return () => {
      phaserGameRef.current?.destroy(true);
      phaserGameRef.current = null;
    };
  }, []);

  useEffect(() => {
    phaserGameRef.current?.events.emit('town:update', toSnapshot(game, selectedHotspotId, inputLocked));
  }, [game, selectedHotspotId, inputLocked]);

  useEffect(() => {
    const phaserGame = phaserGameRef.current;
    if (!phaserGame) {
      return undefined;
    }

    phaserGame.events.on('town:hotspot-select', onSelectHotspot);
    phaserGame.events.on('town:gather-resource', onGatherResource);

    return () => {
      phaserGame.events.off('town:hotspot-select', onSelectHotspot);
      phaserGame.events.off('town:gather-resource', onGatherResource);
    };
  }, [onGatherResource, onSelectHotspot]);

  return <div className="town-canvas" ref={hostRef} aria-label="St. Moritz town view" />;
}
