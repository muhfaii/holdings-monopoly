/**
 * Card effect resolution logic.
 * All functions are pure — they return new state + events, never mutate.
 */

import type { GameState, PlayerId } from '../core/state';
import type { GameEvent } from '../core/events';
import type { CardDefinition } from '../data/cards';
import { RAILROAD_SLOTS, UTILITY_SLOTS } from '../data/cards';
import { BOARD_SIZE, JAIL_SQUARE, GO_SALARY } from '../data/board';
import { createRNG } from '../rng';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CardResolution {
  state: GameState;
  events: GameEvent[];
  /**
   * True when the card moved the player to a new square.
   * The reducer must run landing logic for the new position after the player
   * acknowledges the card.
   */
  triggerLanding: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyCashChange(state: GameState, playerId: PlayerId, delta: number): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        cash: state.players[playerId].cash + delta,
      },
    },
  };
}

function addToKopitiam(state: GameState, amount: number): GameState {
  return { ...state, kopitiamPot: state.kopitiamPot + amount };
}

/**
 * Move player to `toSlot`, check if they passed GO, and award GO salary if so.
 * Does NOT resolve the landing square — that happens after ACKNOWLEDGE_CARD.
 */
function movePlayer(
  state: GameState,
  playerId: PlayerId,
  toSlot: number,
  events: GameEvent[],
  collectOnPassGo: boolean,
): GameState {
  const from = state.players[playerId].position;
  let newState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...state.players[playerId], position: toSlot },
    },
  };

  events.push({ type: 'PLAYER_MOVED', playerId, from, to: toSlot });

  // Player passes GO when the destination is at or behind the origin
  // AND the origin is not already GO (i.e. they genuinely moved forward).
  // Special case: moving TO slot 0 always crosses GO.
  const passedGo = collectOnPassGo && (toSlot === 0 || (from !== 0 && toSlot < from));
  if (passedGo) {
    newState = applyCashChange(newState, playerId, GO_SALARY);
    // Also increment laps counter
    newState = {
      ...newState,
      players: {
        ...newState.players,
        [playerId]: {
          ...newState.players[playerId],
          laps: newState.players[playerId].laps + 1,
        },
      },
    };
    events.push({ type: 'PASSED_GO', playerId, collected: GO_SALARY });
  }

  return newState;
}

/**
 * Find the nearest slot of a given set AHEAD of `currentPosition`.
 * "Ahead" means the next slot in increasing board order, wrapping around.
 * If the player is already on one of the slots, the NEXT one ahead is returned.
 */
function findNearestSlotAhead(currentPosition: number, slots: readonly number[]): number {
  for (const slot of slots) {
    if (slot > currentPosition) return slot;
  }
  // Wrap around: return the first slot
  return slots[0];
}

// ── Main resolver ────────────────────────────────────────────────────────────

/**
 * Resolve a card effect immediately when drawn.
 *
 * Movement cards (ADVANCE_TO, ADVANCE_TO_NEAREST, GO_BACK, GO_TO_JAIL) move
 * the player but do NOT trigger landing logic — that runs after the player
 * acknowledges the card modal (ACKNOWLEDGE_CARD action in the reducer).
 *
 * Cash cards (COLLECT_BANK, PAY_BANK, etc.) are resolved fully here; the
 * acknowledgement step just dismisses the modal.
 */
