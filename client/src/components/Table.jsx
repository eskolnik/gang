import Card, { CardBack } from './Card';
import './Table.css';

const Table = ({ players, children, currentTurn, myPlayerId, gameState, onTokenClick }) => {
  const playerCount = players.length;

  if (playerCount === 0) {
    return (
      <div className="table-container">
        <div className="table-rectangle">
          <div className="table-center">{children}</div>
        </div>
      </div>
    );
  }

  // Position players around rectangular table
  // For a rectangular table, distribute players: bottom (me), top, left, right
  const positionedPlayers = players.map((player, i) => {
    const isMe = player.id === myPlayerId;
    const isCurrentTurn = player.id === currentTurn;
    const playerToken = gameState.tokenAssignments?.[player.id];

    // Position assignment based on index
    // Bottom: index 0 (typically the current player)
    // Top: indices 1-3
    // Left: index 4
    // Right: index 5
    let position, slotIndex;

    if (i === 0) {
      position = 'bottom';
      slotIndex = 1; // center of bottom
    } else if (i <= 3) {
      position = 'top';
      slotIndex = i - 1; // 0, 1, 2
    } else if (i === 4) {
      position = 'left';
      slotIndex = 0;
    } else {
      position = 'right';
      slotIndex = 0;
    }

    return { player, isMe, isCurrentTurn, playerToken, position, slotIndex };
  });

  return (
    <div className="table-container">
      <div className="table-layout">
        {/* Top players */}
        <div className="players-row players-top">
          {positionedPlayers.filter(p => p.position === 'top').map(({ player, isMe, isCurrentTurn, playerToken }) => (
            <div key={player.id} className="player-position">
              <PlayerInfo
                player={player}
                isMe={isMe}
                isCurrentTurn={isCurrentTurn}
                myPocketCards={isMe ? gameState.myPocketCards : null}
                gameState={gameState}
              />
              {playerToken !== undefined && (
                <TokenDisplay
                  number={playerToken}
                  phase={gameState.phase}
                  isMyToken={isMe}
                  canClick={!isMe && currentTurn === myPlayerId && gameState.phase.includes('betting')}
                  onClick={onTokenClick}
                />
              )}
            </div>
          ))}
        </div>

        {/* Middle row with left player, table, right player */}
        <div className="table-middle">
          <div className="players-column players-left">
            {positionedPlayers.filter(p => p.position === 'left').map(({ player, isMe, isCurrentTurn, playerToken }) => (
              <div key={player.id} className="player-position">
                <PlayerInfo
                  player={player}
                  isMe={isMe}
                  isCurrentTurn={isCurrentTurn}
                  myPocketCards={isMe ? gameState.myPocketCards : null}
                  gameState={gameState}
                />
                {playerToken !== undefined && (
                  <TokenDisplay
                    number={playerToken}
                    phase={gameState.phase}
                    isMyToken={isMe}
                    canClick={!isMe && currentTurn === myPlayerId && gameState.phase.includes('betting')}
                    onClick={onTokenClick}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Rectangular table */}
          <div className="table-rectangle">
            <div className="table-center">{children}</div>
          </div>

          <div className="players-column players-right">
            {positionedPlayers.filter(p => p.position === 'right').map(({ player, isMe, isCurrentTurn, playerToken }) => (
              <div key={player.id} className="player-position">
                <PlayerInfo
                  player={player}
                  isMe={isMe}
                  isCurrentTurn={isCurrentTurn}
                  myPocketCards={isMe ? gameState.myPocketCards : null}
                  gameState={gameState}
                />
                {playerToken !== undefined && (
                  <TokenDisplay
                    number={playerToken}
                    phase={gameState.phase}
                    isMyToken={isMe}
                    canClick={!isMe && currentTurn === myPlayerId && gameState.phase.includes('betting')}
                    onClick={onTokenClick}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom players */}
        <div className="players-row players-bottom">
          {positionedPlayers.filter(p => p.position === 'bottom').map(({ player, isMe, isCurrentTurn, playerToken }) => (
            <div key={player.id} className="player-position">
              <PlayerInfo
                player={player}
                isMe={isMe}
                isCurrentTurn={isCurrentTurn}
                myPocketCards={isMe ? gameState.myPocketCards : null}
                gameState={gameState}
              />
              {playerToken !== undefined && (
                <TokenDisplay
                  number={playerToken}
                  phase={gameState.phase}
                  isMyToken={isMe}
                  canClick={!isMe && currentTurn === myPlayerId && gameState.phase.includes('betting')}
                  onClick={onTokenClick}
                />
              )}
            </div>
          ))}
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
    <div className={`player-info ${isCurrentTurn ? 'player-info-active' : ''}`}>
      <div className="player-name">{player.name}{isMe ? ' (You)' : ''}</div>

      {hasPocketCards && (
        <div className="player-cards-container">
          <div className="player-cards-display">
            {isMe && myPocketCards && myPocketCards.length > 0 ? (
              // Show actual cards for me (using Card component for better display)
              <div className="pocket-cards">
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

          {/* Token history from previous rounds - horizontal line below cards */}
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
