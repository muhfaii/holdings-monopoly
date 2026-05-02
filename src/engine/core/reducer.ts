import type { GameState, PlayerId, PlayerState, PropertyState, TurnState } from './state';
import type { GameEvent } from './events';
import type { Action, ActionResult } from './actions';
import { createRNG, createSeed } from '../rng';
import { BOARD, GO_SALARY, HOUSE_SUPPLY, HOTEL_SUPPLY, JAIL_FINE, JAIL_SQUARE, STARTING_CASH } from '../data/board';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, CHANCE_GOOJF_INDEX, COMMUNITY_CHEST_GOOJF_INDEX } from '../data/cards';
import { createSeededDeck, drawCard, discardCard, returnCardToDiscard } from '../rules/deck';
import { resolveCard, rollDiceForUtility } from '../rules/cards';
import { rollAndMove } from '../rules/movement';
import { calculateRent } from '../rules/rent';
import { detectBankruptcy } from '../rules/bankruptcy';
import { canBuyHouse, canSellHouse } from '../rules/buildings';

export function reducer(state: GameState, action: Action): ActionResult {
  const events: GameEvent[] = [];
  let newState = state;
  const errors: string[] = [];

  try {
    // Phase guard: only START_GAME is valid in setup; only NEW_GAME is valid in ended.
    // All other actions require an active game.
    if (action.type === 'START_GAME') {
      if (state.phase !== 'setup') {
        return { state, events, errors: ['Game already started — reset to setup first'] };
      }
    } else if (action.type === 'NEW_GAME') {
      // Always allowed
    } else if (state.phase !== 'active') {
      return {
        state,
        events,
        errors: [`Cannot perform '${action.type}' while game is in '${state.phase}' phase`],
      };
    }

    switch (action.type) {
      case 'START_GAME': {
        const rawNames = action.players.map(p => p.name);
        const validation = validatePlayerNames(rawNames);
        if (validation.errors.length > 0) {
          return { state, events, errors: validation.errors };
        }
        const playerConfigs = action.players.map((p, i) => ({
          name: validation.names[i],
          isAI: p.isAI,
        }));
        newState = initGame(playerConfigs, state.rngSeed);
        events.push({ type: 'GAME_STARTED', playerIds: playerConfigs.map((_, i) => `p${i}`) });
        break;
      }

      case 'NEW_GAME': {
        newState = createSetupState();
        events.push({ type: 'NEW_GAME_RESET' });
        break;
      }

      case 'ROLL_DICE': {
        const result = handleRollDice(state, events);
        newState = result.state;
        break;
      }

      case 'BUY_PROPERTY': {
        const decision = state.turn.pendingDecision;
        if (!decision || decision.type !== 'AWAIT_BUY_DECISION') {
          return { state, events, errors: ['No purchase pending'] };
        }
        const propertyId = decision.propertyId;
        const playerId = decision.playerId;
        const square = BOARD[propertyId];

        if (state.players[playerId].cash < square.price) {
          return { state, events, errors: ['Cannot afford this property'] };
        }

        newState = applyCashChange(newState, playerId, -square.price);
        newState = {
          ...newState,
          properties: {
            ...newState.properties,
            [propertyId]: { ...newState.properties[propertyId], ownerId: playerId },
          },
          players: {
            ...newState.players,
            [playerId]: {
              ...newState.players[playerId],
              properties: [...newState.players[playerId].properties, propertyId],
            },
          },
          turn: { ...newState.turn, pendingDecision: null },
        };
        events.push({ type: 'PROPERTY_BOUGHT', playerId, propertyId, price: square.price });
        break;
      }

      case 'DECLINE_PURCHASE': {
        const decision = state.turn.pendingDecision;
        if (!decision || decision.type !== 'AWAIT_BUY_DECISION') {
          return { state, events, errors: ['No purchase pending'] };
        }
        // Set up auction
        const propertyId = decision.propertyId;
        const eligible = Object.values(state.players)
          .filter(p => !p.bankrupt)
          .map(p => p.id);

        newState = {
          ...state,
          turn: {
            ...state.turn,
            pendingDecision: {
              type: 'AWAIT_AUCTION_BID',
              propertyId,
              eligiblePlayerIds: eligible,
              currentBid: 0,
              currentBidderId: null,
              passedPlayerIds: [],
            },
          },
        };
        break;
      }

      case 'PLACE_BID': {
        const decision = state.turn.pendingDecision;
        if (!decision || decision.type !== 'AWAIT_AUCTION_BID') {
          return { state, events, errors: ['No auction in progress'] };
        }
        const player = state.players[action.playerId];
        if (action.amount <= decision.currentBid) {
          return { state, events, errors: ['Bid must be higher than current bid'] };
        }
        if (player.cash < action.amount) {
          return { state, events, errors: ['Cannot afford bid'] };
        }

        newState = {
          ...state,
          turn: {
            ...state.turn,
            pendingDecision: {
              ...decision,
              currentBid: action.amount,
              currentBidderId: action.playerId,
            },
          },
        };
        break;
      }

      case 'PASS_BID': {
        const decision = state.turn.pendingDecision;
        if (!decision || decision.type !== 'AWAIT_AUCTION_BID') {
          return { state, events, errors: ['No auction in progress'] };
        }
        // The current bidder is the first eligible player who hasn't yet passed —
        // NOT state.turn.currentPlayerId (which never changes during an auction).
        const activeBefore = decision.eligiblePlayerIds.filter(id => !decision.passedPlayerIds.includes(id));
        const currentBidder = activeBefore[0];
        if (!currentBidder) {
          // Auction already over — just clear the decision
          newState = { ...state, turn: { ...state.turn, pendingDecision: null } };
          break;
        }
        const newPassed = [...decision.passedPlayerIds, currentBidder];
        const activeBidders = decision.eligiblePlayerIds.filter(id => !newPassed.includes(id));

        if (activeBidders.length === 0) {
          // Auction complete
          const winnerId = decision.currentBidderId;
          const price = decision.currentBid;
          if (winnerId && price > 0) {
            newState = applyCashChange(state, winnerId, -price);
            newState = {
              ...newState,
              properties: {
                ...newState.properties,
                [decision.propertyId]: { ...newState.properties[decision.propertyId], ownerId: winnerId },
              },
              players: {
                ...newState.players,
                [winnerId]: {
                  ...newState.players[winnerId],
                  properties: [...newState.players[winnerId].properties, decision.propertyId],
                },
              },
              turn: { ...newState.turn, pendingDecision: null },
            };
            events.push({ type: 'AUCTION_WON', playerId: winnerId, propertyId: decision.propertyId, bid: price });
          } else {
            // No bids, property remains unowned
            newState = { ...state, turn: { ...state.turn, pendingDecision: null } };
          }
        } else {
          newState = {
            ...state,
            turn: {
              ...state.turn,
              pendingDecision: { ...decision, passedPlayerIds: newPassed },
            },
          };
        }
        break;
      }

      case 'PAY_JAIL_FINE': {
        const decision = state.turn.pendingDecision;
        if (!decision || decision.type !== 'AWAIT_JAIL_DECISION') {
          return { state, events, errors: ['No jail decision pending'] };
        }
        const playerId = decision.playerId;
        newState = applyCashChange(state, playerId, -JAIL_FINE);
        newState = addToKopitiam(newState, JAIL_FINE);
        newState = {
          ...newState,
          players: {
            ...newState.players,
            [playerId]: { ...newState.players[playerId], inJail: false, jailTurns: 0 },
          },
          // Clear decision + reset roll flags so player can roll normally this turn
          turn: {
            ...newState.turn,
            pendingDecision: null,
            hasRolledThisTurn: false,
            jailRoll: false,
          },
        };
        events.push({ type: 'JAIL_FINE_PAID', playerId });
        break;
      }

      case 'USE_JAIL_CARD': {
        const decision = state.turn.pendingDecision;
        if (!decision || decision.type !== 'AWAIT_JAIL_DECISION') {
          return { state, events, errors: ['No jail decision pending'] };
        }
        const playerId = decision.playerId;
        const player = state.players[playerId];
        if (player.getOutOfJailCards <= 0) {
          return { state, events, errors: ['No Get Out of Jail Free card'] };
        }

        // Determine which deck the card came from and return it to that discard pile
        const sources = player.goojfCardSources;
        const sourceDeck = sources[sources.length - 1]; // pop last (most recently acquired)
        const newSources = sources.slice(0, -1);

        let updatedChanceDeck = state.chanceDeck;
        let updatedCommunityChestDeck = state.communityChestDeck;

        if (sourceDeck === 'chance') {
          updatedChanceDeck = returnCardToDiscard(state.chanceDeck, CHANCE_GOOJF_INDEX);
        } else if (sourceDeck === 'community-chest') {
          updatedCommunityChestDeck = returnCardToDiscard(state.communityChestDeck, COMMUNITY_CHEST_GOOJF_INDEX);
        }

        newState = {
          ...state,
          players: {
            ...state.players,
            [playerId]: {
              ...player,
              inJail: false,
              jailTurns: 0,
              getOutOfJailCards: player.getOutOfJailCards - 1,
              goojfCardSources: newSources,
            },
          },
          chanceDeck: updatedChanceDeck,
          communityChestDeck: updatedCommunityChestDeck,
          turn: { ...state.turn, pendingDecision: null },
        };
        events.push({ type: 'JAIL_CARD_ESCAPE', playerId });
        break;
      }

      case 'ACKNOWLEDGE_CARD': {
        const decision = state.turn.pendingDecision;
        if (!decision || decision.type !== 'AWAIT_CARD_ACKNOWLEDGEMENT') {
          return { state, events, errors: ['No card acknowledgement pending'] };
        }

        const { playerId, triggerLanding } = decision;

        // Clear the card decision and rent override first
        newState = {
          ...state,
          turn: {
            ...state.turn,
            pendingDecision: null,
            cardRentOverride: null,
          },
        };

        if (triggerLanding) {
          const position = newState.players[playerId].position;
          const square = BOARD[position];
          const rentOverride = state.turn.cardRentOverride;

          switch (square.type) {
            case 'property':
            case 'railroad':
            case 'utility': {
              const property = newState.properties[position];
              const playerLaps = newState.players[playerId].laps;

              if (!property.ownerId) {
                // Only offer purchase if player has completed at least one lap
                if (playerLaps >= 1) {
                  newState = {
                    ...newState,
                    turn: {
                      ...newState.turn,
                      pendingDecision: { type: 'AWAIT_BUY_DECISION', playerId, propertyId: position },
                    },
                  };
                }
                // If laps === 0: silently pass through, no purchase offer
              } else if (property.ownerId !== playerId && !property.mortgaged) {
                // Pay rent — potentially with card-specific override
                if (rentOverride?.type === 'railroad_double') {
                  // 2× normal railroad rent
                  const { charges } = calculateRent(newState, playerId, position, 0);
                  for (const ch of charges) {
                    const doubled = ch.amount * 2;
                    newState = applyCashChange(newState, ch.fromPlayerId, -doubled);
                    newState = applyCashChange(newState, ch.toPlayerId, doubled);
                    events.push({ type: 'RENT_PAID', fromPlayerId: ch.fromPlayerId, toPlayerId: ch.toPlayerId, propertyId: ch.propertyId, amount: doubled });
                  }
                  newState = checkAndApplyBankruptcy(newState, playerId, events);
                } else if (rentOverride?.type === 'utility_10x') {
                  // Roll fresh dice; pay 10× the result regardless of how many utilities owner has
                  const seedOffset = newState.history.length + 3000;
                  const { die1, die2, total } = rollDiceForUtility(newState.rngSeed + seedOffset);
                  const amount = total * 10;
                  const ownerId = property.ownerId!;
                  events.push({ type: 'DICE_ROLLED', playerId, die1, die2, doubles: die1 === die2 });
                  newState = applyCashChange(newState, playerId, -amount);
                  newState = applyCashChange(newState, ownerId, amount);
                  events.push({ type: 'RENT_PAID', fromPlayerId: playerId, toPlayerId: ownerId, propertyId: position, amount });
                  newState = checkAndApplyBankruptcy(newState, playerId, events);
                } else {
                  // Normal rent — use the most recent dice roll from history
                  const lastDice = [...newState.history].reverse().find(e => e.type === 'DICE_ROLLED' && e.playerId === playerId);
                  const diceTotal = (lastDice?.type === 'DICE_ROLLED') ? lastDice.die1 + lastDice.die2 : 7;
                  const { charges } = calculateRent(newState, playerId, position, diceTotal);
                  for (const ch of charges) {
                    newState = applyCashChange(newState, ch.fromPlayerId, -ch.amount);
                    newState = applyCashChange(newState, ch.toPlayerId, ch.amount);
                    events.push({ type: 'RENT_PAID', fromPlayerId: ch.fromPlayerId, toPlayerId: ch.toPlayerId, propertyId: ch.propertyId, amount: ch.amount });
                  }
                  newState = checkAndApplyBankruptcy(newState, playerId, events);
                }
              }
              break;
            }

            case 'tax': {
              const taxAmount = square.price;
              newState = applyCashChange(newState, playerId, -taxAmount);
              newState = addToKopitiam(newState, taxAmount);
              events.push({ type: 'TAX_PAID', playerId, amount: taxAmount });
              newState = checkAndApplyBankruptcy(newState, playerId, events);
              break;
            }

            case 'kopitiam': {
              const potAmount = newState.kopitiamPot;
              if (potAmount > 0) {
                newState = applyCashChange(newState, playerId, potAmount);
                newState = { ...newState, kopitiamPot: 0 };
                events.push({ type: 'KOPITIAM_COLLECTED', playerId, amount: potAmount });
              }
              break;
            }

            case 'go-to-jail': {
              // GO_BACK can't land here in practice (no card squares forward of go-to-jail),
              // but handle defensively.
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
                turn: {
                  ...newState.turn,
                  pendingDecision: { type: 'AWAIT_JAIL_DECISION', playerId },
                },
              };
              events.push({ type: 'SENT_TO_JAIL', playerId });
              break;
            }

            case 'chance':
            case 'community-chest': {
              // GO_BACK 3 from slot 36 (Chance) can land on slot 33 (Community Chest).
              // Draw from that deck (one level of recursion allowed; GO_BACK cannot chain further).
              newState = handleCardSquare(newState, playerId, square.type as 'chance' | 'community-chest', events, /* isNested */ true);
              break;
            }

            // 'go', 'jail' — no action on landing
            default:
              break;
          }
        }

        // Check bankruptcy triggered by cash cards (PAY_BANK, PAY_PER_BUILDING, PAY_PLAYERS)
        // that were resolved immediately in resolveCard. If the player went negative there,
        // they need to resolve it now.
        if (!newState.turn.pendingDecision) {
          newState = checkAndApplyBankruptcy(newState, playerId, events);
        }

        break;
      }

      case 'BUY_HOUSE': {
        const playerId = state.turn.currentPlayerId;

        // Building is only allowed during the player's own turn with no pending decision
        if (state.turn.pendingDecision) {
          return { state, events, errors: ['Cannot build while a decision is pending'] };
        }

        const validation = canBuyHouse(state, playerId, action.propertyId);
        if (!validation.ok) {
          return { state, events, errors: [validation.reason ?? 'Cannot build here'] };
        }

        const square = BOARD[action.propertyId];
        const houseCost = square.houseCost!;
        const prop = state.properties[action.propertyId];

        if (prop.houses === 4) {
          // Upgrade to hotel: 4 houses return to supply, 1 hotel consumed
          newState = {
            ...newState,
            properties: {
              ...newState.properties,
              [action.propertyId]: { ...prop, houses: 5 },
            },
            houseSupply: newState.houseSupply + 4,
            hotelSupply: newState.hotelSupply - 1,
          };
          newState = applyCashChange(newState, playerId, -houseCost);
          events.push({ type: 'HOTEL_BUILT', playerId, propertyId: action.propertyId, cost: houseCost });
        } else {
          // Build one house
          const newHouses = prop.houses + 1;
          newState = {
            ...newState,
            properties: {
              ...newState.properties,
              [action.propertyId]: { ...prop, houses: newHouses },
            },
            houseSupply: newState.houseSupply - 1,
          };
          newState = applyCashChange(newState, playerId, -houseCost);
          events.push({ type: 'HOUSE_BUILT', playerId, propertyId: action.propertyId, houses: newHouses, cost: houseCost });
        }
        break;
      }

      case 'SELL_HOUSE': {
        const playerId = state.turn.currentPlayerId;

        if (state.turn.pendingDecision) {
          return { state, events, errors: ['Cannot sell buildings while a decision is pending'] };
        }

        const validation = canSellHouse(state, playerId, action.propertyId);
        if (!validation.ok) {
          return { state, events, errors: [validation.reason ?? 'Cannot sell here'] };
        }

        const square = BOARD[action.propertyId];
        const houseCost = square.houseCost!;
        const refund = Math.floor(houseCost / 2);
        const prop = state.properties[action.propertyId];

        if (prop.houses === 5) {
          // Sell hotel → 4 houses
          newState = {
            ...newState,
            properties: {
              ...newState.properties,
              [action.propertyId]: { ...prop, houses: 4 },
            },
            hotelSupply: newState.hotelSupply + 1,
            houseSupply: newState.houseSupply - 4,
          };
          newState = applyCashChange(newState, playerId, refund);
          events.push({ type: 'HOTEL_SOLD', playerId, propertyId: action.propertyId, refund });
        } else {
          // Sell one house
          const newHouses = prop.houses - 1;
          newState = {
            ...newState,
            properties: {
              ...newState.properties,
              [action.propertyId]: { ...prop, houses: newHouses },
            },
            houseSupply: newState.houseSupply + 1,
          };
          newState = applyCashChange(newState, playerId, refund);
          events.push({ type: 'HOUSE_SOLD', playerId, propertyId: action.propertyId, houses: newHouses, refund });
        }
        break;
      }

      case 'END_TURN': {
        newState = advanceTurn(state);
        break;
      }

      case 'RESOLVE_BANKRUPTCY_DEBT': {
        const decision = state.turn.pendingDecision;
        if (!decision || decision.type !== 'AWAIT_BANKRUPTCY_LIQUIDATION') {
          return { state, events, errors: ['No bankruptcy pending'] };
        }
        const playerId = decision.playerId;
        const player = newState.players[playerId];
        // Transfer all properties to creditor (or back to bank if no creditor)
        const creditorId = decision.creditorId;
        let updatedPlayers = { ...newState.players };
        let updatedProperties = { ...newState.properties };

        for (const propId of player.properties) {
          updatedProperties = {
            ...updatedProperties,
            [propId]: {
              ...updatedProperties[propId],
              ownerId: creditorId,
              mortgaged: false,
              houses: 0,
            },
          };
          if (creditorId) {
            updatedPlayers = {
              ...updatedPlayers,
              [creditorId]: {
                ...updatedPlayers[creditorId],
                properties: [...updatedPlayers[creditorId].properties, propId],
              },
            };
          }
        }

        const playerCash = player.cash;
        if (playerCash > 0 && creditorId) {
          updatedPlayers = {
            ...updatedPlayers,
            [creditorId]: { ...updatedPlayers[creditorId], cash: updatedPlayers[creditorId].cash + playerCash },
          };
        }

        updatedPlayers = {
          ...updatedPlayers,
          [playerId]: {
            ...updatedPlayers[playerId],
            bankrupt: true,
            cash: 0,
            properties: [],
          },
        };

        events.push({ type: 'PLAYER_BANKRUPT', playerId, creditorId });

        // Check win condition
        const remainingPlayers = Object.values(updatedPlayers).filter(p => !p.bankrupt);
        newState = {
          ...newState,
          players: updatedPlayers,
          properties: updatedProperties,
          turn: { ...newState.turn, pendingDecision: null },
        };

        if (remainingPlayers.length === 1) {
          newState = { ...newState, phase: 'ended', winner: remainingPlayers[0].id };
          events.push({ type: 'GAME_ENDED', winnerId: remainingPlayers[0].id });
        }
        break;
      }
    }

    return {
      state: {
        ...newState,
        history: [...newState.history, ...events],
      },
      events,
    };
  } catch (err) {
    return { state, events, errors: [err instanceof Error ? err.message : 'Unknown error'] };
  }
}

