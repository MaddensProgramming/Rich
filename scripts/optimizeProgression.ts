import { formatProgressionDuration } from '../src/simulation/progressionSimulator';
import {
  optimizePolicyToFirstInvasion,
  type PolicyOptimizationResult,
} from '../src/simulation/policyOptimizer';

const printResult = (label: string, result: PolicyOptimizationResult) => {
  const best = result.best;
  console.log(`\n${label}: evaluated ${result.evaluatedPolicies} human-scale policies.`);
  console.table(
    result.leaderboard.map((evaluation, index) => ({
      rank: index + 1,
      invasion: formatProgressionDuration(evaluation.result.invasionStartedAtSeconds),
      greatHall: formatProgressionDuration(evaluation.result.campaign.elapsedSeconds),
      interval: `${evaluation.policy.decisionIntervalSeconds}s`,
      workers: `${evaluation.policy.targetWorkersByChapter.hamlet}/${evaluation.policy.targetWorkersByChapter.village}/${evaluation.policy.targetWorkersByChapter.mountain_town}`,
      books: evaluation.policy.bookPacksToBuy,
      bookTiming: evaluation.policy.bookPurchaseTiming,
      contractsFirst: evaluation.policy.completeContractsBeforeProjects,
      roundTrips: evaluation.policy.maxMarketRoundTripsPerDecision,
      production: evaluation.policy.productionPolicy,
    })),
  );
  console.log('Best policy:', best.policy);
  console.log('Systems used:', best.result.campaign.systemsUsed);
  for (const warning of result.warnings) console.warn(`WARNING: ${warning}`);
  return best.result.completed;
};

const normalEconomy = optimizePolicyToFirstInvasion({ allowMarketRoundTrips: false });
const currentRules = optimizePolicyToFirstInvasion({ allowMarketRoundTrips: true });
const normalCompleted = printResult('Normal economy (no repeatable market round trips)', normalEconomy);
const currentCompleted = printResult('Fastest under current market rules', currentRules);

if (!normalCompleted || !currentCompleted) process.exitCode = 1;
