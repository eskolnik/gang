import Card, { CardBack } from './Card';
import { HandEvaluator } from '../game/utils/handEvaluator';
import './Table.css';

// Helper to check if a card is in best hand for highlighting
const isCardInBestHand = (card, myPocketCards, communityCards) => {
  if (!myPocketCards || myPocketCards.length === 0) return false;
  const evaluation = HandEvaluator.evaluateHand(myPocketCards, communityCards || []);
  return evaluation && HandEvaluator.isCardInBestHand(card, evaluation.cards);
};

const Table = ({ players, children, currentTurn, myPlayerId, gameState, onTokenClick }) => {
  // Define fixed slots: 1 top, 2 left, 2 right, 1 bottom
  // Same view for all players - no reordering
  const FIXED_SLOTS = [
    { id: 'seat-0', position: 'top', index: 0 },
    { id: 'seat-1', position: 'left-top', index: 1 },
    { id: 'seat-2', position: 'left-bottom', index: 2 },
    { id: 'seat-3', position: 'right-top', index: 3 },
    { id: 'seat-4', position: 'right-bottom', index: 4 },
    { id: 'seat-5', position: 'bottom', index: 5 },
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
        {/* Top seat */}
        <div className="seat-area seat-top">
          {playerSlots[0].player && (
            <PlayerInfo
              player={playerSlots[0].player}
              isMe={playerSlots[0].isMe}
              isCurrentTurn={playerSlots[0].isCurrentTurn}
              myPocketCards={playerSlots[0].isMe ? gameState.myPocketCards : null}
              gameState={gameState}
            />
          )}
        </div>

        {/* Middle section with left seats, table, right seats */}
        <div className="table-middle">
          {/* Left seats */}
          <div className="seat-column seat-left">
            {playerSlots[1].player && (
              <div className="seat-area">
                <PlayerInfo
                  player={playerSlots[1].player}
                  isMe={playerSlots[1].isMe}
                  isCurrentTurn={playerSlots[1].isCurrentTurn}
                  myPocketCards={playerSlots[1].isMe ? gameState.myPocketCards : null}
                  gameState={gameState}
                />
              </div>
            )}
            {playerSlots[2].player && (
              <div className="seat-area">
                <PlayerInfo
                  player={playerSlots[2].player}
                  isMe={playerSlots[2].isMe}
                  isCurrentTurn={playerSlots[2].isCurrentTurn}
                  myPocketCards={playerSlots[2].isMe ? gameState.myPocketCards : null}
                  gameState={gameState}
                />
              </div>
            )}
          </div>

          {/* Table surface with fixed zones */}
          <div className="table-surface">
            {/* Community cards zone - top of table */}
            <div className="table-zone zone-community">
              {gameState.communityCards && gameState.communityCards.length > 0 && (
                <div className="community-cards">
                  {gameState.communityCards.map((card, i) => {
                    // Check if card is in best hand for highlighting
                    const isInBestHand = myPlayerId && gameState.myPocketCards ?
                      isCardInBestHand(card, gameState.myPocketCards, gameState.communityCards) : false;
                    return <Card key={i} card={card} isInBestHand={isInBestHand} />;
                  })}
                </div>
              )}
            </div>

            {/* Token pool zone - center of table */}
            <div className="table-zone zone-token-pool">
              {gameState.phase.includes('betting') && gameState.tokenPool && gameState.tokenPool.length > 0 && (
                <div className="token-pool">
                  {[...gameState.tokenPool].sort((a, b) => a - b).map((tokenNum) => (
                    <TokenDisplay
                      key={tokenNum}
                      number={tokenNum}
                      phase={gameState.phase}
                      isMyToken={false}
                      canClick={gameState.currentTurn === myPlayerId}
                      onClick={() => onTokenClick(tokenNum)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Player token zones - fixed positions around table edge */}
            <div className="table-zone zone-player-tokens">
              {playerSlots.map((slot, idx) => (
                slot.player && slot.playerToken !== undefined && (
                  <div key={slot.id} className={`player-token-spot spot-${slot.position}`}>
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
          </div>

          {/* Right seats */}
          <div className="seat-column seat-right">
            {playerSlots[3].player && (
              <div className="seat-area">
                <PlayerInfo
                  player={playerSlots[3].player}
                  isMe={playerSlots[3].isMe}
                  isCurrentTurn={playerSlots[3].isCurrentTurn}
                  myPocketCards={playerSlots[3].isMe ? gameState.myPocketCards : null}
                  gameState={gameState}
                />
              </div>
            )}
            {playerSlots[4].player && (
              <div className="seat-area">
                <PlayerInfo
                  player={playerSlots[4].player}
                  isMe={playerSlots[4].isMe}
                  isCurrentTurn={playerSlots[4].isCurrentTurn}
                  myPocketCards={playerSlots[4].isMe ? gameState.myPocketCards : null}
                  gameState={gameState}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom seat */}
        <div className="seat-area seat-bottom">
          {playerSlots[5].player && (
            <PlayerInfo
              player={playerSlots[5].player}
              isMe={playerSlots[5].isMe}
              isCurrentTurn={playerSlots[5].isCurrentTurn}
              myPocketCards={playerSlots[5].isMe ? gameState.myPocketCards : null}
              gameState={gameState}
            />
          )}
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
    <div className={`player-info ${isCurrentTurn ? 'player-info-active' : ''} ${isMe ? 'player-info-me' : ''}`}>
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
