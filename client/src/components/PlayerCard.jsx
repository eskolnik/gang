import Card, { CardBack } from './Card';
import Token from './Token';
import { HandEvaluator } from '../game/utils/handEvaluator';
import './PlayerCard.css';

const PlayerCard = ({
  player,
  isMe,
  isCurrentTurn,
  gameState,
  myPocketCards,
  onTokenClick
}) => {
  const hasPocketCards = gameState.phase !== 'waiting';
  const currentToken = gameState.tokenAssignments?.[player.id];

  // Evaluate hand for highlighting best cards (only for me)
  let evaluation = null;
  if (isMe && myPocketCards && myPocketCards.length > 0) {
    evaluation = HandEvaluator.evaluateHand(
      myPocketCards,
      gameState.communityCards || []
    );
  }

  const isInBestHand = (card) => {
    return evaluation && HandEvaluator.isCardInBestHand(card, evaluation.cards);
  };

  return (
    <div className={`player-card ${isMe ? 'player-card-me' : ''} ${isCurrentTurn ? 'player-card-active' : ''}`}>
      {/* Token above my card, inside others' cards */}
      {currentToken !== undefined && isMe && (
        <div className="player-token-outside">
          <Token
            number={currentToken}
            isSelected={true}
            phase={gameState.phase}
          />
        </div>
      )}

      {/* Player name */}
      <div className="player-name">{player.name}{isMe ? ' (You)' : ''}</div>

      {/* Pocket cards or card backs */}
      {hasPocketCards && (
        <div className="player-cards">
          {isMe && myPocketCards && myPocketCards.length > 0 ? (
            // Show actual cards for me
            myPocketCards.map((card, i) => (
              <Card
                key={i}
                card={card}
                isInBestHand={isInBestHand(card)}
              />
            ))
          ) : (
            // Show card backs for others
            <>
              <CardBack size="small" />
              <CardBack size="small" />
            </>
          )}
        </div>
      )}

      {/* Token inside others' cards */}
      {currentToken !== undefined && !isMe && (
        <div className="player-token-inside">
          <Token
            number={currentToken}
            isSelected={false}
            phase={gameState.phase}
            size="small"
            onClick={
              gameState.currentTurn === gameState.myPlayerId && gameState.phase.includes('betting')
                ? () => onTokenClick(currentToken)
                : null
            }
          />
        </div>
      )}

      {/* Hand evaluation text (only for me) */}
      {isMe && evaluation && (
        <div className="hand-evaluation">{evaluation.description}</div>
      )}
    </div>
  );
};

export default PlayerCard;
