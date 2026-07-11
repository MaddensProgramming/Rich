import { chapters } from '../data/chapterProjects';
import {
  simulateToFirstInvasion,
  type FirstInvasionSimulationResult,
  type FirstInvasionSimulatorOptions,
} from './invasionSimulator';
import type { ChapterId } from './types';

export interface OptimizedPolicy {
  decisionIntervalSeconds: number;
  targetWorkersByChapter: Record<ChapterId, number>;
  targetBuildingLevelByChapter: Record<ChapterId, number>;
  bookPacksToBuy: number;
  completeContractsBeforeProjects: boolean;
  deliverWhileGrowing: boolean;
  productionPolicy: 'static' | 'goal';
  maxMarketRoundTripsPerDecision: number;
}

export interface PolicyEvaluation {
  policy: OptimizedPolicy;
  result: FirstInvasionSimulationResult;
  score: number;
}

export interface PolicyOptimizationOptions {
  maxEvaluations?: number;
  maxActionsPerMinute?: number;
  allowMarketRoundTrips?: boolean;
  simulationOptions?: Omit<
    FirstInvasionSimulatorOptions,
    | 'decisionIntervalSeconds'
    | 'manualGatherActionsPerDecision'
    | 'maxInvestmentsPerDecision'
    | 'targetWorkersByChapter'
    | 'targetBuildingLevelByChapter'
    | 'bookPacksToBuy'
    | 'completeContractsBeforeProjects'
    | 'deliverWhileGrowing'
    | 'productionPolicy'
    | 'maxMarketRoundTripsPerDecision'
  >;
}

export interface PolicyOptimizationResult {
  best: PolicyEvaluation;
  evaluatedPolicies: number;
  leaderboard: PolicyEvaluation[];
  warnings: string[];
}

const defaultBuildingLevels: Record<ChapterId, number> = {
  arrival: 1,
  hamlet: 2,
  village: 2,
  mountain_town: 3,
};

const createWorkerProfile = (hamlet: number, village: number, mountainTown: number) => ({
  arrival: 1,
  hamlet,
  village,
  mountain_town: mountainTown,
});

const clonePolicy = (policy: OptimizedPolicy): OptimizedPolicy => ({
  ...policy,
  targetWorkersByChapter: { ...policy.targetWorkersByChapter },
  targetBuildingLevelByChapter: { ...policy.targetBuildingLevelByChapter },
});

const policyKey = (policy: OptimizedPolicy) =>
  JSON.stringify({
    interval: policy.decisionIntervalSeconds,
    workers: policy.targetWorkersByChapter,
    levels: policy.targetBuildingLevelByChapter,
    packs: policy.bookPacksToBuy,
    contracts: policy.completeContractsBeforeProjects,
    deliver: policy.deliverWhileGrowing,
    production: policy.productionPolicy,
    roundTrips: policy.maxMarketRoundTripsPerDecision,
  });

const scoreResult = (result: FirstInvasionSimulationResult) => {
  if (result.completed && result.invasionStartedAtSeconds !== null) {
    return result.invasionStartedAtSeconds;
  }
  const campaignProgress = result.campaign.chapters.reduce(
    (total, chapter) => total + (chapter.completedAtSeconds === null ? 0 : 1),
    0,
  );
  return (
    1_000_000 -
    campaignProgress * 10_000 -
    result.finalState.expedition.defeatedNodeIds.length * 1_000
  );
};

const normalizePolicy = (
  input: OptimizedPolicy,
  maxActionsPerMinute: number,
  allowMarketRoundTrips: boolean,
): OptimizedPolicy => {
  const policy = clonePolicy(input);
  policy.decisionIntervalSeconds = Math.max(5, Math.round(policy.decisionIntervalSeconds / 5) * 5);
  let previous = 1;
  for (const chapterId of ['hamlet', 'village', 'mountain_town'] as ChapterId[]) {
    policy.targetWorkersByChapter[chapterId] = Math.max(
      previous,
      Math.min(48, Math.round(policy.targetWorkersByChapter[chapterId])),
    );
    previous = policy.targetWorkersByChapter[chapterId];
  }
  policy.targetWorkersByChapter.arrival = 1;
  policy.bookPacksToBuy = Math.max(0, Math.min(20, Math.round(policy.bookPacksToBuy)));
  const maximumRoundTrips = Math.floor(
    (maxActionsPerMinute * policy.decisionIntervalSeconds) / 60 / 2,
  );
  policy.maxMarketRoundTripsPerDecision = allowMarketRoundTrips
    ? Math.max(0, Math.min(maximumRoundTrips, Math.round(policy.maxMarketRoundTripsPerDecision)))
    : 0;
  return policy;
};