// ── Card drawing ──────────────────────────────────────────────────────────────

/**
 * Draw and resolve a card from the given deck type.
 * Mutates `events` in place. Returns updated state with the card decision set.
 *
 * `isNested` is true when called from within ACKNOWLEDGE_CARD (GO_BACK landing
 * on a card square). In that case, `triggerLanding` on the new card decision is
 * always false — we don't allow further nesting.
 */
function handleCardSquare(
  state: GameState,
  playerId: PlayerId,
  deckType: 'chance' | 'community-chest',
  events: GameEvent[],
  isNested = false,
): GameState {
  let newState = state;

  const cardDefs = deckType === 'chance' ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;
  const goojfIndex = deckType === 'chance' ? CHANCE_GOOJF_INDEX : COMMUNITY_CHEST_GOOJF_INDEX;
  const currentDeck = deckType === 'chance' ? newState.chanceDeck : newState.communityChestDeck;

  // Determine if the GOOJF card for this deck is currently held by any player
  const isGoojfHeld = Object.values(newState.players).some(p =>
    p.goojfCardSources.includes(deckType),
  );
  const heldGoojfIndices = isGoojfHeld ? [goojfIndex] : [];

  // Seeded RNG for this draw: offset by history length to ensure uniqueness per action
  const seedOffset = deckType === 'chance' ? 1000 : 2000;
  const rng = createRNG(newState.rngSeed + newState.history.length + seedOffset);

  // Check if we need to reshuffle (for the event)
  const needsReshuffle = currentDeck.drawPile.length === 0;

  const { cardIndex, deck: updatedDeck } = drawCard(currentDeck, rng, heldGoojfIndices);
  const card = cardDefs[cardIndex];

  // Update the deck in state
  const isGoojfCard = card.effect.type === 'GET_OUT_OF_JAIL';
  // Discard non-GOOJF cards immediately; GOOJF cards leave the deck entirely
  const finalDeck = isGoojfCard ? updatedDeck : discardCard(updatedDeck, cardIndex);

  newState = deckType === 'chance'
    ? { ...newState, chanceDeck: finalDeck }
    : { ...newState, communityChestDeck: finalDeck };

  if (needsReshuffle) {
    events.push({ type: 'DECK_RESHUFFLED', deckType });
  }
  events.push({ type: 'CARD_DRAWN', playerId, deckType, cardId: card.id, cardText: card.text });

  // Resolve immediate card effects
  const resolution = resolveCard(newState, playerId, card);
  newState = resolution.state;
  events.push(...resolution.events);

  // Handle GET_OUT_OF_JAIL specially: push source deck onto player's sources
  if (isGoojfCard) {
    newState = {
      ...newState,
      players: {
        ...newState.players,
        [playerId]: {
          ...newState.players[playerId],
          goojfCardSources: [...newState.players[playerId].goojfCardSources, deckType],
        },
      },
    };
    events.push({ type: 'GOOJF_CARD_ACQUIRED', playerId, deckType });
  }

  // For ADVANCE_TO_NEAREST, set the rent override on TurnState before setting the decision
  let cardRentOverride: TurnState['cardRentOverride'] = null;
  if (card.effect.type === 'ADVANCE_TO_NEAREST' && !isNested) {
    cardRentOverride = card.effect.category === 'railroad'
      ? { type: 'railroad_double' }
      : { type: 'utility_10x' };
  }

  // triggerLanding: movement cards require landing resolution after acknowledgement.
  // In nested mode (GO_BACK landing on another card square) we skip further nesting.
  const triggerLanding = resolution.triggerLanding && !isNested;

  if (isGoojfCard) {
    // GET_OUT_OF_JAIL: card is just held. No landing needed. Show the modal.
    newState = {
      ...newState,
      turn: {
        ...newState.turn,
        cardRentOverride,
        pendingDecision: {
          type: 'AWAIT_CARD_ACKNOWLEDGEMENT',
          playerId,
          cardId: card.id,
          cardText: card.text,
          deckType,
          triggerLanding: false,
        },
      },
    };
  } else if (card.effect.type === 'GO_TO_JAIL') {
    // GO_TO_JAIL: player is already moved to jail in resolveCard.
    // Show the card first, then on acknowledgement the jail decision will be set.
    // Actually, we set the jail decision directly here — the card text is shown
    // via the modal, and after acknowledgement the turn simply ends.
    // We show the card modal; triggerLanding is false since jail is handled.
    newState = {
      ...newState,
      turn: {
        ...newState.turn,
        cardRentOverride,
        pendingDecision: {
          type: 'AWAIT_CARD_ACKNOWLEDGEMENT',
          playerId,
          cardId: card.id,
          cardText: card.text,
          deckType,
          triggerLanding: false,
        },
      },
    };
  } else {
    newState = {
      ...newState,
      turn: {
        ...newState.turn,
        cardRentOverride,
        pendingDecision: {
          type: 'AWAIT_CARD_ACKNOWLEDGEMENT',
          playerId,
          cardId: card.id,
          cardText: card.text,
          deckType,
          triggerLanding,
        },
      },
    };
  }

  return newState;
}

