/**
 * Deck management utilities.
 * All functions are pure — they take and return immutable values.
 */

import type { DeckState } from '../core/state';

/**
 * Fisher-Yates shuffle using a seeded RNG function.
 * Returns a new array; does not mutate the input.
 */
export function shuffleWithRNG(items: number[], rng: () => number): number[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Create a freshly shuffled deck of `size` cards (indices 0..size-1)
 * using a seeded RNG function.
 */
export function createSeededDeck(size: number, rng: () => number): DeckState {
  const cards = Array.from({ length: size }, (_, i) => i);
  return { drawPile: shuffleWithRNG(cards, rng), discardPile: [] };
}

/**
 * Draw the top card from the deck.
 *
 * If the draw pile is empty, the discard pile is reshuffled (excluding any
 * card indices in `heldGoojfIndices`) to form a new draw pile.
 *
 * Returns the drawn card index and the updated DeckState.
 * The caller is responsible for deciding whether to discard the card
 * (GET_OUT_OF_JAIL cards are not discarded — they go to the player's hand).
 */
export function drawCard(
  deck: DeckState,
  rng: () => number,
  heldGoojfIndices: number[],
): { cardIndex: number; deck: DeckState } {
  let { drawPile, discardPile } = deck;

  if (drawPile.length === 0) {
    // Reshuffle the discard pile, excluding held GOOJF cards
    const reshufflePool = discardPile.filter(i => !heldGoojfIndices.includes(i));
    drawPile = shuffleWithRNG(reshufflePool, rng);
    discardPile = [];
  }

  const cardIndex = drawPile[0];
  const newDrawPile = drawPile.slice(1);

  return {
    cardIndex,
    deck: { drawPile: newDrawPile, discardPile },
  };
}

/**
 * Discard a card back into the deck's discard pile.
 * Used when a GET_OUT_OF_JAIL card is consumed (used to escape jail).
 */
export function returnCardToDiscard(deck: DeckState, cardIndex: number): DeckState {
  return { ...deck, discardPile: [...deck.discardPile, cardIndex] };
}

/**
 * Discard a drawn card (non-GOOJF cards go here after resolution).
 */
export function discardCard(deck: DeckState, cardIndex: number): DeckState {
  return { ...deck, discardPile: [...deck.discardPile, cardIndex] };
}
