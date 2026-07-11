import { describe, expect, it } from 'vitest';
import {
  BARRACKS_CONSTRUCTION_COST,
  EVACUATION_COST,
  INVASION_DURATION_SECONDS,
  NORTHERN_HOST_POWER,
  NORTHERN_HOST_REWARD_EXPERIENCE,
  NORTHERN_HOST_REWARD_MONEY,
  expeditionNodes,
} from '../data/expedition';
import {
  attackExpeditionNode,
  buyExperiencePerk,
  canConstructBarracks,
  constructBarracks,
  createInitialGameState,
  evacuateTown,
  defendTown,
  getArmyPower,
  getBattlePreview,
  getInvasionBattlePreview,
  hydrateGameState,
  advanceWallClockState,
  prepareEvacuation,
  startNextRun,
  tickGame,
  trainTroops,
} from './index';

const unlockMap = () => {
  const state = createInitialGameState(0);
  state.campaign.campaignComplete = true;
  return state;
};

const buildBarracks = () => {
  const state = unlockMap();
  state.resources.wood = 1_000;
  state.resources.stone = 1_000;
  state.resources.tools = 1_000;
  return constructBarracks(state);
};

describe('post-campaign expedition', () => {
  it('gates and charges the dedicated Barracks construction', () => {
    const fresh = createInitialGameState(0);
    expect(canConstructBarracks(fresh)).toBe(false);

    const unlocked = unlockMap();
    unlocked.resources.wood = 1_000;
    unlocked.resources.stone = 1_000;
    unlocked.resources.tools = 1_000;
    const built = constructBarracks(unlocked);

    expect(built.expedition.barracksConstructed).toBe(true);
    expect(built.resources.wood).toBe(1_000 - (BARRACKS_CONSTRUCTION_COST.wood ?? 0));
    expect(built.resources.stone).toBe(1_000 - (BARRACKS_CONSTRUCTION_COST.stone ?? 0));
    expect(built.resources.tools).toBe(1_000 - (BARRACKS_CONSTRUCTION_COST.tools ?? 0));
    expect(constructBarracks(built)).toBe(built);
  });

  it('turns only unassigned workers into troops and charges exact equipment', () => {
    let state = buildBarracks();
    state.workers.total = 6;
    state.money = 1_000;
    state.resources.food = 1_000;
    state.resources.bows = 10;
    state.buildings.mine.workers = 4;
    state.campaign.constructedBuildings.mine = true;

    state = trainTroops(state, 'archer', 2);
    expect(state.expedition.troops.archer).toBe(2);
    expect(state.workers.total).toBe(4);
    expect(state.resources.food).toBe(950);
    expect(state.resources.bows).toBe(8);
    expect(state.money).toBe(930);
    expect(trainTroops(state, 'archer', 1)).toBe(state);
  });

  it('uses the deterministic preview for battle results and unlocks branches once', () => {
    let state = buildBarracks();
    state.expedition.troops = { militia: 4, archer: 0, guard: 0 };
    const preview = getBattlePreview(state, 'foothill_road');
    expect(preview?.accessible).toBe(true);
    expect(preview?.victory).toBe(true);

    const moneyBefore = state.money;
    state = attackExpeditionNode(state, 'foothill_road');
    expect(state.expedition.lastBattle?.casualties).toEqual(preview?.casualties);
    expect(state.expedition.defeatedNodeIds).toContain('foothill_road');
    expect(state.money).toBe(moneyBefore + 180);
    expect(getBattlePreview(state, 'pinewood_camp')?.accessible).toBe(true);
    expect(attackExpeditionNode(state, 'foothill_road')).toBe(state);
  });

  it('starts the invasion only after winning the Sonnenburg raid and grants its unique treasure', () => {
    let state = buildBarracks();
    state.expedition.defeatedNodeIds = expeditionNodes
      .filter((node) => node.id !== 'sonnenburg')
      .map((node) => node.id);
    state.expedition.troops = { militia: 1, archer: 0, guard: 0 };
    const failedRaid = attackExpeditionNode(state, 'sonnenburg');
    expect(failedRaid.expedition.phase).toBe('exploring');
    expect(failedRaid.expedition.relicSecured).toBe(false);

    state.expedition.troops = { militia: 0, archer: 0, guard: 10 };
    const moneyBefore = state.money;

    state = attackExpeditionNode(state, 'sonnenburg');

    expect(state.expedition.phase).toBe('invasion');
    expect(state.expedition.invasionSecondsRemaining).toBe(INVASION_DURATION_SECONDS);
    expect(state.expedition.relicSecured).toBe(true);
    expect(state.money).toBe(moneyBefore + 5_000);
    expect(state.books.owned['weapon_contracts:legendary']).toBe(1);
    expect(state.buildings.blacksmith.equippedBooks).toContainEqual({
      bookId: 'weapon_contracts',
      rarity: 'legendary',
    });
    expect(getArmyPower(state)).toBeGreaterThan(state.expedition.troops.guard * 19);
  });

  it('uses real seconds for the invasion even while production boost is active', () => {
    const state = buildBarracks();
    state.expedition.phase = 'invasion';
    state.expedition.invasionSecondsRemaining = 100;
    state.offline.active = true;
    state.offline.chargeSeconds = 1_000;

    const next = tickGame(state, 10);
    expect(next.stats.gameSpeed).toBe(5);
    expect(next.expedition.invasionSecondsRemaining).toBe(90);
  });

  it('makes the first-run final battle technically possible but wildly impractical', () => {
    const state = buildBarracks();
    state.expedition.phase = 'invasion';
    state.expedition.relicSecured = true;
    state.expedition.troops = { militia: 0, archer: 0, guard: 40 };

    const firstRunPreview = getInvasionBattlePreview(state);
    expect(firstRunPreview.enemyPower).toBe(NORTHERN_HOST_POWER);
    expect(firstRunPreview.victory).toBe(false);

    state.legacy.perks.battle_wisdom = 5;
    state.expedition.troops.guard = 60;
    expect(getInvasionBattlePreview(state).victory).toBe(true);
  });

  it('resolves a failed final stand into escape and Experience without removing evacuation choice', () => {
    let state = buildBarracks();
    state.expedition.phase = 'invasion';
    state.expedition.relicSecured = true;
    state.expedition.troops = { militia: 5, archer: 3, guard: 2 };
    state.resources.food = 1_000;
    state.resources.wood = 1_000;
    state.resources.tools = 1_000;
    state = prepareEvacuation(state);
    const preview = getInvasionBattlePreview(state);

    const result = defendTown(state);
    expect(preview.victory).toBe(false);
    expect(result.expedition.phase).toBe('defeated');
    expect(result.expedition.lastBattle?.nodeId).toBe('northern_host');
    expect(result.expedition.lastBattle?.casualties).toEqual(preview.casualties);
    expect(result.expedition.experienceEarnedThisRun).toBeGreaterThan(0);
    expect(defendTown(result)).toBe(result);
  });

  it('grants the true-victory reward when a legacy-powered army defeats the Host', () => {
    const state = buildBarracks();
    state.expedition.phase = 'invasion';
    state.expedition.relicSecured = true;
    state.expedition.defeatedNodeIds = expeditionNodes.map((node) => node.id);
    state.expedition.troops = { militia: 0, archer: 0, guard: 60 };
    state.legacy.perks.battle_wisdom = 5;
    const moneyBefore = state.money;
    const experienceBefore = state.legacy.experiencePoints;

    const result = defendTown(state);
    expect(result.expedition.phase).toBe('victorious');
    expect(result.money).toBe(moneyBefore + NORTHERN_HOST_REWARD_MONEY);
    expect(result.legacy.experiencePoints).toBeGreaterThanOrEqual(
      experienceBefore + NORTHERN_HOST_REWARD_EXPERIENCE,
    );
    expect(defendTown(result)).toBe(result);

    const reloaded = hydrateGameState(JSON.parse(JSON.stringify(result)), 0);
    expect(reloaded.expedition.phase).toBe('victorious');
    expect(reloaded.expedition.lastBattle?.nodeId).toBe('northern_host');
    const nextRun = startNextRun(reloaded, 20_000);
    expect(nextRun.legacy.runNumber).toBe(2);
    expect(nextRun.expedition.phase).toBe('exploring');
  });

  it('continues the point-of-no-return countdown while backgrounded or closed', () => {
    const state = buildBarracks();
    state.expedition.phase = 'invasion';
    state.expedition.invasionSecondsRemaining = 100;
    state.lastSavedAt = 1_000;

    const afterBackgroundGap = advanceWallClockState(state, 31_000, 1_000);
    expect(afterBackgroundGap.expedition.invasionSecondsRemaining).toBe(70);

    const afterReload = hydrateGameState(afterBackgroundGap, 111_000);
    expect(afterReload.expedition.phase).toBe('defeated');
    expect(afterReload.expedition.experienceEarnedThisRun).toBeGreaterThan(0);
  });

  it('awards Experience once, buys a permanent perk, and starts a faster new settlement', () => {
    let state = buildBarracks();
    state.expedition.phase = 'invasion';
    state.expedition.relicSecured = true;
    state.expedition.defeatedNodeIds = expeditionNodes.map((node) => node.id);
    state.resources.food = 1_000;
    state.resources.wood = 1_000;
    state.resources.tools = 1_000;

    state = prepareEvacuation(state);
    expect(state.expedition.evacuationPrepared).toBe(true);
    expect(state.resources.food).toBe(1_000 - (EVACUATION_COST.food ?? 0));
    state = evacuateTown(state);
    const earned = state.expedition.experienceEarnedThisRun;
    expect(state.expedition.phase).toBe('defeated');
    expect(earned).toBeGreaterThan(0);
    expect(evacuateTown(state)).toBe(state);

    state = buyExperiencePerk(state, 'pioneering_spirit');
    expect(state.legacy.perks.pioneering_spirit).toBe(1);
    const nextRun = startNextRun(state, 10_000);
    expect(nextRun.legacy.runNumber).toBe(2);
    expect(nextRun.workers.total).toBe(2);
    expect(nextRun.campaign.chapterId).toBe('arrival');
    expect(nextRun.expedition.barracksConstructed).toBe(false);
  });

  it('preserves expedition and legacy progress through save migration', () => {
    const state = buildBarracks();
    state.expedition.troops.guard = 3;
    state.legacy.experiencePoints = 7;
    state.legacy.perks.battle_wisdom = 2;

    const reloaded = hydrateGameState(JSON.parse(JSON.stringify(state)), 0);
    expect(reloaded.expedition.barracksConstructed).toBe(true);
    expect(reloaded.expedition.troops.guard).toBe(3);
    expect(reloaded.legacy.experiencePoints).toBe(7);
    expect(reloaded.legacy.perks.battle_wisdom).toBe(2);

    const migratedV2 = hydrateGameState({ ...state, expedition: undefined, legacy: undefined }, 0);
    expect(migratedV2.campaign.campaignComplete).toBe(true);
    expect(migratedV2.expedition.phase).toBe('exploring');
    expect(migratedV2.legacy.runNumber).toBe(1);
  });
});
