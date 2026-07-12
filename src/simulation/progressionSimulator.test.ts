import { describe, expect, it } from 'vitest';
import { ACTIVE_PLAYTEST_BENCHMARKS, simulatePlayerProgression } from './progressionSimulator';

describe('player progression simulator', () => {
  it('runs a deterministic baseline player through the campaign', () => {
    const first = simulatePlayerProgression();
    const second = simulatePlayerProgression();

    expect(first.completed).toBe(true);
    expect(first.chapters.map((chapter) => chapter.chapterId)).toEqual([
      'arrival',
      'hamlet',
      'village',
      'mountain_town',
    ]);
    expect(first.chapters.map((chapter) => chapter.durationSeconds)).toEqual(
      second.chapters.map((chapter) => chapter.durationSeconds),
    );
    expect(first.timeline).toEqual(second.timeline);
  });

  it('records inherited stockpiles and the last completed requirement', () => {
    const result = simulatePlayerProgression();

    for (const chapter of result.chapters) {
      expect(chapter.completedAtSeconds).not.toBeNull();
      expect(chapter.durationSeconds).not.toBeNull();
      expect(chapter.endingStockpile).not.toBeNull();
      expect(chapter.lastRequirement).not.toBeNull();
    }
    expect(result.chapters[1].startingStockpile).toEqual(result.chapters[0].endingStockpile);
  });

  it('supports slower player check-in intervals as a comparable scenario', () => {
    const everyMinute = simulatePlayerProgression();
    const everyTwoMinutes = simulatePlayerProgression({ decisionIntervalSeconds: 120 });

    expect(everyTwoMinutes.elapsedSeconds).toBeGreaterThanOrEqual(everyMinute.elapsedSeconds);
    expect(everyTwoMinutes.timeline[1].atSeconds).toBe(120);
  });

  it('models the workforce levels from the active playtest and records its timing benchmarks', () => {
    const result = simulatePlayerProgression();
    expect(
      result.chapters.slice(1).map((chapter) => ({
        chapterId: chapter.chapterId,
        workers: chapter.workersAtEnd,
      })),
    ).toEqual([
      { chapterId: 'hamlet', workers: 12 },
      { chapterId: 'village', workers: 24 },
      { chapterId: 'mountain_town', workers: 40 },
    ]);
    expect(ACTIVE_PLAYTEST_BENCHMARKS).toEqual([
      { chapterId: 'hamlet', completedAtSeconds: 520, workers: 12 },
      { chapterId: 'village', completedAtSeconds: 1_300, workers: 24 },
      { chapterId: 'mountain_town', completedAtSeconds: 1_800, workers: 40 },
    ]);
    expect(result.systemsUsed).toEqual({
      bookPacksPurchased: 5,
      firstBookPurchaseAtSeconds: expect.any(Number),
      contractsCompleted: 10,
      offlineBoostGameSecondsUsed: 0,
      marketArbitrageProfit: 0,
    });
  });

  it('uses earned offline charge when an accelerated scenario provides it', () => {
    const result = simulatePlayerProgression({ offlineChargeSeconds: 1_200 });

    expect(result.systemsUsed.offlineBoostGameSecondsUsed).toBe(1_200);
  });
});
