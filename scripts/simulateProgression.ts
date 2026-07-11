import {
  ACTIVE_PLAYTEST_BENCHMARKS,
  ACTIVE_PLAYTEST_COMBAT_COMPLETED_AT_SECONDS,
  formatProgressionDuration,
  simulatePlayerProgression,
} from '../src/simulation/progressionSimulator';

const readNumberArgument = (name: string, fallback: number) => {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const intervalSeconds = readNumberArgument('interval', 60);
const maxHours = readNumberArgument('max-hours', 6);
const manualActions = readNumberArgument('manual-actions', 12);
const maxInvestments = readNumberArgument('max-investments', 8);
const bookPacks = readNumberArgument('book-packs', 5);
const offlineCharge = readNumberArgument('offline-charge', 0);
const result = simulatePlayerProgression({
  decisionIntervalSeconds: intervalSeconds,
  maxGameSeconds: maxHours * 60 * 60,
  manualGatherActionsPerDecision: manualActions,
  maxInvestmentsPerDecision: maxInvestments,
  bookPacksToBuy: bookPacks,
  offlineChargeSeconds: offlineCharge,
});

console.log(
  `Baseline policy: decisions every ${intervalSeconds}s, ${manualActions} manual actions and up to ${maxInvestments} investments/check-in`,
);
console.table(
  result.chapters.map((chapter) => {
    const benchmark = ACTIVE_PLAYTEST_BENCHMARKS.find(
      (candidate) => candidate.chapterId === chapter.chapterId,
    );
    const deltaSeconds =
      benchmark && chapter.completedAtSeconds !== null
        ? chapter.completedAtSeconds - benchmark.completedAtSeconds
        : null;
    return {
      chapter: chapter.label,
      duration: formatProgressionDuration(chapter.durationSeconds),
      completedAt: formatProgressionDuration(chapter.completedAtSeconds),
      observedAt: benchmark ? formatProgressionDuration(benchmark.completedAtSeconds) : '-',
      modelDelta:
        deltaSeconds === null
          ? '-'
          : `${deltaSeconds >= 0 ? '+' : '-'}${formatProgressionDuration(Math.abs(deltaSeconds))}`,
      decisions: chapter.decisionCount,
      workers: `${chapter.workersAtStart} -> ${chapter.workersAtEnd ?? '-'}`,
      bottleneck: chapter.lastRequirement ?? '-',
      inherited: Object.entries(chapter.startingStockpile)
        .map(([resource, amount]) => `${resource}=${amount}`)
        .join(' '),
    };
  }),
);
console.log(
  result.completed
    ? `Campaign completed in ${formatProgressionDuration(result.elapsedSeconds)}.`
    : `Campaign did not complete within ${maxHours} hours.`,
);
console.log(
  `Observed combat completion: ${formatProgressionDuration(ACTIVE_PLAYTEST_COMBAT_COMPLETED_AT_SECONDS)} (not yet modeled by this campaign simulator).`,
);
console.log(
  `Systems used: ${result.systemsUsed.contractsCompleted} contracts, ${result.systemsUsed.bookPacksPurchased} book packs, ${formatProgressionDuration(result.systemsUsed.offlineBoostGameSecondsUsed)} offline boost charge, $${result.systemsUsed.marketArbitrageProfit.toFixed(0)} market round-trip profit.`,
);

if (!result.completed) {
  process.exitCode = 1;
}
