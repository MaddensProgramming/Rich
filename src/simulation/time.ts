import { addOfflineCharge } from './gameState';
import { tickGame } from './tick';
import { advanceInvasionInPlace } from './expedition';
import type { GameState } from './types';
import { asFiniteNumber, clamp } from './utils';

export const ACTIVE_GAP_OFFLINE_THRESHOLD_SECONDS = 5;

export const advanceWallClockState = (
  state: GameState,
  nowMs: number,
  previousNowMs: number,
): GameState => {
  const elapsedSeconds = clamp((nowMs - previousNowMs) / 1000, 0, 60 * 60 * 24);

  if (elapsedSeconds <= 0) {
    return state;
  }

  if (elapsedSeconds > ACTIVE_GAP_OFFLINE_THRESHOLD_SECONDS) {
    const next = addOfflineCharge(state, elapsedSeconds);
    advanceInvasionInPlace(next, elapsedSeconds);
    return next;
  }

  return tickGame(state, asFiniteNumber(elapsedSeconds, 0));
};
