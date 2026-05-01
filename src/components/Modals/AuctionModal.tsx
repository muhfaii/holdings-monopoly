import { useState } from 'react';
import type { Decision } from '../../engine/core/state';
import { useGameStore } from '../../store/gameStore';
import { BOARD } from '../../engine/data/board';

interface Props {
  decision: Decision & { type: 'AWAIT_AUCTION_BID' };
}

export function AuctionModal({ decision }: Props) {
  const gameState = useGameStore(s => s.gameState)!;
  const dispatch = useGameStore(s => s.dispatch);
  const [bidAmount, setBidAmount] = useState(decision.currentBid + 1);
  const square = BOARD[decision.propertyId];

  const activeBidders = decision.eligiblePlayerIds.filter(
    id => !decision.passedPlayerIds.includes(id),
  );
  const isAuctionOver = activeBidders.length === 0;
  const isEveryonePassed = activeBidders.length === 0 && decision.currentBidderId === null;

  // Get current bidder (first active player)
  const currentBidderId = activeBidders[0] || decision.currentBidderId;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 rounded-xl p-6 max-w-sm w-full border border-stone-600 shadow-2xl">
        <h2 className="text-lg font-bold text-stone-100 mb-1">Auction: {square.name}</h2>
        <p className="text-sm text-stone-400 mb-4">
          Current bid: <span className="text-amber-400 font-bold">${decision.currentBid}</span>
          {decision.currentBidderId && (
            <> by <span className="text-stone-300">{gameState.players[decision.currentBidderId]?.name}</span></>
          )}
        </p>

        {isAuctionOver ? (
          <div>
            {decision.currentBidderId && decision.currentBid > 0 ? (
              <div className="text-emerald-400 font-bold mb-4">
                Sold to {gameState.players[decision.currentBidderId]?.name} for ${decision.currentBid}!
              </div>
            ) : (
              <div className="text-stone-400 mb-4">
                No bids — property remains unowned
              </div>
            )}
            <button
              onClick={() => dispatch({ type: 'PASS_BID' })}
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold py-2 rounded-lg text-sm"
            >
              Continue
            </button>
          </div>
        ) : (
          <div>
            {currentBidderId && (
              <div className="mb-4">
                <div className="text-sm text-stone-300 mb-2">
                  Bidding: <span className="font-bold">{gameState.players[currentBidderId]?.name}</span>
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={e => setBidAmount(Number(e.target.value))}
                    min={decision.currentBid + 1}
                    className="flex-1 bg-stone-700 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => {
                      dispatch({ type: 'PLACE_BID', playerId: currentBidderId, amount: bidAmount });
                      setBidAmount(decision.currentBid + 2);
                    }}
                    disabled={bidAmount <= decision.currentBid}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-600 text-white px-4 py-2 rounded text-sm font-bold"
                  >
                    Bid
                  </button>
                </div>
                <button
                  onClick={() => dispatch({ type: 'PASS_BID' })}
                  className="text-stone-400 hover:text-stone-200 text-sm"
                >
                  Pass
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