// ── Setup state ───────────────────────────────────────────────────────────────

/**
 * Create a fresh state in the 'setup' phase. The store boots into this state
 * so the engine has a single source of truth from the very first frame.
 */
export function createSetupState(): GameState {
  return {
    version: 3,
    rngSeed: createSeed(),
    phase: 'setup',
    players: {},
    properties: {},
    turn: {
      currentPlayerId: '',
      playerOrder: [],
      playerIndex: 0,
      doublesCount: 0,
      pendingDecision: null,
      hasRolledThisTurn: false,
      jailRoll: false,
      cardRentOverride: null,
    },
    kopitiamPot: 0,
    houseSupply: HOUSE_SUPPLY,
    hotelSupply: HOTEL_SUPPLY,
    chanceDeck: { drawPile: [], discardPile: [] },
    communityChestDeck: { drawPile: [], discardPile: [] },
    history: [],
    winner: null,
  };
}

/**
 * Normalize and validate player names. Empty entries are auto-filled with
 * "Player N" labels. After normalization, duplicate names are an error.
 */
function validatePlayerNames(rawNames: string[]): { names: string[]; errors: string[] } {
  const errors: string[] = [];

  if (rawNames.length < 2 || rawNames.length > 6) {
    errors.push('Need 2-6 players');
    return { names: [], errors };
  }

  const names = rawNames.map((n, i) => {
    const trimmed = (n ?? '').trim();
    return trimmed.length > 0 ? trimmed : `Player ${i + 1}`;
  });

  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      errors.push(`Duplicate player name: "${name}"`);
      break;
    }
    seen.add(key);
  }

  return { names, errors };
}

