import type { GameState, PlayerId, Decision } from '../core/state';
import type { GameEvent } from '../core/events';
import { JAIL_FINE, JAIL_SQUARE } from '../data/board';

export function makeJailDecision(playerId: PlayerId): Decision {
  return { type: 'AWAIT_JAIL_DECISION', playerId };
}

export function payJailFine(
  state: GameState,
  playerId: PlayerId,
): { events: GameEvent[]; error?: string } {
  const player = state.players[playerId];
  if (player.cash < JAIL_FINE) return { events: [], error: 'Cannot afford jail fine' };
  return { events: [{ type: 'JAIL_FINE_PAID', playerId }] };
}

export function useGetOutOfJailCard(
  state: GameState,
  playerId: PlayerId,
): { events: GameEvent[]; error?: string } {
  const player = state.players[playerId];
  if (player.getOutOfJailCards <= 0) return { events: [], error: 'No Get Out of Jail Free card' };
  return { events: [{ type: 'JAIL_CARD_ESCAPE', playerId }] };
}

export function checkJailExpiry(state: GameState, playerId: PlayerId): {
  events: GameEvent[];
  mustPay: boolean;
} {
  const player = state.players[playerId];
  if (player.jailTurns < 2) return { events: [], mustPay: false };

  if (player.cash >= JAIL_FINE) {
    return { events: [{ type: 'JAIL_TIME_SERVED', playerId }], mustPay: true };
  }
  // Can't pay — triggers bankruptcy
  return { events: [], mustPay: true };
}
