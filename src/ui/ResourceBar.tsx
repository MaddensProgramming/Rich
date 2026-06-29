import type { GameStore } from '../store/gameStore';
import { getCampaignChapter, getCurrentUpgradeProject } from '../simulation';
import { formatNumber, formatSignedRate } from './format';

interface ResourceBarProps {
  game: GameStore;
}

export function ResourceBar({ game }: ResourceBarProps) {
  const chapter = getCampaignChapter(game);
  const project = getCurrentUpgradeProject(game);
  const visibleResourceIds = new Set([
    ...chapter.availableRecipeIds.flatMap((recipeId) => {
      const recipe = game.definitions.recipeById[recipeId];
      return [...Object.keys(recipe.inputs), ...Object.keys(recipe.outputs)];
    }),
    ...Object.keys(project.requirements),
    'food',
    ...(game.campaign.unlockedSystems.manualGather ? ['vegetables'] : []),
  ]);

  return (
    <section className="resource-strip" aria-label="Resources">
      {game.definitions.resources.filter((resource) => visibleResourceIds.has(resource.id)).map((resource) => {
        const net = game.stats.netPerSecond[resource.id] ?? 0;
        const amountLabel = formatNumber(game.resources[resource.id]);
        const rateLabel = formatSignedRate(net);
        return (
          <div
            className="resource-pill"
            key={resource.id}
            aria-label={`${resource.label}: ${amountLabel}, ${rateLabel}`}
            title={`${resource.label}: ${amountLabel} (${rateLabel})`}
          >
            <span className="resource-icon" aria-hidden="true">
              {resource.icon}
            </span>
            <strong>{amountLabel}</strong>
            <span className={net >= 0 ? 'rate-positive' : 'rate-negative'}>{rateLabel}</span>
          </div>
        );
      })}
    </section>
  );
}
