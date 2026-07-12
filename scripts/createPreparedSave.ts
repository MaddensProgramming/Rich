import { writeFileSync } from 'node:fs';
import { buildingIds } from '../src/data/buildings';
import { books, rarities } from '../src/data/books';
import { createInitialGameState, prepareGameStateForSave } from '../src/simulation';

const now = Date.now();
const state = createInitialGameState(now);

state.campaign.chapterId = 'mountain_town';
state.campaign.campaignComplete = true;
state.campaign.completedUpgradeProjectIds = [
  'arrival_upgrade_to_hamlet',
  'hamlet_upgrade_to_village',
  'village_upgrade_to_mountain_town',
  'great_hall',
];
state.campaign.unlockedSystems = {
  construction: true,
  manualGather: true,
  market: true,
  library: true,
  offlineBoost: true,
  contracts: true,
};
state.campaign.seenStorySegments = ['arrival', 'hamlet', 'village', 'mountain_town'];
state.workers.total = 30;
state.workers.housingCapacity = 40;
state.money = 100_000;

for (const buildingId of buildingIds) {
  state.campaign.constructedBuildings[buildingId] = true;
  state.buildings[buildingId].level = 5;
  state.buildings[buildingId].workers = 0;
}

for (const book of books) {
  for (const rarity of rarities) {
    state.books.owned[`${book.id}:${rarity}`] = 25;
  }
}

const prepared = prepareGameStateForSave(state, now);
writeFileSync('st-moritz-great-hall-save.json', `${JSON.stringify(prepared, null, 2)}\n`);
console.log('Created st-moritz-great-hall-save.json');
