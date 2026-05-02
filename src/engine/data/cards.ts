/**
 * Card definitions for Chance and Community Chest decks.
 * Based on US Classic Monopoly (2008–2021) adapted for Holdings: KL Edition.
 *
 * Array index = card index stored in DeckState drawPile / discardPile.
 */

export type CardEffect =
  | { type: 'ADVANCE_TO'; slot: number }
  | { type: 'ADVANCE_TO_NEAREST'; category: 'railroad' | 'utility' }
  | { type: 'GO_BACK'; spaces: number }
  | { type: 'COLLECT_BANK'; amount: number }
  | { type: 'COLLECT_PLAYERS'; amount: number }
  | { type: 'PAY_BANK'; amount: number }
  | { type: 'PAY_PLAYERS'; amount: number }
  | { type: 'PAY_PER_BUILDING'; perHouse: number; perHotel: number }
  | { type: 'GO_TO_JAIL' }
  | { type: 'GET_OUT_OF_JAIL' };

export interface CardDefinition {
  /** e.g. "C01", "CC14" */
  id: string;
  /** Display text shown to the player */
  text: string;
  effect: CardEffect;
}

// ── Chance cards (16) ────────────────────────────────────────────────────────
// GO_TO_GO (C02, CC01) is represented as ADVANCE_TO slot 0.
// Moving forward to slot 0 always crosses GO and collects $200.

export const CHANCE_CARDS: CardDefinition[] = [
  {
    id: 'C01',
    text: 'Advance to KLCC.',
    effect: { type: 'ADVANCE_TO', slot: 39 },
  },
  {
    id: 'C02',
    text: 'Advance to GO. Collect $200.',
    effect: { type: 'ADVANCE_TO', slot: 0 },
  },
  {
    id: 'C03',
    text: 'Advance to Mid Valley. If you pass GO, collect $200.',
    effect: { type: 'ADVANCE_TO', slot: 24 },
  },
  {
    id: 'C04',
    text: 'Advance to Old Klang Road. If you pass GO, collect $200.',
    effect: { type: 'ADVANCE_TO', slot: 11 },
  },
  {
    id: 'C05',
    text: 'Advance to the nearest Railroad. If unowned, you may buy it from the Bank. If owned, pay the owner twice the rental to which they are otherwise entitled.',
    effect: { type: 'ADVANCE_TO_NEAREST', category: 'railroad' },
  },
  {
    id: 'C06',
    text: 'Advance to the nearest Railroad. If unowned, you may buy it from the Bank. If owned, pay the owner twice the rental to which they are otherwise entitled.',
    effect: { type: 'ADVANCE_TO_NEAREST', category: 'railroad' },
  },
  {
    id: 'C07',
    text: 'Advance token to the nearest Utility. If unowned, you may buy it from the Bank. If owned, throw the dice and pay the owner ten times the amount thrown.',
    effect: { type: 'ADVANCE_TO_NEAREST', category: 'utility' },
  },
  {
    id: 'C08',
    text: 'Bank pays you a dividend of $50.',
    effect: { type: 'COLLECT_BANK', amount: 50 },
  },
  {
    id: 'C09',
    text: 'Get Out of Jail Free. Keep this card until needed, then use it or trade it.',
    effect: { type: 'GET_OUT_OF_JAIL' },
  },
  {
    id: 'C10',
    text: 'Go Back 3 Spaces.',
    effect: { type: 'GO_BACK', spaces: 3 },
  },
  {
    id: 'C11',
    text: 'Go to Jail. Go directly to Jail. Do not pass GO. Do not collect $200.',
    effect: { type: 'GO_TO_JAIL' },
  },
  {
    id: 'C12',
    text: 'Make general repairs on all your properties. For each house pay $25. For each hotel pay $100.',
    effect: { type: 'PAY_PER_BUILDING', perHouse: 25, perHotel: 100 },
  },
  {
    id: 'C13',
    text: 'Speeding fine. Pay $15.',
    effect: { type: 'PAY_BANK', amount: 15 },
  },
  {
    id: 'C14',
    text: 'Take a trip to KL Sentral. If you pass GO, collect $200.',
    effect: { type: 'ADVANCE_TO', slot: 5 },
  },
  {
    id: 'C15',
    text: 'You have been elected Chairman of the Board. Pay each player $50.',
    effect: { type: 'PAY_PLAYERS', amount: 50 },
  },
  {
    id: 'C16',
    text: 'Your building loan matures. Collect $150.',
    effect: { type: 'COLLECT_BANK', amount: 150 },
  },
];