const createSeedPolicies = (): OptimizedPolicy[] => {
  const buildingCounts = Object.fromEntries(
    chapters.map((chapter) => [chapter.id, chapter.availableBuildingIds.length]),
  ) as Record<ChapterId, number>;
  const derivedProfile = createWorkerProfile(
    Math.max(4, Math.round(buildingCounts.hamlet * 1.5)),
    Math.max(8, Math.round(buildingCounts.village * 2)),
    Math.max(12, Math.round(buildingCounts.mountain_town * 2.25)),
  );
  const base = {
    decisionIntervalSeconds: 20,
    targetBuildingLevelByChapter: { ...defaultBuildingLevels },
    bookPacksToBuy: 3,
    completeContractsBeforeProjects: false,
    deliverWhileGrowing: false,
    productionPolicy: 'goal' as const,
    maxMarketRoundTripsPerDecision: 20,
  };
  return [
    { ...base, targetWorkersByChapter: createWorkerProfile(6, 12, 16) },
    { ...base, targetWorkersByChapter: createWorkerProfile(8, 16, 24) },
    { ...base, targetWorkersByChapter: createWorkerProfile(12, 24, 40) },
    { ...base, targetWorkersByChapter: derivedProfile },
  ];
};

const createNeighbors = (policy: OptimizedPolicy): OptimizedPolicy[] => {
  const neighbors: OptimizedPolicy[] = [];
  for (const interval of [10, 15, 20, 25, 30]) {
    neighbors.push({ ...clonePolicy(policy), decisionIntervalSeconds: interval });
  }
  for (const chapterId of ['hamlet', 'village', 'mountain_town'] as ChapterId[]) {
    for (const delta of [-4, -2, 2, 4]) {
      const next = clonePolicy(policy);
      next.targetWorkersByChapter[chapterId] += delta;
      neighbors.push(next);
    }
  }
  for (const packs of [0, 3, 5, 10]) {
    neighbors.push({ ...clonePolicy(policy), bookPacksToBuy: packs });
  }
  for (const roundTrips of [0, 4, 10, 20, 30]) {
    neighbors.push({ ...clonePolicy(policy), maxMarketRoundTripsPerDecision: roundTrips });
  }
  neighbors.push({
    ...clonePolicy(policy),
    completeContractsBeforeProjects: !policy.completeContractsBeforeProjects,
  });
  neighbors.push({ ...clonePolicy(policy), deliverWhileGrowing: !policy.deliverWhileGrowing });
  neighbors.push({
    ...clonePolicy(policy),
    productionPolicy: policy.productionPolicy === 'goal' ? 'static' : 'goal',
  });
  return neighbors;
};

export const optimizePolicyToFirstInvasion = (
  options: PolicyOptimizationOptions = {},
): PolicyOptimizationResult => {
  const maxEvaluations = Math.max(4, Math.trunc(options.maxEvaluations ?? 50));
  const maxActionsPerMinute = Math.max(30, options.maxActionsPerMinute ?? 60);
  const allowMarketRoundTrips = options.allowMarketRoundTrips ?? true;
  const cache = new Map<string, PolicyEvaluation>();

  const evaluate = (rawPolicy: OptimizedPolicy) => {
    const policy = normalizePolicy(rawPolicy, maxActionsPerMinute, allowMarketRoundTrips);
    const key = policyKey(policy);
    const cached = cache.get(key);
    if (cached) return cached;
    const actionsPerDecision = Math.max(
      1,
      Math.floor((maxActionsPerMinute * policy.decisionIntervalSeconds) / 60),
    );
    const result = simulateToFirstInvasion({
      maxGameSeconds: 45 * 60,
      maxExpeditionSeconds: 10 * 60,
      expeditionDecisionIntervalSeconds: 10,
      manualGatherActionsPerDecision: actionsPerDecision,
      maxInvestmentsPerDecision: actionsPerDecision,
      ...options.simulationOptions,
      decisionIntervalSeconds: policy.decisionIntervalSeconds,
      targetWorkersByChapter: policy.targetWorkersByChapter,
      targetBuildingLevelByChapter: policy.targetBuildingLevelByChapter,
      bookPacksToBuy: policy.bookPacksToBuy,
      completeContractsBeforeProjects: policy.completeContractsBeforeProjects,
      deliverWhileGrowing: policy.deliverWhileGrowing,
      productionPolicy: policy.productionPolicy,
      maxMarketRoundTripsPerDecision: policy.maxMarketRoundTripsPerDecision,
    });
    const evaluation = { policy, result, score: scoreResult(result) };
    cache.set(key, evaluation);
    return evaluation;
  };

  let current = createSeedPolicies()
    .map(evaluate)
    .sort((left, right) => left.score - right.score)[0];

  while (cache.size < maxEvaluations) {
    const candidates = createNeighbors(current.policy)
      .slice(0, Math.max(0, maxEvaluations - cache.size))
      .map(evaluate)
      .sort((left, right) => left.score - right.score);
    if (candidates.length === 0 || candidates[0].score >= current.score) break;
    current = candidates[0];
  }

  const leaderboard = [...cache.values()]
    .filter((evaluation) => evaluation.result.completed)
    .sort((left, right) => left.score - right.score)
    .slice(0, 10);
  const best = leaderboard[0] ?? current;
  const warnings: string[] = [];
  if (best.result.campaign.systemsUsed.marketArbitrageProfit > 0) {
    warnings.push(
      `Current batch market math allowed $${best.result.campaign.systemsUsed.marketArbitrageProfit.toFixed(0)} of repeatable sell/buy profit.`,
    );
  }
  return {
    best,
    evaluatedPolicies: cache.size,
    leaderboard,
    warnings,
  };
};