function initGame(playerConfigs: Array<{ name: string; isAI: boolean }>, rngSeed?: number): GameState {
  const seed = rngSeed ?? createSeed();
  const players: Record<string, PlayerState> = {};
  const playerIds: string[] = [];
  for (let i = 0; i < playerConfigs.length; i++) {
    const id = `p${i}`;
    const { name, isAI } = playerConfigs[i];
    playerIds.push(id);
    players[id] = {
      id,
      name,
      isAI,
      cash: STARTING_CASH,
      position: 0,
      laps: 0,
      inJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0,
      goojfCardSources: [],
      properties: [],
      bankrupt: false,
    };
  }

  const properties: Record<number, PropertyState> = {};
  for (const square of BOARD) {
    if (square.type === 'property' || square.type === 'railroad' || square.type === 'utility') {
      properties[square.id] = {
        id: square.id,
        houses: 0,
        mortgaged: false,
        ownerId: null,
      };
    }
  }

  // Use seeded RNG for both decks — different offsets so they shuffle independently
  const chanceRng = createRNG(seed);
  const ccRng = createRNG(seed + 1);

  return {
    version: 3,
    rngSeed: seed,
    phase: 'active',
    players,
    properties,
    turn: {
      currentPlayerId: playerIds[0],
      playerOrder: playerIds,
      playerIndex: 0,
      doublesCount: 0,
      pendingDecision: null,
      hasRolledThisTurn: false,
      jailRoll: false,
      cardRentOverride: null,
    },
    kopitiamPot: 0,
    houseSupply: HOUSE_SUPPLY,
    hotelSupply: HOTEL_SUPPLY,
    chanceDeck: createSeededDeck(CHANCE_CARDS.length, chanceRng),
    communityChestDeck: createSeededDeck(COMMUNITY_CHEST_CARDS.length, ccRng),
    history: [],
    winner: null,
  };
}

