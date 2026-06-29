import { useMemo, type SyntheticEvent } from 'react';
import {
  MAX_BUILDING_LEVEL,
  canAffordResources,
  canAdvanceChapter,
  canConstructBuilding,
  getBuildingConstructionCost,
  getBuildingUpgradeCost,
  getCampaignChapter,
  getCurrentUpgradeProject,
  getCurrentUpgradeProjectProgress,
  getTownFoodConsumptionPerSecond,
  getUpgradeProjectDeliveries,
  getUpgradeProjectMoneyDelivered,
  isBuildingConstructed,
  isSecondRecipeSlotUnlocked,
} from '../simulation';
import type { BuildingId, ResourceId, ResourceMap } from '../simulation';
import type { GameStore } from '../store/gameStore';
import { LibraryPanel } from './LibraryPanel';
import { MarketPanel } from './MarketPanel';
import { ContractsPanel } from './ContractsPanel';
import { WorkerPanel } from './WorkerPanel';
import { formatNumber, formatSignedRate } from './format';
import { ResourceIcon } from './ResourceIcon';
import type { TownHotspotSelection } from './townHotspots';

interface CampaignDisplay {
  chapterLabel: string;
  projectLabel: string;
  progressLabel: string;
  progressRatio: number | null;
  statusLabel: string;
  unlockLabel: string;
}

interface TownContextPopupProps {
  game: GameStore;
  selection: TownHotspotSelection;
  selectionVersion: number;
  onClose: () => void;
  onPopupPointer: () => void;
  onOpenHotspot: (selection: TownHotspotSelection) => void;
}