export function resolveCard(
  state: GameState,
  playerId: PlayerId,
  card: CardDefinition,
): CardResolution {
  const events: GameEvent[] = [];
  let newState = state;
  const effect = card.effect;

  switch (effect.type) {

    // ── Movement cards ─────────────────────────────────────────────────────

    case 'ADVANCE_TO': {
      newState = movePlayer(newState, playerId, effect.slot, events, true);
      return { state: newState, events, triggerLanding: true };
    }

    case 'ADVANCE_TO_NEAREST': {
      const slots = effect.category === 'railroad' ? RAILROAD_SLOTS : UTILITY_SLOTS;
      const targetSlot = findNearestSlotAhead(newState.players[playerId].position, slots);
      newState = movePlayer(newState, playerId, targetSlot, events, true);
      // Rent override is set by the reducer via cardRentOverride on TurnState
      return { state: newState, events, triggerLanding: true };
    }

    case 'GO_BACK': {
      const from = newState.players[playerId].position;
      const to = (from - effect.spaces + BOARD_SIZE) % BOARD_SIZE;
      // GO_BACK never awards GO salary — pass collectOnPassGo = false
      newState = movePlayer(newState, playerId, to, events, false);
      return { state: newState, events, triggerLanding: true };
    }

    case 'GO_TO_JAIL': {
      const from = newState.players[playerId].position;
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            position: JAIL_SQUARE,
            inJail: true,
            jailTurns: 0,
          },
        },
      };
      events.push({ type: 'PLAYER_MOVED', playerId, from, to: JAIL_SQUARE });
      events.push({ type: 'SENT_TO_JAIL', playerId });
      // GO_TO_JAIL does not trigger normal landing logic — Jail is a special square.
      return { state: newState, events, triggerLanding: false };
    }

    // ── Cash cards ─────────────────────────────────────────────────────────

    case 'COLLECT_BANK': {
      newState = applyCashChange(newState, playerId, effect.amount);
      return { state: newState, events, triggerLanding: false };
    }

    case 'PAY_BANK': {
      newState = applyCashChange(newState, playerId, -effect.amount);
      newState = addToKopitiam(newState, effect.amount);
      return { state: newState, events, triggerLanding: false };
    }

    case 'PAY_PER_BUILDING': {
      const player = newState.players[playerId];
      let houseCount = 0;
      let hotelCount = 0;
      for (const propId of player.properties) {
        const prop = newState.properties[propId];
        if (prop.houses >= 1 && prop.houses <= 4) houseCount += prop.houses;
        else if (prop.houses === 5) hotelCount += 1;
      }
      const total = houseCount * effect.perHouse + hotelCount * effect.perHotel;
      if (total > 0) {
        newState = applyCashChange(newState, playerId, -total);
        newState = addToKopitiam(newState, total);
      }
      return { state: newState, events, triggerLanding: false };
    }

    case 'COLLECT_PLAYERS': {
      // Collect `amount` from each non-bankrupt other player
      const otherPlayers = Object.values(newState.players).filter(
        p => p.id !== playerId && !p.bankrupt,
      );
      for (const other of otherPlayers) {
        newState = applyCashChange(newState, other.id, -effect.amount);
        newState = applyCashChange(newState, playerId, effect.amount);
      }
      return { state: newState, events, triggerLanding: false };
    }

    case 'PAY_PLAYERS': {
      // Pay `amount` to each non-bankrupt other player
      const otherPlayers = Object.values(newState.players).filter(
        p => p.id !== playerId && !p.bankrupt,
      );
      for (const other of otherPlayers) {
        newState = applyCashChange(newState, playerId, -effect.amount);
        newState = applyCashChange(newState, other.id, effect.amount);
      }
      return { state: newState, events, triggerLanding: false };
    }

    case 'GET_OUT_OF_JAIL': {
      // Increment card count and push source deck; deck management is handled
      // by the reducer (card is not discarded — it leaves the deck entirely).
      // The deckType is passed in via the reducer when it calls resolveCard.
      // We use the rngSeedOffset parameter as a proxy for deck type: the
      // reducer sets this differently per deck. Instead, the reducer adds the
      // source directly after this call — see reducer for the pattern.
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: {
            ...newState.players[playerId],
            getOutOfJailCards: newState.players[playerId].getOutOfJailCards + 1,
          },
        },
      };
      return { state: newState, events, triggerLanding: false };
    }
  }
}

/**
 * Roll two dice using a seeded RNG and return results.
 * Used for the ADVANCE_TO_NEAREST utility rent calculation (10× dice total).
 */
export function rollDiceForUtility(rngSeed: number): { die1: number; die2: number; total: number } {
  const rng = createRNG(rngSeed);
  const die1 = Math.floor(rng() * 6) + 1;
  const die2 = Math.floor(rng() * 6) + 1;
  return { die1, die2, total: die1 + die2 };
}

/**
 * Return the nearest-ahead slot from a set of candidate slots.
 * Exported for use in the reducer's ACKNOWLEDGE_CARD handler.
 */
export { findNearestSlotAhead };