function handleRollDice(state: GameState, events: GameEvent[]): { state: GameState } {
  const playerId = state.turn.currentPlayerId;
  const player = state.players[playerId];
  const isJailRoll = player.inJail; // rolling from jail context
  const moveResult = rollAndMove(state, playerId);

  events.push(...moveResult.events);

  const { die1, die2, to: newPosition, passedGo, sentToJail } = moveResult.result;
  const doubles = die1 === die2;

  let newState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        position: newPosition,
        laps: passedGo ? player.laps + 1 : player.laps,
        inJail: sentToJail || (newPosition === JAIL_SQUARE && player.inJail),
        jailTurns: newPosition === JAIL_SQUARE && player.inJail ? player.jailTurns + 1 : player.jailTurns,
      },
    },
    turn: {
      ...state.turn,
      doublesCount: doubles ? state.turn.doublesCount + 1 : 0,
      hasRolledThisTurn: true,
      jailRoll: isJailRoll,
      pendingDecision: null as GameState['turn']['pendingDecision'], // clear jail decision
    },
  };

  if (passedGo) {
    newState = applyCashChange(newState, playerId, GO_SALARY);
  }

  // Post-movement landing logic
  if (sentToJail) {
    // Sent to jail by 3 doubles or Go To Jail square — end their turn
    newState = {
      ...newState,
      players: {
        ...newState.players,
        [playerId]: { ...newState.players[playerId], inJail: true, jailTurns: 0 },
      },
    };
    return { state: newState };
  }

  if (isJailRoll && !doubles) {
    // Rolled in jail, no doubles — stay in jail, increment turn counter
    const jailTurns = newState.players[playerId].jailTurns + 1;
    newState = {
      ...newState,
      players: { ...newState.players, [playerId]: { ...newState.players[playerId], jailTurns } },
    };

    if (jailTurns >= 3) {
      // 3 turns served — auto-release for free, no fine
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [playerId]: { ...newState.players[playerId], inJail: false, jailTurns: 0 },
        },
      };
      events.push({ type: 'JAIL_TIME_SERVED', playerId });
    }
    // Turn ends normally (no pending decision); player stays or is now free
    return { state: newState };
  } else {
    // Handle landing on square
    const square = BOARD[newPosition];
    switch (square.type) {
      case 'property':
      case 'railroad':
      case 'utility': {
        const property = newState.properties[newPosition];
        const playerLaps = newState.players[playerId].laps;
        if (!property.ownerId && playerLaps >= 1) {
          // Only offer to buy after completing the first lap around the board
          newState = {
            ...newState,
            turn: {
              ...newState.turn,
              pendingDecision: { type: 'AWAIT_BUY_DECISION', playerId, propertyId: newPosition },
            },
          };
        } else if (!property.ownerId && playerLaps === 0) {
          // First lap: can't buy — just pass through, no offer
        } else if (property.ownerId !== playerId) {
          const { charges } = calculateRent(newState, playerId, newPosition, die1 + die2);
          for (const ch of charges) {
            newState = applyCashChange(newState, ch.fromPlayerId, -ch.amount);
            newState = applyCashChange(newState, ch.toPlayerId, ch.amount);
            events.push({
              type: 'RENT_PAID',
              fromPlayerId: ch.fromPlayerId,
              toPlayerId: ch.toPlayerId,
              propertyId: ch.propertyId,
              amount: ch.amount,
            });
          }
          // Check bankruptcy for the lander
          newState = checkAndApplyBankruptcy(newState, playerId, events);
        }
        break;
      }
      case 'tax': {
        const taxAmount = square.price;
        newState = applyCashChange(newState, playerId, -taxAmount);
        newState = addToKopitiam(newState, taxAmount);
        events.push({ type: 'TAX_PAID', playerId, amount: taxAmount });
        newState = checkAndApplyBankruptcy(newState, playerId, events);
        break;
      }
      case 'go-to-jail': {
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
          turn: {
            ...newState.turn,
            pendingDecision: { type: 'AWAIT_JAIL_DECISION', playerId },
          },
        };
        events.push({ type: 'SENT_TO_JAIL', playerId });
        break;
      }
      case 'chance':
      case 'community-chest': {
        newState = handleCardSquare(newState, playerId, square.type, events);
        break;
      }
      case 'kopitiam': {
        // Only collects if landing exactly (not passing through)
        const potAmount = newState.kopitiamPot;
        if (potAmount > 0) {
          newState = applyCashChange(newState, playerId, potAmount);
          newState = { ...newState, kopitiamPot: 0 };
          events.push({ type: 'KOPITIAM_COLLECTED', playerId, amount: potAmount });
        }
        break;
      }
    }
  }

  return { state: newState };
}