const readCampaignDisplay = (game: GameStore): CampaignDisplay => {
  const chapter = getCampaignChapter(game);
  const project = getCurrentUpgradeProject(game);
  const progressRatio = getCurrentUpgradeProjectProgress(game);
  const deliveries = getUpgradeProjectDeliveries(game, project.id);
  const moneyDelivered = getUpgradeProjectMoneyDelivered(game, project.id);

  const requirementKeys = Object.keys(project.requirements).filter(
    (resourceId) => (project.requirements[resourceId as ResourceId] ?? 0) > 0,
  );
  let metLines = 0;
  let totalLines = requirementKeys.length;
  for (const resourceId of requirementKeys) {
    const required = project.requirements[resourceId as ResourceId] ?? 0;
    if ((deliveries[resourceId as ResourceId] ?? 0) + 1e-6 >= required) {
      metLines += 1;
    }
  }
  const moneyRequired = project.moneyRequirement ?? 0;
  if (moneyRequired > 0) {
    totalLines += 1;
    if (moneyDelivered + 1e-6 >= moneyRequired) {
      metLines += 1;
    }
  }

  const ready = canAdvanceChapter(game);

  return {
    chapterLabel: chapter.label,
    projectLabel: project.label,
    progressLabel: `${metLines} / ${totalLines} delivered`,
    progressRatio,
    statusLabel: game.campaign.campaignComplete
      ? 'Campaign complete'
      : ready
        ? project.nextChapterId
          ? 'Ready to advance when you choose.'
          : 'Ready to complete.'
        : 'Deliver the exact resources required to fill the current town project.',
    unlockLabel: ready ? project.completionStoryText : project.description,
  };
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

const formatResourceCost = (cost: ResourceMap, game: GameStore) => {
  const entries = Object.entries(cost).filter(([, amount]) => (amount ?? 0) > 0);

  if (entries.length === 0) {
    return <span className="muted">Max level</span>;
  }

  return (
    <div className="popup-cost-list">
      {entries.map(([resourceId, amount]) => (
        <span
          className={game.resources[resourceId as keyof typeof game.resources] >= (amount ?? 0) ? '' : 'missing'}
          key={resourceId}
        >
          {game.definitions.resourceById[resourceId as keyof typeof game.resources].label}{' '}
          {formatNumber(amount ?? 0, 0)}
        </span>
      ))}
    </div>
  );
};

function BuildingPopup({ game, selection }: { game: GameStore; selection: TownHotspotSelection }) {
  const buildingId = selection.buildingId ?? (selection.id as BuildingId);
  const definition = game.definitions.buildings.find((item) => item.id === buildingId);

  if (!definition) {
    return <div className="popup-copy">The selected building is not available yet.</div>;
  }

  const chapter = getCampaignChapter(game);
  const constructed = isBuildingConstructed(game, definition.id);
  const displayLabel = getStageBuildingLabel(game, definition.id);
  const chapterAvailable = chapter.availableBuildingIds.includes(definition.id);
  const constructionCost = getBuildingConstructionCost(definition.id);

  if (!constructed) {
    return (
      <section className="popup-section popup-building">
        <div className="popup-copy">
          <p>{chapterAvailable ? definition.description : `${displayLabel} unlocks in a later chapter.`}</p>
        </div>
        <div className="popup-grid">
          <div>
            <span className="popup-label">State</span>
            <strong className="popup-strong">{chapterAvailable ? 'Buildable' : 'Locked'}</strong>
          </div>
          <div>
            <span className="popup-label">Chapter</span>
            <strong className="popup-strong">{chapter.label}</strong>
          </div>
        </div>
        <div className="upgrade-row popup-upgrade-row">
          {formatResourceCost(constructionCost, game)}
          <button
            type="button"
            onClick={() => game.constructBuilding(definition.id)}
            disabled={!canConstructBuilding(game, definition.id)}
          >
            Build
          </button>
        </div>
      </section>
    );
  }

  const building = game.buildings[definition.id];
  const recipe = game.definitions.recipeById[building.recipeId];
  const upgradeCost = getBuildingUpgradeCost(game, definition.id);
  const canUpgrade = building.level < MAX_BUILDING_LEVEL && canAffordResources(game.resources, upgradeCost);
  const availableWorkers = game.workers.total - game.definitions.buildings.reduce((total, item) => total + game.buildings[item.id].workers, 0);
  const primaryOutputId = Object.keys(recipe.outputs)[0] as keyof typeof game.resources | undefined;
  const primaryOutputRate = primaryOutputId ? game.stats.buildingProductionPerSecond[definition.id][primaryOutputId] : 0;
  const availableRecipes = definition.recipes.filter((recipeId) => chapter.availableRecipeIds.includes(recipeId));

  return (
    <section className="popup-section popup-building">
      <div className="popup-copy">
        <p>{definition.description}</p>
      </div>
      <div className="popup-grid">
        <div>
          <span className="popup-label">Workers</span>
          <div className="worker-stepper popup-stepper" aria-label={`${displayLabel} workers`}>
            <button
              type="button"
              aria-label={`Remove worker from ${displayLabel}`}
              onClick={() => game.assignWorkers(definition.id, building.workers - 1)}
              disabled={building.workers <= 0}
            >
              -
            </button>
            <strong>{building.workers}</strong>
            <button
              type="button"
              aria-label={`Add worker to ${displayLabel}`}
              onClick={() => game.assignWorkers(definition.id, building.workers + 1)}
              disabled={availableWorkers <= 0}
            >
              +
            </button>
          </div>
        </div>
        <div>
          <span className="popup-label">Level</span>
          <strong className="popup-strong">Lv {building.level}</strong>
        </div>
      </div>

      {availableRecipes.length > 1 ? (
        <label className="field-label popup-field">
          Recipe
          <select
            value={building.recipeId}
            onChange={(event) => game.setRecipe(definition.id, event.currentTarget.value as typeof building.recipeId)}
          >
            {availableRecipes.map((recipeId) => (
              <option key={recipeId} value={recipeId}>
                {game.definitions.recipeById[recipeId].label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="single-recipe popup-single-recipe">{recipe.label}</div>
      )}

      {isSecondRecipeSlotUnlocked(game, definition.id) ? (
        <div className="second-recipe-slot">
          <label className="field-label popup-field">
            Second recipe
            <select
              value={building.secondaryRecipeId ?? ''}
              onChange={(event) =>
                game.setSecondaryRecipe(
                  definition.id,
                  event.currentTarget.value === ''
                    ? null
                    : (event.currentTarget.value as typeof building.recipeId),
                )
              }
            >
              <option value="">None</option>
              {availableRecipes
                .filter((recipeId) => recipeId !== building.recipeId)
                .map((recipeId) => (
                  <option key={recipeId} value={recipeId}>
                    {game.definitions.recipeById[recipeId].label}
                  </option>
                ))}
            </select>
          </label>
          {building.secondaryRecipeId ? (
            <label className="field-label popup-field worker-share-field">
              <span>
                Worker split: {Math.round(building.workerShare * 100)}% {recipe.label} /{' '}
                {Math.round((1 - building.workerShare) * 100)}%{' '}
                {game.definitions.recipeById[building.secondaryRecipeId].label}
              </span>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={Math.round(building.workerShare * 100)}
                onChange={(event) =>
                  game.setWorkerShare(definition.id, Number(event.currentTarget.value) / 100)
                }
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="building-flows popup-flows">
        <div>
          <span>Inputs</span>
          <div className="flow-list">
            {Object.entries(recipe.inputs).length === 0 ? <span className="muted">None</span> : null}
            {Object.entries(recipe.inputs)
              .filter(([, amount]) => (amount ?? 0) > 0)
              .map(([resourceId, amount]) => (
                <span key={resourceId}>
                  {game.definitions.resourceById[resourceId as keyof typeof game.resources].label}{' '}
                  {formatNumber(amount ?? 0, 2)}
                </span>
              ))}
          </div>
        </div>
        <div>
          <span>Outputs</span>
          <div className="flow-list">
            {Object.entries(recipe.outputs).length === 0 ? <span className="muted">None</span> : null}
            {Object.entries(recipe.outputs)
              .filter(([, amount]) => (amount ?? 0) > 0)
              .map(([resourceId, amount]) => (
                <span key={resourceId}>
                  {game.definitions.resourceById[resourceId as keyof typeof game.resources].label}{' '}
                  {formatNumber(amount ?? 0, 2)}
                </span>
              ))}
          </div>
        </div>
      </div>

      <div className="building-stats popup-stats">
        <span>Effective workers {formatNumber(game.stats.effectiveWorkers[definition.id], 2)}</span>
        <span>Output {formatSignedRate(primaryOutputRate)}</span>
      </div>

      {game.stats.blockedBuildings[definition.id] ? (
        <div className="status-warning">{game.stats.blockedBuildings[definition.id]}</div>
      ) : null}

      <div className="upgrade-row popup-upgrade-row">
        {formatResourceCost(upgradeCost, game)}
        <button type="button" onClick={() => game.upgradeBuilding(definition.id)} disabled={!canUpgrade}>
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
    </section>
  );
}

function ProjectPopup({ game, onOpenHotspot }: Pick<TownContextPopupProps, 'game' | 'onOpenHotspot'>) {
  const campaign = useMemo(() => readCampaignDisplay(game), [game]);
  const chapter = getCampaignChapter(game);
  const project = getCurrentUpgradeProject(game);
  const ready = canAdvanceChapter(game);
  const deliveries = getUpgradeProjectDeliveries(game, project.id);
  const moneyDelivered = getUpgradeProjectMoneyDelivered(game, project.id);
  const requirementRows = Object.entries(project.requirements)
    .filter((entry): entry is [ResourceId, number] => (entry[1] ?? 0) > 0)
    .map(([resourceId, required]) => ({
      resourceId,
      required,
      delivered: deliveries[resourceId] ?? 0,
      owned: game.resources[resourceId],
      definition: game.definitions.resourceById[resourceId],
    }));
  const moneyRequired = project.moneyRequirement ?? 0;
  const availableBuildings = chapter.availableBuildingIds;

  return (
    <section className="popup-section popup-project">
      <div className="popup-copy">
        <p>
          {campaign.chapterLabel} · {campaign.projectLabel}
        </p>
        <p>{campaign.unlockLabel}</p>
      </div>

      <div className="popup-progress">
        <div className="boost-topline">
          <span>Requirements met</span>
          <strong>{campaign.progressLabel}</strong>
        </div>
        <div className="boost-bar popup-progress-bar" aria-label="Chapter progress">
          <span style={{ width: `${(campaign.progressRatio ?? 0) * 100}%` }} />
        </div>
        <p>{campaign.statusLabel}</p>
      </div>

      <div className="project-contribution-grid">
        {requirementRows.map(({ resourceId, required, delivered, owned, definition }) => {
          const remaining = Math.max(0, required - delivered);
          const complete = remaining <= 1e-6;
          return (
            <div className="project-contribution-row" key={resourceId}>
              <div>
                <strong>
                  <ResourceIcon resourceId={definition.id} />
                  {definition.label}
                </strong>
                <span>
                  {formatNumber(delivered, 0)} / {formatNumber(required, 0)} delivered ·{' '}
                  {formatNumber(owned, 0)} owned
                </span>
              </div>
              <div className="project-contribution-actions">
                {[5, 25].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() =>
                      game.contributeToUpgradeProject({
                        [resourceId]: Math.min(amount, remaining),
                      })
                    }
                    disabled={owned <= 0 || complete}
                  >
                    +{amount}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => game.contributeToUpgradeProject({ [resourceId]: remaining })}
                  disabled={owned <= 0 || complete}
                >
                  Max
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {moneyRequired > 0 ? (
        (() => {
          const remainingMoney = Math.max(0, moneyRequired - moneyDelivered);
          const moneyComplete = remainingMoney <= 1e-6;
          return (
            <div className="project-contribution-row">
              <div>
                <strong>Money</strong>
                <span>
                  ${formatNumber(moneyDelivered, 0)} / ${formatNumber(moneyRequired, 0)} delivered · $
                  {formatNumber(game.money, 0)} available
                </span>
              </div>
              <div className="project-contribution-actions">
                {[50, 250].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() =>
                      game.contributeToUpgradeProject({}, Math.min(amount, remainingMoney))
                    }
                    disabled={game.money <= 0 || moneyComplete}
                  >
                    +${amount}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => game.contributeToUpgradeProject({}, remainingMoney)}
                  disabled={game.money <= 0 || moneyComplete}
                >
                  Max
                </button>
              </div>
            </div>
          );
        })()
      ) : null}

      <div className="popup-action-grid">
        {availableBuildings.map((buildingId) => (
          <button
            key={buildingId}
            type="button"
            onClick={() =>
              onOpenHotspot({
                id: buildingId,
                kind: 'building',
                label: getStageBuildingLabel(game, buildingId),
                buildingId,
              })
            }
          >
            Open {getStageBuildingLabel(game, buildingId)}
          </button>
        ))}
      </div>

      <div className="popup-primary-action">
        <button
          type="button"
          className="popup-advance-button"
          onClick={game.advanceChapter}
          disabled={!ready || game.campaign.campaignComplete}
        >
          {project.nextChapterId ? 'Advance Chapter' : 'Complete Project'}
        </button>
      </div>
    </section>
  );
}

function GatheringPopup({ game, onOpenHotspot }: Pick<TownContextPopupProps, 'game' | 'onOpenHotspot'>) {
  const availableWorkers = game.workers.total - game.definitions.buildings.reduce((total, item) => total + game.buildings[item.id].workers, 0);
  const chapter = getCampaignChapter(game);
  const shortcutBuildingIds = (['mine', 'lumberjack', 'farm'] as const).filter((buildingId) =>
    chapter.availableBuildingIds.includes(buildingId),
  );
  const gatherOptions = [
    {
      resourceId: 'wood' as const,
      label: 'Clearing wood',
      pool: game.campaign.clearingWood,
      actionLabel: 'Chop Wood',
      onGather: game.gatherClearingWood,
    },
    {
      resourceId: 'stone' as const,
      label: 'Loose stone',
      pool: game.campaign.clearingStone,
      actionLabel: 'Gather Stone',
      onGather: game.gatherLooseStone,
    },
    {
      resourceId: 'vegetables' as const,
      label: 'Forage',
      pool: game.campaign.clearingVegetables,
      actionLabel: 'Forage Vegetables',
      onGather: game.forageVegetables,
    },
  ];

  return (
    <section className="popup-section popup-gathering">
      <div className="popup-copy">
        <p>Gather by hand while the first work sites are still being built.</p>
      </div>

      <div className="popup-grid popup-gathering-grid">
        {gatherOptions.map(({ resourceId, label, pool }) => (
          <div key={resourceId}>
            <span className="popup-label">
              <ResourceIcon resourceId={resourceId} />
              {label}
            </span>
            <strong className="popup-strong">{formatNumber(pool, 0)}</strong>
          </div>
        ))}
        <div>
          <span className="popup-label">Town food use</span>
          <strong className="popup-strong">{formatNumber(getTownFoodConsumptionPerSecond(game), 2)}/s</strong>
        </div>
      </div>

      <div className="popup-action-grid">
        {gatherOptions.map(({ resourceId, pool, actionLabel, onGather }) => (
          <button
            type="button"
            key={resourceId}
            onClick={() => onGather()}
            disabled={!game.campaign.unlockedSystems.manualGather || pool <= 0}
          >
            {actionLabel} +1
          </button>
        ))}
      </div>

      <div className="popup-action-grid">
        {shortcutBuildingIds.map((buildingId) => (
          <button
            key={buildingId}
            type="button"
            onClick={() =>
              onOpenHotspot({
                id: buildingId,
                kind: 'building',
                label: getStageBuildingLabel(game, buildingId),
                buildingId,
              })
            }
          >
            Open {getStageBuildingLabel(game, buildingId)}
          </button>
        ))}
      </div>

      <div className="popup-copy">
        <p>{availableWorkers} idle workers available for building assignment.</p>
      </div>
    </section>
  );
}

export function TownContextPopup({
  game,
  selection,
  selectionVersion,
  onClose,
  onPopupPointer,
  onOpenHotspot,
}: TownContextPopupProps) {
  const stopPopupPointerEvent = (event: SyntheticEvent) => {
    onPopupPointer();
    event.stopPropagation();
  };

  const consumeBackdropEvent = (event: SyntheticEvent) => {
    onPopupPointer();
    event.preventDefault();
    event.stopPropagation();
  };

  const closeFromBackdrop = (event: SyntheticEvent) => {
    consumeBackdropEvent(event);
    onClose();
  };

  const body = (() => {
    if (selection.kind === 'building') {
      return <BuildingPopup game={game} selection={selection} />;
    }

    if (selection.kind === 'market') {
      if (!game.campaign.unlockedSystems.market) {
        return (
          <div className="empty-state">
            The market opens once St. Moritz has enough settlement structure for trade.
          </div>
        );
      }

      return <MarketPanel game={game} />;
    }

    if (selection.kind === 'library') {
      if (!game.campaign.unlockedSystems.library) {
        return <div className="empty-state">The library unlocks in Village.</div>;
      }

      return <LibraryPanel game={game} />;
    }

    if (selection.kind === 'town') {
      return <WorkerPanel game={game} />;
    }

    if (selection.kind === 'contracts') {
      if (!game.campaign.unlockedSystems.contracts) {
        return <div className="empty-state">Town requests open in Village.</div>;
      }

      return <ContractsPanel game={game} />;
    }

    if (selection.kind === 'project') {
      return <ProjectPopup game={game} onOpenHotspot={onOpenHotspot} />;
    }

    return <GatheringPopup game={game} onOpenHotspot={onOpenHotspot} />;
  })();

  return (
    <div
      className="context-popup-shell"
      role="dialog"
      aria-modal="true"
      aria-label={selection.label}
      onPointerDown={stopPopupPointerEvent}
      onPointerUp={stopPopupPointerEvent}
      onClick={stopPopupPointerEvent}
    >
      <button
        className="context-popup-backdrop"
        type="button"
        aria-label="Close popup"
        onPointerDown={consumeBackdropEvent}
        onPointerUp={consumeBackdropEvent}
        onClick={closeFromBackdrop}
      />
      <div
        className="context-popup"
        onClick={stopPopupPointerEvent}
        onPointerDown={stopPopupPointerEvent}
        onPointerUp={stopPopupPointerEvent}
      >
        <div className="context-popup-header">
          <div>
            <span>{selection.kind}</span>
            <strong>{selection.label}</strong>
          </div>
          <button className="context-popup-close" type="button" aria-label="Close popup" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="context-popup-body">{body}</div>
      </div>
    </div>
  );
}

export { readCampaignDisplay };
