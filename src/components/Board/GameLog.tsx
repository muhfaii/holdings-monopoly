import { useGameStore } from '../../store/gameStore';

export function GameLog() {
  const history = useGameStore(s => s.gameState?.history ?? []);

  const recentEvents = history.slice(-20);

  return (
    <div className="bg-stone-800 rounded-lg p-3 border border-stone-600 h-full overflow-y-auto">
      <div className="text-xs font-bold text-stone-400 mb-2">Game Log</div>
      <div className="space-y-0.5">
        {recentEvents.length === 0 && (
          <div className="text-xs text-stone-600">No events yet</div>
        )}
        {recentEvents.map((event, i) => (
          <div key={i} className="text-xs text-stone-400 font-mono">
            {formatEvent(event)}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatEvent(event: any): string {
  switch (event.type) {
    case 'GAME_STARTED':
      return `Game started with ${event.playerIds.length} players`;
    case 'DICE_ROLLED':
      return `${event.playerId} rolled ${event.die1}+${event.die2}${event.doubles ? ' (doubles!)' : ''}`;
    case 'PLAYER_MOVED':
      return `${event.playerId} moved from ${event.from} → ${event.to}`;
    case 'PASSED_GO':
      return `${event.playerId} passed GO, collected $${event.collected}`;
    case 'PROPERTY_BOUGHT':
      return `${event.playerId} bought property #${event.propertyId} for $${event.price}`;
    case 'AUCTION_WON':
      return `${event.playerId} won auction for property #${event.propertyId} with bid $${event.bid}`;
    case 'RENT_PAID':
      return `${event.fromPlayerId} paid $${event.amount} rent to ${event.toPlayerId} for property #${event.propertyId}`;
    case 'TAX_PAID':
      return `${event.playerId} paid $${event.amount} tax`;
    case 'KOPITIAM_COLLECTED':
      return `${event.playerId} collected $${event.amount} from Kopitiam pot!`;
    case 'SENT_TO_JAIL':
      return `${event.playerId} was sent to jail`;
    case 'JAIL_FINE_PAID':
      return `${event.playerId} paid $50 to leave jail`;
    case 'JAIL_DOUBLES_ESCAPE':
      return `${event.playerId} rolled doubles to escape jail`;
    case 'JAIL_CARD_ESCAPE':
      return `${event.playerId} used Get Out of Jail Free card`;
    case 'JAIL_TIME_SERVED':
      return `${event.playerId} served time and left jail`;
    case 'PLAYER_BANKRUPT':
      return `${event.playerId} is bankrupt!`;
    case 'GAME_ENDED':
      return `Game over! ${event.winnerId} wins!`;
    case 'HOUSE_BUILT':
      return `${event.playerId} built a house on #${event.propertyId} ($${event.cost}) → ${event.houses} house(s)`;
    case 'HOTEL_BUILT':
      return `${event.playerId} built a hotel on #${event.propertyId} ($${event.cost})`;
    case 'HOUSE_SOLD':
      return `${event.playerId} sold a house on #${event.propertyId} (+$${event.refund}) → ${event.houses} house(s)`;
    case 'HOTEL_SOLD':
      return `${event.playerId} sold a hotel on #${event.propertyId} (+$${event.refund})`;
    default:
      return JSON.stringify(event);
  }
}