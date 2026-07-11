import { describe, expect, it } from 'vitest';
import { chapterById } from '../data/chapterProjects';
import { createInitialGameState } from './gameState';
import { createProductionPlan } from './productionPlanner';

describe('goal production planner', () => {
  it('expands finished-goods goals into their full input chains', () => {
    const state = createInitialGameState(0);
    state.campaign.chapterId = 'mountain_town';
    state.workers.total = 24;
    state.workers.housingCapacity = 24;
    state.resources.food = 1_000;

    for (const buildingId of chapterById.mountain_town.availableBuildingIds) {
      state.campaign.constructedBuildings[buildingId] = true;
      state.buildings[buildingId].level = 3;
    }

    const plan = createProductionPlan(state, {
      foodHorizonSeconds: 0,
      includeContractDemand: false,
    });

    expect(plan.demand.stone_blocks).toBe(60);
    expect(plan.demand.tools).toBeGreaterThan(80);
    expect(plan.demand.planks).toBeGreaterThan(150);
    expect(plan.demand.iron_bars).toBeGreaterThan(0);
    expect(plan.recipeEffort.stonemason_blocks).toBeGreaterThan(0);
    expect(plan.recipeEffort.blacksmith_tools).toBeGreaterThan(0);
    expect(plan.recipeEffort.lumberjack_planks).toBeGreaterThan(0);
    expect(
      Object.values(plan.workerAssignments).reduce((total, workers) => total + workers, 0),
    ).toBe(state.workers.total);
  });
});
