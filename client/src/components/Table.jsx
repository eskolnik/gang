import Card, { CardBack } from './Card';
import './Table.css';

const Table = ({ players, children, currentTurn, myPlayerId, gameState, onTokenClick }) => {
  // Define fixed slots for up to 8 players
  // Slots are positioned: bottom center (me), top-left, top-center, top-right, left, right
  const FIXED_SLOTS = [
    { id: 'bottom-center', position: 'bottom', index: 0 },
    { id: 'top-left', position: 'top-left', index: 1 },
    { id: 'top-center', position: 'top-center', index: 2 },
    { id: 'top-right', position: 'top-right', index: 3 },
    { id: 'left', position: 'left', index: 4 },
    { id: 'right', position: 'right', index: 5 },
  ];

  // Map players to fixed slots
  const playerSlots = FIXED_SLOTS.map(slot => {
    const player = players[slot.index];
    if (!player) return { ...slot, player: null };

    const isMe = player.id === myPlayerId;
    const isCurrentTurn = player.id === currentTurn;
    const playerToken = gameState.tokenAssignments?.[player.id];

    return {
      ...slot,
      player,
      isMe,
      isCurrentTurn,
      playerToken
    };
  });

  return (
    <div className="table-container">
      <div className="table-layout">
        {/* Top row - 3 fixed slots */}
        <div className="players-row players-top">
          {playerSlots.filter(s => s.position.startsWith('top')).map(slot => (
            <div key={slot.id} className={`player-slot slot-${slot.position}`}>
              {slot.player && (
                <PlayerInfo
                  player={slot.player}
                  isMe={slot.isMe}
                  isCurrentTurn={slot.isCurrentTurn}
                  myPocketCards={slot.isMe ? gameState.myPocketCards : null}
                  gameState={gameState}
                />
              )}
            </div>
          ))}
        </div>

        {/* Middle row with left slot, table, right slot */}
        <div className="table-middle">
          {/* Left slot */}
          {playerSlots.filter(s => s.position === 'left').map(slot => (
            <div key={slot.id} className={`player-slot slot-${slot.position}`}>
              {slot.player && (
                <PlayerInfo
                  player={slot.player}
                  isMe={slot.isMe}
                  isCurrentTurn={slot.isCurrentTurn}
                  myPocketCards={slot.isMe ? gameState.myPocketCards : null}
                  gameState={gameState}
                />
              )}
            </div>
          ))}

          {/* Rectangular table with token positions */}
          <div className="table-rectangle-wrapper">
            <div className="table-rectangle">
              <div className="table-center">{children}</div>
            </div>

            {/* Tokens positioned on table surface */}
            {playerSlots.map(slot => (
              slot.player && slot.playerToken !== undefined && (
                <div key={`token-${slot.id}`} className={`token-on-table token-${slot.position}`}>
                  <TokenDisplay
                    number={slot.playerToken}
                    phase={gameState.phase}
                    isMyToken={slot.isMe}
                    canClick={!slot.isMe && currentTurn === myPlayerId && gameState.phase.includes('betting')}
                    onClick={onTokenClick}
                  />
                </div>
              )
            ))}
          </div>

          {/* Right slot */}
          {playerSlots.filter(s => s.position === 'right').map(slot => (
            <div key={slot.id} className={`player-slot slot-${slot.position}`}>
              {slot.player && (
                <PlayerInfo
                  player={slot.player}
                  isMe={slot.isMe}
                  isCurrentTurn={slot.isCurrentTurn}
                  myPocketCards={slot.isMe ? gameState.myPocketCards : null}
                  gameState={gameState}
                />
              )}
            </div>
          ))}
        </div>

        {/* Bottom row - 1 fixed slot */}
        <div className="players-row players-bottom">
          {playerSlots.filter(s => s.position === 'bottom').map(slot => (
            <div key={slot.id} className={`player-slot slot-${slot.position}`}>
              {slot.player && (
                <PlayerInfo
                  player={slot.player}
                  isMe={slot.isMe}
                  isCurrentTurn={slot.isCurrentTurn}
                  myPocketCards={slot.isMe ? gameState.myPocketCards : null}
                  gameState={gameState}
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

      {/* Always show cards container to maintain consistent size */}
      <div className="player-cards-container">
        <div className="player-cards-display">
          {hasPocketCards ? (
            // Show cards when in play
            isMe && myPocketCards && myPocketCards.length > 0 ? (
              // Show actual cards for me
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
            )
          ) : (
            // Show empty card frames when waiting
            <div className="card-frames-empty">
              <div className="card-frame-empty" />
              <div className="card-frame-empty" />
            </div>
          )}
        </div>

        {/* Token history from previous rounds - always render container for consistent height */}
        <div className="token-history">
          {tokenHistory.map((token, i) => (
            <div key={i} className="token-history-item" style={{
              backgroundColor: ['#ffffff', '#ffff00', '#ff9900', '#ff0000'][i]
            }}>
              {token}
            </div>
          ))}
        </div>
      </div>
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
