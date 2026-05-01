import type { GameEvent } from './events';

export type PlayerId = string;
export type PropertyId = number;

export type ColorGroup =
  | 'brown'
  | 'light-blue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'dark-blue';

export type SquareType =
  | 'property'
  | 'railroad'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'community-chest'
  | 'go'
  | 'jail'
  | 'kopitiam'
  | 'go-to-jail';

export interface Square {
  id: number;
  name: string;
  type: SquareType;
  price: number;
  group?: ColorGroup;
  rentLadder?: number[];
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  isAI: boolean;
  cash: number;
  position: number;
  /** Number of GO laps completed */
  laps: number;
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  properties: PropertyId[];
  bankrupt: boolean;
}

export interface PropertyState {
  id: PropertyId;
  houses: number; // 0-4 houses, 5 = hotel
  mortgaged: boolean;
  ownerId: PlayerId | null;
}

export type GamePhase = 'setup' | 'active' | 'ended';

export type Decision =
  | { type: 'AWAIT_BUY_DECISION'; playerId: PlayerId; propertyId: PropertyId }
  | { type: 'AWAIT_AUCTION_BID'; propertyId: PropertyId; eligiblePlayerIds: PlayerId[]; currentBid: number; currentBidderId: PlayerId | null; passedPlayerIds: PlayerId[] }
  | { type: 'AWAIT_JAIL_DECISION'; playerId: PlayerId }
  | { type: 'AWAIT_BANKRUPTCY_LIQUIDATION'; playerId: PlayerId; creditorId: PlayerId | null; debt: number };

export interface TurnState {
  currentPlayerId: PlayerId;
  playerOrder: PlayerId[];
  playerIndex: number;
  doublesCount: number;
  pendingDecision: Decision | null;
  /** True once the current player has rolled at least once this turn */
  hasRolledThisTurn: boolean;
  /** True if the roll this turn was a jail roll (doubles from jail = no bonus roll) */
  jailRoll: boolean;
}

export interface DeckState {
  drawPile: number[];
  discardPile: number[];
}

export interface GameState {
  version: number;
  rngSeed: number;
  phase: GamePhase;
  players: Record<PlayerId, PlayerState>;
  properties: Record<PropertyId, PropertyState>;
  turn: TurnState;
  kopitiamPot: number;
  chanceDeck: DeckState;
  communityChestDeck: DeckState;
  history: GameEvent[];
  winner: PlayerId | null;
}
