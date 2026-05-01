import type { GameState, PlayerId, PropertyId, PlayerState, PropertyState, Decision, DeckState, TurnState } from './state';
import type { GameEvent } from './events';
import type { Action, ActionResult } from './actions';
import { createRNG, createSeed } from '../rng';
import { BOARD, BOARD_SIZE, GO_SALARY, JAIL_FINE, JAIL_SQUARE, GO_TO_JAIL_SQUARE, KOPITIAM_SQUARE, STARTING_CASH, MAX_HOUSES } from '../data/board';
import { rollAndMove } from '../rules/movement';
import { buyProperty, initAuction, placeBid, passBid } from '../rules/purchase';
import { calculateRent } from '../rules/rent';
import { payJailFine, useGetOutOfJailCard, checkJailExpiry } from '../rules/jail';
import { detectBankruptcy } from '../rules/bankruptcy';

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
        newState = {
          ...state,
          players: {
            ...state.players,
            [playerId]: {
              ...player,
              inJail: false,
              jailTurns: 0,
              getOutOfJailCards: player.getOutOfJailCards - 1,
            },
          },
          turn: { ...state.turn, pendingDecision: null },
        };
        events.push({ type: 'JAIL_CARD_ESCAPE', playerId });
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

/**
 * Create a fresh state in the 'setup' phase. The store boots into this state
 * so the engine has a single source of truth from the very first frame.
 */
export function createSetupState(): GameState {
  return {
    version: 1,
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
    },
    kopitiamPot: 0,
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

  const deck = createShuffledDeck(16);

  return {
    version: 1,
    rngSeed: rngSeed ?? createSeed(),
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
    },
    kopitiamPot: 0,
    chanceDeck: deck,
    communityChestDeck: { ...deck },
    history: [],
    winner: null,
  };
}

function createShuffledDeck(size: number): DeckState {
  const cards = Array.from({ length: size }, (_, i) => i);
  // Fisher-Yates shuffle with simple deterministic approach
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return { drawPile: cards, discardPile: [] };
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
        // Card decks deferred to Phase 2
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
    },
  };
}
