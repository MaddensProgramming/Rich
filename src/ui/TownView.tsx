import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { TownScene, type TownSnapshot } from '../game/scenes/TownScene';
import type { GameStore } from '../store/gameStore';

interface TownViewProps {
  game: GameStore;
}

const toSnapshot = (game: GameStore): TownSnapshot => ({
  money: game.money,
  food: game.resources.food,
  globalProductionMultiplier: game.stats.globalProductionMultiplier,
  buildings: game.definitions.buildings.map((definition) => ({
    id: definition.id,
    label: definition.label,
    level: game.buildings[definition.id].level,
    workers: game.buildings[definition.id].workers,
    blocked: Boolean(game.stats.blockedBuildings[definition.id]),
  })),
});

export function TownView({ game }: TownViewProps) {
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
    phaserGameRef.current?.events.emit('town:update', toSnapshot(game));
  }, [game]);

  return <div className="town-canvas" ref={hostRef} aria-label="Mountain town view" />;
}
