import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { TownScene, type TownSnapshot } from '../game/scenes/TownScene';
import {
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
}

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
      return `${resource.icon}${Math.ceil(amount ?? 0)}`;
    })
    .join(' ');
};

const toSnapshot = (game: GameStore, selectedHotspotId: string | null, inputLocked: boolean): TownSnapshot => ({
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
                : placement.kind === 'contracts'
                  ? 'Town requests'
                  : 'Manual gathering',
      blocked: false,
      selected: selectedHotspotId === placement.id,
    };
  }),
});

export function TownView({ game, selectedHotspotId, inputLocked, onSelectHotspot }: TownViewProps) {
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

    return () => {
      phaserGame.events.off('town:hotspot-select', onSelectHotspot);
    };
  }, [onSelectHotspot]);

  return <div className="town-canvas" ref={hostRef} aria-label="St. Moritz town view" />;
}
