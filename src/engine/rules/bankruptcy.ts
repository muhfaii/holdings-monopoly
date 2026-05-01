import type { GameState, PlayerId } from '../core/state';
import type { GameEvent } from '../core/events';
import { BOARD } from '../data/board';

export function detectBankruptcy(state: GameState, playerId: PlayerId): {
  isBankrupt: boolean;
  creditorId: PlayerId | null;
  debt: number;
} {
  const player = state.players[playerId];
  if (player.cash >= 0) return { isBankrupt: false, creditorId: null, debt: 0 };

  const debt = -player.cash;
  const possibleAssets = player.properties.length;

  // Check if player has liquidatable assets
  let totalPropertyValue = 0;
  for (const propId of player.properties) {
    const prop = state.properties[propId];
    const square = BOARD[propId];
    totalPropertyValue += Math.floor(square.price / 2); // mortgage value
  }

  if (totalPropertyValue >= debt) {
    // Can cover debt by mortgaging/selling — not bankrupt yet
    return { isBankrupt: false, creditorId: null, debt: 0 };
  }

  return { isBankrupt: true, creditorId: null, debt: -player.cash };
}

export function liquidateAssets(
  state: GameState,
  playerId: PlayerId,
  creditorId: PlayerId | null,
): { events: GameEvent[] } {
  const events: GameEvent[] = [];
  events.push({ type: 'PLAYER_BANKRUPT', playerId, creditorId });

  return { events };
}
