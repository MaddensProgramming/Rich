import { describe, expect, it } from 'vitest';
import type { ChapterId } from '../simulation';
import { getTownHotspotPlacements } from './townHotspots';

const chapters: ChapterId[] = ['arrival', 'hamlet', 'village', 'mountain_town'];

describe('town hotspot placements', () => {
  it.each(chapters)('keeps %s hotspot coordinates unique and inside the town art', (chapterId) => {
    const placements = getTownHotspotPlacements(chapterId);
    expect(new Set(placements.map((placement) => placement.id)).size).toBe(placements.length);

    for (const placement of placements) {
      expect(placement.x).toBeGreaterThan(0);
      expect(placement.x).toBeLessThan(1);
      expect(placement.y).toBeGreaterThan(0);
      expect(placement.y).toBeLessThan(1);
    }
  });
});
