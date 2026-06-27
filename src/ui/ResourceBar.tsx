import type { GameStore } from '../store/gameStore';
import { formatNumber, formatSignedRate } from './format';

interface ResourceBarProps {
  game: GameStore;
}

export function ResourceBar({ game }: ResourceBarProps) {
  return (
    <section className="resource-strip" aria-label="Resources">
      {game.definitions.resources.map((resource) => {
        const net = game.stats.netPerSecond[resource.id] ?? 0;
        return (
          <div className="resource-pill" key={resource.id}>
            <span className="resource-name">{resource.label}</span>
            <strong>{formatNumber(game.resources[resource.id])}</strong>
            <span className={net >= 0 ? 'rate-positive' : 'rate-negative'}>
              {formatSignedRate(net)}
            </span>
          </div>
        );
      })}
    </section>
  );
}
