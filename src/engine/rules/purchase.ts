import type { GameState, PlayerId, PropertyId } from '../core/state';
import type { GameEvent } from '../core/events';
import { BOARD } from '../data/board';

export function canAfford(playerCash: number, price: number): boolean {
  return playerCash >= price;
}

export function buyProperty(
  state: GameState,
  playerId: PlayerId,
  propertyId: PropertyId,
): { events: GameEvent[]; error?: string } {
  const player = state.players[playerId];
  const property = state.properties[propertyId];
  const square = BOARD[propertyId];

  if (property.ownerId !== null) return { events: [], error: 'Property is already owned' };
  if (player.cash < square.price) return { events: [], error: 'Cannot afford property' };

  return {
    events: [{ type: 'PROPERTY_BOUGHT', playerId, propertyId, price: square.price }],
  };
}

export interface AuctionState {
  eligiblePlayerIds: PlayerId[];
  currentBid: number;
  currentBidderId: PlayerId | null;
  passedPlayerIds: PlayerId[];
  currentBidderIndex: number;
}

export function initAuction(state: GameState, propertyId: PropertyId): AuctionState {
  const eligible = Object.values(state.players)
    .filter(p => !p.bankrupt)
    .map(p => p.id);

  return {
    eligiblePlayerIds: eligible,
    currentBid: 0,
    currentBidderId: null,
    passedPlayerIds: [],
    currentBidderIndex: 0,
  };
}

export function getNextBidder(auction: AuctionState): PlayerId | null {
  while (auction.currentBidderIndex < auction.eligiblePlayerIds.length) {
    const next = auction.eligiblePlayerIds[auction.currentBidderIndex];
    if (!auction.passedPlayerIds.includes(next)) return next;
    auction.currentBidderIndex++;
  }
  return null;
}

export function placeBid(
  state: GameState,
  auction: AuctionState,
  bidderId: PlayerId,
  amount: number,
): { events: GameEvent[]; error?: string; newAuction: AuctionState } {
  const player = state.players[bidderId];
  if (amount <= auction.currentBid) return { events: [], error: 'Bid must be higher than current bid', newAuction: auction };
  if (player.cash < amount) return { events: [], error: 'Cannot afford bid', newAuction: auction };

  const newAuction = {
    ...auction,
    currentBid: amount,
    currentBidderId: bidderId,
    currentBidderIndex: auction.currentBidderIndex + 1,
  };

  return { events: [], newAuction };
}

export function passBid(auction: AuctionState, playerId: PlayerId): { newAuction: AuctionState; winner: PlayerId | null } {
  const newAuction = {
    ...auction,
    passedPlayerIds: [...auction.passedPlayerIds, playerId],
    currentBidderIndex: auction.currentBidderIndex + 1,
  };

  const activeBidders = auction.eligiblePlayerIds.filter(id => !newAuction.passedPlayerIds.includes(id));
  if (activeBidders.length === 0) {
    return { newAuction, winner: auction.currentBidderId };
  }
  if (activeBidders.length === 1 && auction.currentBidderId === null) {
    return { newAuction, winner: activeBidders[0] };
  }
  return { newAuction, winner: null };
}
