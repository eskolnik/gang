import Card, { CardBack } from './Card';
import './Table.css';

const Table = ({ players, children, currentTurn, myPlayerId, gameState, onTokenClick }) => {
  const playerCount = players.length;

  if (playerCount === 0) {
    return (
      <div className="table-container">
        <div className="table-circle">
          <div className="table-center">{children}</div>
        </div>
      </div>
    );
  }

  const angleIncrement = 360 / playerCount;

  return (
    <div className="table-container">
      {/* Invisible large circle for layout */}
      <div className="table-layout-circle">
        {/* Player slices */}
        {players.map((player, i) => {
          // Start at 90 degrees (bottom) so first player is at bottom
          const angle = 90 + (angleIncrement * i);
          const isMe = player.id === myPlayerId;
          const isCurrentTurn = player.id === currentTurn;
          const playerToken = gameState.tokenAssignments?.[player.id];

          return (
            <div
              key={player.id}
              className="player-slice"
              style={{
                transform: `rotate(${angle}deg)`
              }}
            >
              {/* Player component at outer edge */}
              <div
                className="player-outer"
                style={{
                  transform: `translate(-50%, -50%) rotate(-${angle}deg)`
                }}
              >
                <PlayerInfo
                  player={player}
                  isMe={isMe}
                  isCurrentTurn={isCurrentTurn}
                  myPocketCards={isMe ? gameState.myPocketCards : null}
                  gameState={gameState}
                />
              </div>

              {/* Token at inner edge (if player has one) */}
              {playerToken !== undefined && (
                <div
                  className="player-token-inner"
                  style={{
                    transform: `translate(-50%, -50%) rotate(-${angle}deg)`
                  }}
                >
                  <TokenDisplay
                    number={playerToken}
                    phase={gameState.phase}
                    isMyToken={isMe}
                    canClick={!isMe && currentTurn === myPlayerId && gameState.phase.includes('betting')}
                    onClick={onTokenClick}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Visible poker table circle */}
        <div className="table-circle">
          {/* Center area for community cards and token pool */}
          <div className="table-center">{children}</div>
        </div>
      </div>
    </div>
  );
};

// PlayerInfo sub-component
const PlayerInfo = ({ player, isMe, isCurrentTurn, myPocketCards, gameState }) => {
  const hasPocketCards = gameState.phase !== 'waiting';

  // Get historical tokens for this player from previous rounds
  const tokenHistory = gameState.bettingRoundHistory?.map(round => {
    return round.tokenAssignments[player.id];
  }).filter(token => token !== undefined) || [];

  return (
    <div className={`player-info ${isMe ? 'player-info-me' : ''} ${isCurrentTurn ? 'player-info-active' : ''}`}>
      <div className="player-name">{player.name}{isMe ? ' (You)' : ''}</div>

      {hasPocketCards && (
        <div className="player-cards-display">
          {isMe && myPocketCards && myPocketCards.length > 0 ? (
            // Show actual cards for me (using Card component for better display)
            <div className="pocket-cards-me">
              {myPocketCards.map((card, i) => (
                <Card key={i} card={card} size="small" />
              ))}
            </div>
          ) : (
            // Show card backs for others
            <div className="card-backs">
              <CardBack size="small" />
              <CardBack size="small" />
            </div>
          )}
        </div>
      )}

      {/* Token history from previous rounds */}
      {tokenHistory.length > 0 && (
        <div className="token-history">
          {tokenHistory.map((token, i) => (
            <div key={i} className="token-history-item" style={{
              backgroundColor: ['#ffffff', '#ffff00', '#ff9900', '#ff0000'][i]
            }}>
              {token}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// TokenDisplay sub-component
const TokenDisplay = ({ number, phase, isMyToken, canClick, onClick }) => {
  const roundColors = {
    'betting_1': '#ffffff',
    'betting_2': '#ffff00',
    'betting_3': '#ff9900',
    'betting_4': '#ff0000'
  };

  const color = roundColors[phase] || '#ffd700';

  return (
    <div
      className={`token-display ${canClick ? 'token-clickable' : ''} ${isMyToken ? 'token-mine' : ''}`}
      style={{ backgroundColor: color }}
      onClick={canClick ? () => onClick(number) : undefined}
    >
      {number}
    </div>
  );
};

export default Table;
