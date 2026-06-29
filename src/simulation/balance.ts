import { buildingById, recipes } from '../data/buildings';
import { resourceById, resourceIds } from '../data/resources';
import { chapterUpgradeProjects } from '../data/chapterProjects';
import type { ChapterUpgradeProjectDefinition, ResourceId } from './types';

/**
 * Balance tooling.
 *
 * The goal of this module is to provide an objective, deterministic measure of how
 * much player effort a chapter upgrade project demands, so we can spot requirements
 * that are negligible (players can ignore them) or dominant (single bottleneck).
 *
 * Effort is measured in "worker-seconds" (ws): the amount of time one worker at a
 * building's base production multiplier needs to produce one unit of a resource,
 * including the recursive cost of its inputs.
 *
 * Documented simplifications:
 *  - Uses the cheapest single producing recipe per resource ("focus" recipes).
 *  - Ignores production exponent / diminishing returns, book bonuses, and joint
 *    by-products (only the primary named output is credited).
 */

export const MIN_SHARE = 0.08;
export const MAX_SHARE = 0.6;

const recipesByOutput = (() => {
  const map = new Map<ResourceId, typeof recipes>();
  for (const recipe of recipes) {
    for (const resourceId of resourceIds) {
      if ((recipe.outputs[resourceId] ?? 0) > 0) {
        const list = map.get(resourceId) ?? [];
        list.push(recipe);
        map.set(resourceId, list);
      }
    }
  }
  return map;
})();

const unitCostCache = new Map<ResourceId, number>();

/**
 * Worker-seconds required to produce one unit of a resource via its cheapest recipe.
 */
export const getResourceUnitCost = (resourceId: ResourceId): number => {
  const cached = unitCostCache.get(resourceId);
  if (cached !== undefined) {
    return cached;
  }

  // Seed with Infinity to break any accidental cycles during recursion.
  unitCostCache.set(resourceId, Number.POSITIVE_INFINITY);

  const producingRecipes = recipesByOutput.get(resourceId) ?? [];
  let best = Number.POSITIVE_INFINITY;

  for (const recipe of producingRecipes) {
    const building = buildingById[recipe.buildingId];
    const outputAmount = recipe.outputs[resourceId] ?? 0;
    if (outputAmount <= 0 || building.baseProductionMultiplier <= 0) {
      continue;
    }

    const runLabor = 1 / building.baseProductionMultiplier;
    let inputCost = 0;
    for (const inputId of resourceIds) {
      const amount = recipe.inputs[inputId] ?? 0;
      if (amount > 0) {
        inputCost += amount * getResourceUnitCost(inputId);
      }
    }

    const cost = (runLabor + inputCost) / outputAmount;
    if (cost < best) {
      best = cost;
    }
  }

  unitCostCache.set(resourceId, best);
  return best;
};

/**
 * Worker-seconds equivalent to earning one unit of money via the cheapest sell path.
 */
export const getMoneyUnitCost = (): number => {
  let best = Number.POSITIVE_INFINITY;
  for (const resourceId of resourceIds) {
    const basePrice = resourceById[resourceId].basePrice;
    if (basePrice <= 0) {
      continue;
    }
    const cost = getResourceUnitCost(resourceId) / basePrice;
    if (cost < best) {
      best = cost;
    }
  }
  return best;
};

export interface ProjectEffortLine {
  key: ResourceId | 'money';
  amount: number;
  effort: number;
  share: number;
}

export interface ProjectEffort {
  projectId: string;
  lines: ProjectEffortLine[];
  total: number;
}

export const getProjectEffort = (project: ChapterUpgradeProjectDefinition): ProjectEffort => {
  const lines: ProjectEffortLine[] = [];

  for (const resourceId of resourceIds) {
    const amount = project.requirements[resourceId] ?? 0;
    if (amount > 0) {
      lines.push({
        key: resourceId,
        amount,
        effort: amount * getResourceUnitCost(resourceId),
        share: 0,
      });
    }
  }

  const moneyRequirement = project.moneyRequirement ?? 0;
  if (moneyRequirement > 0) {
    lines.push({
      key: 'money',
      amount: moneyRequirement,
      effort: moneyRequirement * getMoneyUnitCost(),
      share: 0,
    });
  }

  const total = lines.reduce((sum, line) => sum + line.effort, 0);
  for (const line of lines) {
    line.share = total > 0 ? line.effort / total : 0;
  }

  return { projectId: project.id, lines, total };
};

export interface ProjectBalanceFlag {
  key: ProjectEffortLine['key'];
  share: number;
  issue: 'negligible' | 'dominant';
}

export interface ProjectBalanceReport {
  projectId: string;
  total: number;
  lines: ProjectEffortLine[];
  flags: ProjectBalanceFlag[];
}

export const getProjectBalanceReport = (
  project: ChapterUpgradeProjectDefinition,
): ProjectBalanceReport => {
  const effort = getProjectEffort(project);
  const flags: ProjectBalanceFlag[] = [];

  for (const line of effort.lines) {
    if (line.share < MIN_SHARE) {
      flags.push({ key: line.key, share: line.share, issue: 'negligible' });
    } else if (line.share > MAX_SHARE) {
      flags.push({ key: line.key, share: line.share, issue: 'dominant' });
    }
  }

  return { projectId: project.id, total: effort.total, lines: effort.lines, flags };
};

export const getAllProjectBalanceReports = (): ProjectBalanceReport[] =>
  chapterUpgradeProjects.map((project) => getProjectBalanceReport(project));
