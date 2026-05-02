import { useGameStore } from '../../store/gameStore';
import { BuyPropertyModal } from './BuyPropertyModal';
import { AuctionModal } from './AuctionModal';
import { JailModal } from './JailModal';
import { BankruptcyModal } from './BankruptcyModal';
import { CardModal } from './CardModal';

export function DecisionModalRouter() {
  const gameState = useGameStore(s => s.gameState)!;
  const decision = gameState.turn.pendingDecision;

  if (!decision) return null;

  switch (decision.type) {
    case 'AWAIT_BUY_DECISION':
      return <BuyPropertyModal decision={decision} />;
    case 'AWAIT_AUCTION_BID':
      return <AuctionModal decision={decision} />;
    case 'AWAIT_JAIL_DECISION':
      return <JailModal decision={decision} />;
    case 'AWAIT_BANKRUPTCY_LIQUIDATION':
      return <BankruptcyModal decision={decision} />;
    case 'AWAIT_CARD_ACKNOWLEDGEMENT':
      return <CardModal decision={decision} />;
    default:
      return null;
  }
}
