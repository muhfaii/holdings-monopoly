import type { PlayerId, PropertyId, GameState, Decision } from './state';
import type { GameEvent } from './events';

export type Action =
  | { type: 'START_GAME'; players: Array<{ name: string; isAI: boolean }> }
  | { type: 'NEW_GAME' }
  | { type: 'ROLL_DICE' }
  | { type: 'BUY_PROPERTY' }
  | { type: 'DECLINE_PURCHASE' }
  | { type: 'START_AUCTION' }
  | { type: 'PLACE_BID'; playerId: PlayerId; amount: number }
  | { type: 'PASS_BID' }
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'END_TURN' }
  | { type: 'RESOLVE_BANKRUPTCY_DEBT' }
  | { type: 'RESOLVE_BANKRUPTCY_ASSETS' };

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
  errors?: string[];
}
