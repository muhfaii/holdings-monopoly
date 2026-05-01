import type { GameState, PlayerId } from '../core/state';
import type { GameEvent } from '../core/events';
import { createRNG } from '../rng';
import { BOARD_SIZE, GO_SALARY, GO_TO_JAIL_SQUARE, JAIL_SQUARE } from '../data/board';

export interface MoveResult {
  playerId: PlayerId;
  die1: number;
  die2: number;
  from: number;
  to: number;
  passedGo: boolean;
  sentToJail: boolean;
}

export function rollAndMove(state: GameState, playerId: PlayerId): {
  result: MoveResult;
  events: GameEvent[];
} {
  const rng = createRNG(state.rngSeed + state.history.length);
  const die1 = Math.floor(rng() * 6) + 1;
  const die2 = Math.floor(rng() * 6) + 1;
  const doubles = die1 === die2;

  const player = state.players[playerId];
  const from = player.position;

  const events: GameEvent[] = [];
  events.push({ type: 'DICE_ROLLED', playerId, die1, die2, doubles });

  if (player.inJail) {
    return handleJailRoll(state, playerId, die1, die2, doubles, events);
  }

  // 3 doubles in a row = jail
  if (doubles) {
    const newDoubles = state.turn.doublesCount + 1;
    if (newDoubles >= 3) {
      events.push({ type: 'SENT_TO_JAIL', playerId });
      return {
        result: { playerId, die1, die2, from, to: JAIL_SQUARE, passedGo: false, sentToJail: true },
        events,
      };
    }
  }

  const total = die1 + die2;
  const to = (from + total) % BOARD_SIZE;
  const passedGo = from + total >= BOARD_SIZE;

  if (passedGo) {
    events.push({ type: 'PASSED_GO', playerId, collected: GO_SALARY });
  }

  events.push({ type: 'PLAYER_MOVED', playerId, from, to });

  // Check Go to Jail square
  const finalSentToJail = to === GO_TO_JAIL_SQUARE;
  if (finalSentToJail) {
    events.push({ type: 'SENT_TO_JAIL', playerId });
  }

  return {
    result: {
      playerId,
      die1,
      die2,
      from,
      to: finalSentToJail ? JAIL_SQUARE : to,
      passedGo,
      sentToJail: finalSentToJail,
    },
    events,
  };
}

function handleJailRoll(
  state: GameState,
  playerId: PlayerId,
  die1: number,
  die2: number,
  doubles: boolean,
  events: GameEvent[],
): { result: MoveResult; events: GameEvent[] } {
  const player = state.players[playerId];
  const from = player.position;

  if (doubles) {
    events.push({ type: 'JAIL_DOUBLES_ESCAPE', playerId });
    const to = (from + die1 + die2) % BOARD_SIZE;
    events.push({ type: 'PLAYER_MOVED', playerId, from, to });
    return {
      result: { playerId, die1, die2, from, to, passedGo: false, sentToJail: false },
      events,
    };
  }

  return {
    result: { playerId, die1, die2, from, to: from, passedGo: false, sentToJail: false },
    events,
  };
}