// ── Community Chest cards (16) ───────────────────────────────────────────────

export const COMMUNITY_CHEST_CARDS: CardDefinition[] = [
  {
    id: 'CC01',
    text: 'Advance to GO. Collect $200.',
    effect: { type: 'ADVANCE_TO', slot: 0 },
  },
  {
    id: 'CC02',
    text: 'Bank error in your favor. Collect $200.',
    effect: { type: 'COLLECT_BANK', amount: 200 },
  },
  {
    id: 'CC03',
    text: "Doctor's fee. Pay $50.",
    effect: { type: 'PAY_BANK', amount: 50 },
  },
  {
    id: 'CC04',
    text: 'From sale of stock you get $50.',
    effect: { type: 'COLLECT_BANK', amount: 50 },
  },
  {
    id: 'CC05',
    text: 'Get Out of Jail Free. Keep this card until needed, then use it or trade it.',
    effect: { type: 'GET_OUT_OF_JAIL' },
  },
  {
    id: 'CC06',
    text: 'Go to Jail. Go directly to Jail. Do not pass GO. Do not collect $200.',
    effect: { type: 'GO_TO_JAIL' },
  },
  {
    id: 'CC07',
    text: 'Holiday fund matures. Receive $100.',
    effect: { type: 'COLLECT_BANK', amount: 100 },
  },
  {
    id: 'CC08',
    text: 'Income tax refund. Collect $20.',
    effect: { type: 'COLLECT_BANK', amount: 20 },
  },
  {
    id: 'CC09',
    text: 'It is your birthday. Collect $10 from every player.',
    effect: { type: 'COLLECT_PLAYERS', amount: 10 },
  },
  {
    id: 'CC10',
    text: 'Life insurance matures. Collect $100.',
    effect: { type: 'COLLECT_BANK', amount: 100 },
  },
  {
    id: 'CC11',
    text: 'Pay hospital fees of $100.',
    effect: { type: 'PAY_BANK', amount: 100 },
  },
  {
    id: 'CC12',
    text: 'Pay school fees of $50.',
    effect: { type: 'PAY_BANK', amount: 50 },
  },
  {
    id: 'CC13',
    text: 'Receive $25 consultancy fee.',
    effect: { type: 'COLLECT_BANK', amount: 25 },
  },
  {
    id: 'CC14',
    text: 'You are assessed for street repair. $40 per house. $115 per hotel.',
    effect: { type: 'PAY_PER_BUILDING', perHouse: 40, perHotel: 115 },
  },
  {
    id: 'CC15',
    text: 'You have won second prize in a beauty contest. Collect $10.',
    effect: { type: 'COLLECT_BANK', amount: 10 },
  },
  {
    id: 'CC16',
    text: 'You inherit $100.',
    effect: { type: 'COLLECT_BANK', amount: 100 },
  },
];

// ── Constants ────────────────────────────────────────────────────────────────

/** Board slots that are railroads, in ascending order. */
export const RAILROAD_SLOTS = [5, 15, 25, 35] as const;

/** Board slots that are utilities, in ascending order. */
export const UTILITY_SLOTS = [12, 28] as const;

/** Index of the GET_OUT_OF_JAIL card within CHANCE_CARDS (C09). */
export const CHANCE_GOOJF_INDEX = 8;

/** Index of the GET_OUT_OF_JAIL card within COMMUNITY_CHEST_CARDS (CC05). */
export const COMMUNITY_CHEST_GOOJF_INDEX = 4;
