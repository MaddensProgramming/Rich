import { useEffect, useRef } from 'react';
import {
  MAX_BUILDING_LEVEL,
  canAffordResources,
  getBuildingUpgradeCost,
} from '../simulation';
import type { GameStore } from '../store/gameStore';
import type { BuildingId, ResourceMap } from '../simulation';
import { formatNumber, formatSignedRate } from './format';

interface BuildingPanelProps {
  game: GameStore;
  selectedBuildingId: BuildingId | null;
  selectedBuildingVersion: number;
}

const CostList = ({ game, cost }: { game: GameStore; cost: ResourceMap }) => {
  const entries = Object.entries(cost).filter(([, amount]) => (amount ?? 0) > 0);

  if (entries.length === 0) {
    return <span>Max level</span>;
  }

  return (
    <span className="cost-list">
      {entries.map(([resourceId, amount]) => (
        <span
          className={game.resources[resourceId as keyof typeof game.resources] >= (amount ?? 0) ? '' : 'missing'}
          key={resourceId}
        >
          {game.definitions.resourceById[resourceId as keyof typeof game.resources].label}{' '}
          {formatNumber(amount ?? 0, 0)}
        </span>
      ))}
    </span>
  );
};

const FlowList = ({ game, flows }: { game: GameStore; flows: ResourceMap }) => {
  const entries = Object.entries(flows).filter(([, amount]) => (amount ?? 0) > 0);
  if (entries.length === 0) {
    return <span className="muted">None</span>;
  }

  return (
    <span className="flow-list">
      {entries.map(([resourceId, amount]) => (
        <span key={resourceId}>
          {game.definitions.resourceById[resourceId as keyof typeof game.resources].label}{' '}
          {formatNumber(amount ?? 0, 2)}
        </span>
      ))}
    </span>
  );
};

export function BuildingPanel({ game, selectedBuildingId, selectedBuildingVersion }: BuildingPanelProps) {
  const buildingRefs = useRef<Partial<Record<BuildingId, HTMLElement>>>({});
  const assignedWorkers = game.definitions.buildings.reduce(
    (total, building) => total + game.buildings[building.id].workers,
    0,
  );
  const availableWorkers = game.workers.total - assignedWorkers;

  useEffect(() => {
    if (!selectedBuildingId) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const element = buildingRefs.current[selectedBuildingId];
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      element?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedBuildingId, selectedBuildingVersion]);

  return (
    <section className="panel building-panel" aria-label="Buildings">
      <div className="panel-heading">
        <div>
          <h2>Buildings</h2>
          <p>
            {availableWorkers} idle of {game.workers.total} workers
          </p>
        </div>
      </div>

      <div className="building-grid">
        {game.definitions.buildings.map((definition) => {
          const building = game.buildings[definition.id];
          const recipe = game.definitions.recipeById[building.recipeId];
          const upgradeCost = getBuildingUpgradeCost(game, definition.id);
          const canUpgrade =
            building.level < MAX_BUILDING_LEVEL && canAffordResources(game.resources, upgradeCost);
          const blockedReason = game.stats.blockedBuildings[definition.id];
          const primaryOutputId = Object.keys(recipe.outputs)[0] as keyof typeof game.resources | undefined;
          const primaryOutputRate = primaryOutputId
            ? game.stats.buildingProductionPerSecond[definition.id][primaryOutputId]
            : 0;

          return (
            <article
              className={`building-card${selectedBuildingId === definition.id ? ' selected' : ''}`}
              key={definition.id}
              ref={(element) => {
                if (element) {
                  buildingRefs.current[definition.id] = element;
                } else {
                  delete buildingRefs.current[definition.id];
                }
              }}
              tabIndex={-1}
            >
              <div className="building-card-top">
                <div>
                  <h3>{definition.label}</h3>
                  <p>{definition.description}</p>
                </div>
                <span className="level-badge">Lv {building.level}</span>
              </div>

              <div className="worker-stepper" aria-label={`${definition.label} workers`}>
                <button
                  type="button"
                  onClick={() => game.assignWorkers(definition.id, building.workers - 1)}
                  disabled={building.workers <= 0}
                >
                  -
                </button>
                <strong>{building.workers}</strong>
                <button
                  type="button"
                  onClick={() => game.assignWorkers(definition.id, building.workers + 1)}
                  disabled={availableWorkers <= 0}
                >
                  +
                </button>
              </div>

              {definition.recipes.length > 1 ? (
                <label className="field-label">
                  Recipe
                  <select
                    value={building.recipeId}
                    onChange={(event) =>
                      game.setRecipe(definition.id, event.currentTarget.value as typeof building.recipeId)
                    }
                  >
                    {definition.recipes.map((recipeId) => (
                      <option key={recipeId} value={recipeId}>
                        {game.definitions.recipeById[recipeId].label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="single-recipe">{recipe.label}</div>
              )}

              <div className="building-flows">
                <div>
                  <span>Inputs</span>
                  <FlowList game={game} flows={recipe.inputs} />
                </div>
                <div>
                  <span>Outputs</span>
                  <FlowList game={game} flows={recipe.outputs} />
                </div>
              </div>

              <div className="building-stats">
                <span>Effective workers {formatNumber(game.stats.effectiveWorkers[definition.id], 2)}</span>
                <span>Output {formatSignedRate(primaryOutputRate)}</span>
              </div>

              {blockedReason ? <div className="status-warning">{blockedReason}</div> : null}

              <div className="upgrade-row">
                <CostList game={game} cost={upgradeCost} />
                <button
                  type="button"
                  onClick={() => game.upgradeBuilding(definition.id)}
                  disabled={!canUpgrade}
                >
                  Upgrade
                </button>
              </div>

              <div className="equipped-books">
                {building.equippedBooks.length === 0 ? (
                  <span className="muted">No books equipped</span>
                ) : (
                  building.equippedBooks.map((book, index) => (
                    <span key={`${book.bookId}-${index}`}>
                      {game.definitions.bookById[book.bookId].label} · {game.definitions.rarityLabels[book.rarity]}
                    </span>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
