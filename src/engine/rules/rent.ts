import type { GameState, PlayerId, PropertyId } from '../core/state';
import type { GameEvent } from '../core/events';
import { BOARD, RAILROAD_RENT } from '../data/board';

export interface RentCharges {
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  propertyId: PropertyId;
  amount: number;
}

export function calculateRent(
  state: GameState,
  landerId: PlayerId,
  propertyId: PropertyId,
  diceTotal: number,
): { charges: RentCharges[]; error?: string } {
  const property = state.properties[propertyId];
  const square = BOARD[propertyId];

  if (!property.ownerId) return { charges: [], error: 'Property has no owner' };
  if (property.ownerId === landerId) return { charges: [] };
  if (property.mortgaged) return { charges: [] };

  const ownerId = property.ownerId;

  if (square.type === 'railroad') {
    const railroadCount = countOwnedRailroads(state, ownerId);
    const amount = RAILROAD_RENT[railroadCount - 1] || 0;
    return { charges: [{ fromPlayerId: landerId, toPlayerId: ownerId, propertyId, amount }] };
  }

  if (square.type === 'utility') {
    const utilityCount = countOwnedUtilities(state, ownerId);
    const multiplier = utilityCount === 2 ? 10 : 4;
    return { charges: [{ fromPlayerId: landerId, toPlayerId: ownerId, propertyId, amount: diceTotal * multiplier }] };
  }

  // Standard property
  const rentLevel = property.houses === 0
    ? hasMonopoly(state, ownerId, square.group!) ? 1 : 0
    : property.houses + 1;

  const amount = square.rentLadder![rentLevel];
  return { charges: [{ fromPlayerId: landerId, toPlayerId: ownerId, propertyId, amount }] };
}

function countOwnedRailroads(state: GameState, ownerId: PlayerId): number {
  return Object.values(state.properties).filter(
    p => p.ownerId === ownerId && BOARD[p.id].type === 'railroad',
  ).length;
}

function countOwnedUtilities(state: GameState, ownerId: PlayerId): number {
  return Object.values(state.properties).filter(
    p => p.ownerId === ownerId && BOARD[p.id].type === 'utility',
  ).length;
}

function hasMonopoly(state: GameState, ownerId: PlayerId, group: string): boolean {
  const groupProperties = BOARD.filter(s => s.group === group);
  return groupProperties.every(s => {
    const p = state.properties[s.id];
    return p.ownerId === ownerId;
  });
}
