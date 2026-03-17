/**
 * src/game/ai/ai.worker.ts
 *
 * Web Worker wrapper for computeTurn.
 * Receives serialized GameState, runs AI computation off the main thread,
 * and posts back the resulting Action[].
 */

import { computeTurn } from './ai';
import type { GameState } from '../types';

self.addEventListener('message', (event: MessageEvent<GameState>) => {
  const state = event.data;
  const actions = computeTurn(state);
  self.postMessage(actions);
});
