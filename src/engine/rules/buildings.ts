/**
 * House & hotel building validation helpers.
 * All functions are pure — they read state and return a result, never mutate.
 */

import type { GameState, PlayerId, PropertyId, ColorGroup } from '../core/state';
import { BOARD } from '../data/board';

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Return all property IDs that belong to `group` on the board.
 */
function groupPropertyIds(group: ColorGroup): PropertyId[] {
  return BOARD
    .filter(sq => sq.type === 'property' && sq.group === group)
    .map(sq => sq.id);
}

/**
 * True when `playerId` owns every property in `group`.
 */
function ownsMonopoly(state: GameState, playerId: PlayerId, group: ColorGroup): boolean {
  const ids = groupPropertyIds(group);
  return ids.length > 0 && ids.every(id => state.properties[id]?.ownerId === playerId);
}

/**
 * True when any property in the group is mortgaged.
 */
function groupHasMortgage(state: GameState, group: ColorGroup): boolean {
  return groupPropertyIds(group).some(id => state.properties[id]?.mortgaged);
}

/**
 * Return house counts for every property in the group.
 */
function groupHouseCounts(state: GameState, group: ColorGroup): number[] {
  return groupPropertyIds(group).map(id => state.properties[id]?.houses ?? 0);
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Can `playerId` build one house/hotel on `propertyId` right now?
 *
 * Checks (in order):
 * 1. Property exists and is a colour property with a houseCost
 * 2. Player owns a monopoly on the group
 * 3. No mortgaged property in the group
 * 4. Global house/hotel supply available
 * 5. Even-building rule (this property is ≤ min of group + 1 AFTER placing)
 * 6. Player can afford the cost
 */
export function canBuyHouse(
  state: GameState,
  playerId: PlayerId,
  propertyId: PropertyId,
): ValidationResult {
  const square = BOARD[propertyId];
  if (!square || square.type !== 'property' || !square.group || square.houseCost == null) {
    return { ok: false, reason: 'Not a buildable property.' };
  }

  const prop = state.properties[propertyId];
  if (!prop || prop.ownerId !== playerId) {
    return { ok: false, reason: 'You do not own this property.' };
  }
  if (prop.mortgaged) {
    return { ok: false, reason: 'This property is mortgaged.' };
  }
  if (prop.houses >= 5) {
    return { ok: false, reason: 'Already has a hotel — cannot build further.' };
  }

  const group = square.group;

  if (!ownsMonopoly(state, playerId, group)) {
    return { ok: false, reason: 'You must own the full colour group before building.' };
  }
  if (groupHasMortgage(state, group)) {
    return { ok: false, reason: 'Cannot build while any property in the group is mortgaged.' };
  }

  // Supply check
  if (prop.houses === 4) {
    // Upgrading to hotel: need 1 hotel in supply; 4 houses return to pool.
    if (state.hotelSupply < 1) {
      return { ok: false, reason: 'No hotels left in supply.' };
    }
    // Note: 4 houses are freed back, so net house supply change = +4 - 0 = +4 (we gain houses).
    // No need to check house supply here.
  } else {
    // Adding one house
    if (state.houseSupply < 1) {
      return { ok: false, reason: 'No houses left in supply.' };
    }
  }

  // Even-building rule: after placing, this property's count must not exceed
  // min of all others in the group + 1.
  const allCounts = groupHouseCounts(state, group);
  const thisCount = prop.houses;
  const othersMin = Math.min(
    ...allCounts.filter((_, i) => groupPropertyIds(group)[i] !== propertyId),
  );
  if (thisCount >= othersMin + 1) {
    return {
      ok: false,
      reason: 'Even-building rule: build on the property with fewer houses first.',
    };
  }

  // Affordability
  const player = state.players[playerId];
  if (player.cash < square.houseCost) {
    return { ok: false, reason: `Not enough cash (need $${square.houseCost}).` };
  }

  return { ok: true };
}

/**
 * Can `playerId` sell one house/hotel on `propertyId` right now?
 *
 * Checks:
 * 1. Property is a colour property the player owns, not mortgaged
 * 2. At least one house/hotel to sell
 * 3. If selling a hotel: ≥ 4 houses must be in global supply (hotel → 4 houses)
 * 4. Even-selling rule: after selling, this property must not fall below
 *    max of siblings - 1
 */
export function canSellHouse(
  state: GameState,
  playerId: PlayerId,
  propertyId: PropertyId,
): ValidationResult {
  const square = BOARD[propertyId];
  if (!square || square.type !== 'property' || !square.group || square.houseCost == null) {
    return { ok: false, reason: 'Not a sellable property.' };
  }

  const prop = state.properties[propertyId];
  if (!prop || prop.ownerId !== playerId) {
    return { ok: false, reason: 'You do not own this property.' };
  }
  if (prop.houses === 0) {
    return { ok: false, reason: 'No houses to sell.' };
  }

  const group = square.group;

  // Selling a hotel requires 4 houses in supply to convert back
  if (prop.houses === 5 && state.houseSupply < 4) {
    return { ok: false, reason: 'Not enough houses in supply to break down a hotel (need 4).' };
  }

  // Even-selling rule: after selling, this count must be ≥ max of siblings - 1
  const allCounts = groupHouseCounts(state, group);
  const siblingIds = groupPropertyIds(group).filter(id => id !== propertyId);
  const siblingsMax = siblingIds.length > 0
    ? Math.max(...siblingIds.map(id => state.properties[id]?.houses ?? 0))
    : 0;

  // The effective count after selling (hotel 5 → 4 houses)
  const effectiveAfter = prop.houses === 5 ? 4 : prop.houses - 1;

  if (effectiveAfter < siblingsMax - 1) {
    return {
      ok: false,
      reason: 'Even-selling rule: sell from the property with more houses first.',
    };
  }

  return { ok: true };
}

/**
 * Return the list of colour groups where `playerId` can build at least one house
 * on at least one property (i.e., `canBuyHouse` would succeed for at least one
 * property in the group).
 *
 * Used by the HUD to decide whether to show the Build button.
 */
export function getBuildableGroups(state: GameState, playerId: PlayerId): ColorGroup[] {
  const player = state.players[playerId];
  if (!player) return [];

  // Collect groups where player owns all properties
  const candidateGroups = new Set<ColorGroup>();
  for (const propId of player.properties) {
    const sq = BOARD[propId];
    if (sq?.group) {
      if (ownsMonopoly(state, playerId, sq.group)) {
        candidateGroups.add(sq.group);
      }
    }
  }

  return [...candidateGroups].filter(group =>
    groupPropertyIds(group).some(
      propId => canBuyHouse(state, playerId, propId).ok,
    ),
  );
}