// ── Helper functions ──────────────────────────────────────────────────────────

function applyCashChange(state: GameState, playerId: PlayerId, amount: number): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        cash: state.players[playerId].cash + amount,
      },
    },
  };
}

function addToKopitiam(state: GameState, amount: number): GameState {
  return { ...state, kopitiamPot: state.kopitiamPot + amount };
}

function checkAndApplyBankruptcy(state: GameState, playerId: PlayerId, events: GameEvent[]): GameState {
  const player = state.players[playerId];
  if (player.cash >= 0) return state;

  const { isBankrupt } = detectBankruptcy(state, playerId);
  if (isBankrupt) {
    return {
      ...state,
      turn: {
        ...state.turn,
        pendingDecision: {
          type: 'AWAIT_BANKRUPTCY_LIQUIDATION',
          playerId,
          creditorId: null,
          debt: -player.cash,
        },
      },
    };
  }
  return state;
}

function advanceTurn(state: GameState): GameState {
  const nextIndex = (state.turn.playerIndex + 1) % state.turn.playerOrder.length;
  const nextPlayerId = state.turn.playerOrder[nextIndex];
  const nextPlayer = state.players[nextPlayerId];

  // If the next player is in jail, immediately set their jail decision
  // so the turn starts with the jail modal (pay or roll for doubles).
  const pendingDecision = (!nextPlayer.bankrupt && nextPlayer.inJail)
    ? { type: 'AWAIT_JAIL_DECISION' as const, playerId: nextPlayerId }
    : null;

  return {
    ...state,
    turn: {
      currentPlayerId: nextPlayerId,
      playerOrder: state.turn.playerOrder,
      playerIndex: nextIndex,
      doublesCount: 0,
      pendingDecision,
      hasRolledThisTurn: false,
      jailRoll: false,
      cardRentOverride: null,
    },
  };
}
