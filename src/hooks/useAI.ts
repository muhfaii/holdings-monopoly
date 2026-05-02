import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Decision, GameState } from '../engine/core/state';
import { BOARD } from '../engine/data/board';

/** Delay (ms) between AI actions — enough for the human player to see what's happening */
const AI_DELAY = 900;

/**
 * For auctions, the active bidder is the first eligible player who hasn't passed —
 * NOT necessarily the turn's currentPlayerId.
 */
function getAuctionBidder(decision: Decision & { type: 'AWAIT_AUCTION_BID' }): string | null {
  const active = decision.eligiblePlayerIds.filter(
    id => !decision.passedPlayerIds.includes(id),
  );
  return active[0] ?? null;
}

function aiShouldAct(state: GameState): boolean {
  if (state.phase !== 'active') return false;

  const { pendingDecision, currentPlayerId } = state.turn;

  if (pendingDecision?.type === 'AWAIT_AUCTION_BID') {
    const bidderId = getAuctionBidder(pendingDecision);
    return bidderId ? (state.players[bidderId]?.isAI ?? false) : false;
  }

  return state.players[currentPlayerId]?.isAI ?? false;
}

export function useAI() {
  const gameState = useGameStore(s => s.gameState);
  const dispatch = useGameStore(s => s.dispatch);

  // Debounce key: changes when the current player changes OR after any action (history grows).
  // This ensures the AI fires when the turn advances to it even if history didn't change.
  const lastActedKey = useRef('');

  useEffect(() => {
    if (!aiShouldAct(gameState)) return;

    const key = `${gameState.turn.currentPlayerId}:${gameState.turn.hasRolledThisTurn}:${gameState.history.length}`;
    if (key === lastActedKey.current) return;

    const timer = setTimeout(() => {
      lastActedKey.current = key;

      const { pendingDecision, currentPlayerId, hasRolledThisTurn, jailRoll } = gameState.turn;
      const currentPlayer = gameState.players[currentPlayerId];

      // ── Pending decision ────────────────────────────────────────────
      if (pendingDecision) {
        switch (pendingDecision.type) {

          case 'AWAIT_BUY_DECISION': {
            const square = BOARD[pendingDecision.propertyId];
            if (currentPlayer.cash >= square.price) {
              dispatch({ type: 'BUY_PROPERTY' });
            } else {
              dispatch({ type: 'START_AUCTION' });
            }
            break;
          }

          case 'AWAIT_AUCTION_BID':
            // Simple AI: always pass
            dispatch({ type: 'PASS_BID' });
            break;

          case 'AWAIT_JAIL_DECISION': {
            const player = gameState.players[pendingDecision.playerId];
            if (player.cash >= 50) {
              // Can afford — pay and get a fresh roll this turn
              dispatch({ type: 'PAY_JAIL_FINE' });
            } else {
              // Can't afford — roll for doubles
              dispatch({ type: 'ROLL_DICE' });
            }
            break;
          }

          case 'AWAIT_BANKRUPTCY_LIQUIDATION':
            dispatch({ type: 'RESOLVE_BANKRUPTCY_DEBT' });
            break;

          case 'AWAIT_CARD_ACKNOWLEDGEMENT':
            dispatch({ type: 'ACKNOWLEDGE_CARD' });
            break;
        }
        return;
      }

      // ── No pending decision ─────────────────────────────────────────
      const lastRollDoubles = (() => {
        const ev = [...gameState.history].reverse().find(e => e.type === 'DICE_ROLLED');
        return ev?.type === 'DICE_ROLLED' && ev.playerId === currentPlayerId
          && ev.die1 === ev.die2;
      })();

      const canRollAgain = lastRollDoubles && !jailRoll;

      if (!hasRolledThisTurn || canRollAgain) {
        dispatch({ type: 'ROLL_DICE' });
      } else {
        dispatch({ type: 'END_TURN' });
      }
    }, AI_DELAY);

    return () => clearTimeout(timer);
  }, [gameState, dispatch]);
}
