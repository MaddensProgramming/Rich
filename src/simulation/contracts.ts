import { chapterIds } from '../data/chapterProjects';
import { contractById, contracts } from '../data/contracts';
import type { ContractDefinition, GameState } from './types';
import { canAffordResources, cloneGameState, spendResources } from './utils';

const chapterOrder = (chapterId: GameState['campaign']['chapterId']) => chapterIds.indexOf(chapterId);

export const maxAvailableContracts = 2;

export const isContractUnlocked = (state: GameState, contract: ContractDefinition) =>
  Boolean(state.campaign.unlockedSystems.contracts) &&
  chapterOrder(state.campaign.chapterId) >= chapterOrder(contract.minChapterId);

export const getAvailableContracts = (state: GameState): ContractDefinition[] =>
  contracts.filter(
    (contract) =>
      isContractUnlocked(state, contract) &&
      !state.campaign.activeContractIds.includes(contract.id) &&
      !state.campaign.completedContractIds.includes(contract.id),
  ).slice(0, maxAvailableContracts);

export const getActiveContracts = (state: GameState): ContractDefinition[] =>
  state.campaign.activeContractIds
    .map((id) => contractById[id])
    .filter((contract): contract is ContractDefinition => Boolean(contract));

export const canAcceptContract = (state: GameState, contractId: string) => {
  return getAvailableContracts(state).some((availableContract) => availableContract.id === contractId);
};

export const acceptContract = (state: GameState, contractId: string): GameState => {
  if (!canAcceptContract(state, contractId)) {
    return state;
  }

  const next = cloneGameState(state);
  next.campaign.activeContractIds = [...next.campaign.activeContractIds, contractId];
  return next;
};

export const abandonContract = (state: GameState, contractId: string): GameState => {
  if (!state.campaign.activeContractIds.includes(contractId)) {
    return state;
  }

  const next = cloneGameState(state);
  next.campaign.activeContractIds = next.campaign.activeContractIds.filter((id) => id !== contractId);
  return next;
};

export const canCompleteContract = (state: GameState, contractId: string) => {
  const contract = contractById[contractId];
  return Boolean(contract) &&
    state.campaign.activeContractIds.includes(contractId) &&
    canAffordResources(state.resources, contract.requiredResources);
};

export const completeContract = (state: GameState, contractId: string): GameState => {
  if (!canCompleteContract(state, contractId)) {
    return state;
  }

  const contract = contractById[contractId];
  const next = cloneGameState(state);
  if (!spendResources(next.resources, contract.requiredResources)) {
    return state;
  }

  next.money += contract.rewardMoney;
  for (const reward of contract.rewardBooks ?? []) {
    const key = `${reward.bookId}:${reward.rarity}` as const;
    next.books.owned[key] = (next.books.owned[key] ?? 0) + reward.count;
  }

  next.campaign.activeContractIds = next.campaign.activeContractIds.filter((id) => id !== contractId);
  next.campaign.completedContractIds = Array.from(
    new Set([...next.campaign.completedContractIds, contractId]),
  );
  return next;
};
