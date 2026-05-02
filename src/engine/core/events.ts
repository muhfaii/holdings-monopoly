import type { PlayerId, PropertyId } from './state';

export type GameEvent =
  | { type: 'GAME_STARTED'; playerIds: PlayerId[] }
  | { type: 'NEW_GAME_RESET' }
  | { type: 'DICE_ROLLED'; playerId: PlayerId; die1: number; die2: number; doubles: boolean }
  | { type: 'PLAYER_MOVED'; playerId: PlayerId; from: number; to: number }
  | { type: 'PASSED_GO'; playerId: PlayerId; collected: number }
  | { type: 'PROPERTY_BOUGHT'; playerId: PlayerId; propertyId: PropertyId; price: number }
  | { type: 'AUCTION_WON'; playerId: PlayerId; propertyId: PropertyId; bid: number }
  | { type: 'RENT_PAID'; fromPlayerId: PlayerId; toPlayerId: PlayerId; propertyId: PropertyId; amount: number }
  | { type: 'TAX_PAID'; playerId: PlayerId; amount: number }
  | { type: 'KOPITIAM_COLLECTED'; playerId: PlayerId; amount: number }
  | { type: 'SENT_TO_JAIL'; playerId: PlayerId }
  | { type: 'JAIL_FINE_PAID'; playerId: PlayerId }
  | { type: 'JAIL_DOUBLES_ESCAPE'; playerId: PlayerId }
  | { type: 'JAIL_CARD_ESCAPE'; playerId: PlayerId }
  | { type: 'JAIL_TIME_SERVED'; playerId: PlayerId }
  | { type: 'PLAYER_BANKRUPT'; playerId: PlayerId; creditorId: PlayerId | null }
  | { type: 'GAME_ENDED'; winnerId: PlayerId }
  // ── Card events ─────────────────────────────────────────────────────────────
  | { type: 'CARD_DRAWN'; playerId: PlayerId; deckType: 'chance' | 'community-chest'; cardId: string; cardText: string }
  | { type: 'GOOJF_CARD_ACQUIRED'; playerId: PlayerId; deckType: 'chance' | 'community-chest' }
  | { type: 'DECK_RESHUFFLED'; deckType: 'chance' | 'community-chest' };
