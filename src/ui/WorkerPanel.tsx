import {
  MAX_OFFLINE_BOOST_GAME_SECONDS,
  canAffordResources,
  getHousingUpgradeCost,
  getTownFoodConsumptionPerSecond,
  getWorkerHireCost,
} from '../simulation';
import type { GameStore } from '../store/gameStore';
import { formatDuration, formatNumber } from './format';

interface WorkerPanelProps {
  game: GameStore;
}

export function WorkerPanel({ game }: WorkerPanelProps) {
  const assignedWorkers = game.definitions.buildings.reduce(
    (total, building) => total + game.buildings[building.id].workers,
    0,
  );
  const housingCost = getHousingUpgradeCost(game);
  const canUpgradeHousing = canAffordResources(game.resources, housingCost);
  const hireCost = getWorkerHireCost(game);
  const canHire = game.workers.total < game.workers.housingCapacity && game.money >= hireCost;
  const boostFill = Math.min(1, game.offline.chargeSeconds / MAX_OFFLINE_BOOST_GAME_SECONDS);

  return (
    <section className="panel worker-panel" aria-label="Town">
      <div className="panel-heading">
        <div>
          <h2>Town</h2>
          <p>Housing, food pressure, and offline speed boost.</p>
        </div>
      </div>

      <div className="town-metrics">
        <div>
          <span>Workers</span>
          <strong>
            {game.workers.total} / {game.workers.housingCapacity}
          </strong>
        </div>
        <div>
          <span>Assigned</span>
          <strong>{assignedWorkers}</strong>
        </div>
        <div>
          <span>Idle</span>
          <strong>{game.workers.total - assignedWorkers}</strong>
        </div>
        <div>
          <span>Food use</span>
          <strong>{formatNumber(getTownFoodConsumptionPerSecond(game), 2)}/s</strong>
        </div>
      </div>

      <div className="town-actions">
        <button type="button" onClick={game.hireWorker} disabled={!canHire}>
          Hire Worker ${formatNumber(hireCost, 0)}
        </button>
        <button type="button" onClick={game.upgradeHousing} disabled={!canUpgradeHousing}>
          Expand Housing
        </button>
      </div>

      <div className="housing-cost">
        {Object.entries(housingCost).map(([resourceId, amount]) => (
          <span
            className={game.resources[resourceId as keyof typeof game.resources] >= (amount ?? 0) ? '' : 'missing'}
            key={resourceId}
          >
            {game.definitions.resourceById[resourceId as keyof typeof game.resources].label}{' '}
            {formatNumber(amount ?? 0, 0)}
          </span>
        ))}
      </div>

      <div className="boost-panel">
        <div className="boost-topline">
          <span>Offline boost</span>
          <strong>{formatDuration(game.offline.chargeSeconds)}</strong>
        </div>
        <div className="boost-bar" aria-label="Offline boost charge">
          <span style={{ width: `${boostFill * 100}%` }} />
        </div>
        <div className="town-actions">
          <button
            type="button"
            onClick={game.activateOfflineBoost}
            disabled={game.offline.chargeSeconds <= 0 || game.offline.active}
          >
            Start 5x
          </button>
          <button type="button" onClick={game.stopOfflineBoost} disabled={!game.offline.active}>
            Stop
          </button>
        </div>
      </div>

      <div className="save-actions">
        <button type="button" onClick={game.saveNow}>
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Erase this town, every Experience perk, and all legacy progress?')) {
              game.resetGame();
            }
          }}
        >
          Erase all progress
        </button>
      </div>
    </section>
  );
}
