import Card, { CardBack } from "./Card";
import { HandEvaluator } from "../game/utils/handEvaluator";
import "./Table.css";

// Helper to check if a card is in best hand for highlighting
const isCardInBestHand = (card, myPocketCards, communityCards) => {
  if (!myPocketCards || myPocketCards.length === 0) return false;
  const evaluation = HandEvaluator.evaluateHand(
    myPocketCards,
    communityCards || []
  );
  return evaluation && HandEvaluator.isCardInBestHand(card, evaluation.cards);
};

const Table = ({
  players,
  currentTurn,
  myPlayerId,
  gameState,
  onTokenClick,
}) => {
  // Define fixed slots: 2 top, 1 left, 1 right, 2 bottom
  // Same view for all players - no reordering
  const FIXED_SLOTS = [
    { id: "seat-0", position: "top-left", index: 0 },
    { id: "seat-1", position: "top-right", index: 1 },
    { id: "seat-2", position: "left", index: 2 },
    { id: "seat-3", position: "right", index: 3 },
    { id: "seat-4", position: "bottom-left", index: 4 },
    { id: "seat-5", position: "bottom-right", index: 5 },
  ];

  // Map players to fixed slots
  const playerSlots = FIXED_SLOTS.map((slot) => {
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
      playerToken,
    };
  });

  return (
    <div className="table-container">
      <div className="table-layout">
        {/* Top seats - 2 seats */}
        <div className="seat-row seat-top">
          {playerSlots[0].player && (
            <div className="seat-area">
              <PlayerInfo
                player={playerSlots[0].player}
                isMe={playerSlots[0].isMe}
                isCurrentTurn={playerSlots[0].isCurrentTurn}
                myPocketCards={
                  playerSlots[0].isMe ? gameState.myPocketCards : null
                }
                gameState={gameState}
              />
            </div>
          )}
          {playerSlots[1].player && (
            <div className="seat-area">
              <PlayerInfo
                player={playerSlots[1].player}
                isMe={playerSlots[1].isMe}
                isCurrentTurn={playerSlots[1].isCurrentTurn}
                myPocketCards={
                  playerSlots[1].isMe ? gameState.myPocketCards : null
                }
                gameState={gameState}
              />
            </div>
          )}
        </div>

        {/* Middle section with left seat, table, right seat */}
        <div className="table-middle">
          {/* Left seat */}
          <div className="seat-area seat-left">
            {playerSlots[2].player && (
              <PlayerInfo
                player={playerSlots[2].player}
                isMe={playerSlots[2].isMe}
                isCurrentTurn={playerSlots[2].isCurrentTurn}
                myPocketCards={
                  playerSlots[2].isMe ? gameState.myPocketCards : null
                }
                gameState={gameState}
              />
            )}
          </div>

          {/* Table surface with grid layout */}
          <div className="table-surface">
            {/* Top row: tokens for top-left and top-right seats */}
            <div className="table-surface-top">
              <div className="token-slot token-slot-top-left">
                {playerSlots[0].player &&
                  playerSlots[0].playerToken !== undefined && (
                    <TokenDisplay
                      number={playerSlots[0].playerToken}
                      phase={gameState.phase}
                      isMyToken={playerSlots[0].isMe}
                      canClick={
                        !playerSlots[0].isMe &&
                        currentTurn === myPlayerId &&
                        gameState.phase.includes("betting")
                      }
                      onClick={onTokenClick}
                    />
                  )}
              </div>
              <div className="token-slot token-slot-top-right">
                {playerSlots[1].player &&
                  playerSlots[1].playerToken !== undefined && (
                    <TokenDisplay
                      number={playerSlots[1].playerToken}
                      phase={gameState.phase}
                      isMyToken={playerSlots[1].isMe}
                      canClick={
                        !playerSlots[1].isMe &&
                        currentTurn === myPlayerId &&
                        gameState.phase.includes("betting")
                      }
                      onClick={onTokenClick}
                    />
                  )}
              </div>
            </div>

            {/* Middle row: left token, center content, right token */}
            <div className="table-surface-middle">
              <div className="token-slot token-slot-left">
                {playerSlots[2].player &&
                  playerSlots[2].playerToken !== undefined && (
                    <TokenDisplay
                      number={playerSlots[2].playerToken}
                      phase={gameState.phase}
                      isMyToken={playerSlots[2].isMe}
                      canClick={
                        !playerSlots[2].isMe &&
                        currentTurn === myPlayerId &&
                        gameState.phase.includes("betting")
                      }
                      onClick={onTokenClick}
                    />
                  )}
              </div>

              <div className="table-center">
                {/* Community cards */}
                {gameState.communityCards &&
                  gameState.communityCards.length > 0 && (
                    <div className="community-cards">
                      {gameState.communityCards.map((card, i) => {
                        const isInBestHand =
                          myPlayerId && gameState.myPocketCards
                            ? isCardInBestHand(
                                card,
                                gameState.myPocketCards,
                                gameState.communityCards
                              )
                            : false;
                        return (
                          <Card
                            key={i}
                            card={card}
                            isInBestHand={isInBestHand}
                            size="small"
                          />
                        );
                      })}
                      {Array.from(Array(5).keys())
                        .slice(gameState.communityCards.length)
                        .map((i) => (
                          <div className="card-small" />
                        ))}
                    </div>
                  )}

                {/* Token pool */}
                <div className="token-pool">
                  {gameState.tokenPool &&
                    gameState.tokenPool.length > 0 &&
                    [...gameState.tokenPool]
                      .sort((a, b) => a - b)
                      .map((tokenNum) => (
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
              </div>

              <div className="token-slot token-slot-right">
                {playerSlots[3].player &&
                  playerSlots[3].playerToken !== undefined && (
                    <TokenDisplay
                      number={playerSlots[3].playerToken}
                      phase={gameState.phase}
                      isMyToken={playerSlots[3].isMe}
                      canClick={
                        !playerSlots[3].isMe &&
                        currentTurn === myPlayerId &&
                        gameState.phase.includes("betting")
                      }
                      onClick={onTokenClick}
                    />
                  )}
              </div>
            </div>

            {/* Bottom row: tokens for bottom-left and bottom-right seats */}
            <div className="table-surface-bottom">
              <div className="token-slot token-slot-bottom-left">
                {playerSlots[4].player &&
                  playerSlots[4].playerToken !== undefined && (
                    <TokenDisplay
                      number={playerSlots[4].playerToken}
                      phase={gameState.phase}
                      isMyToken={playerSlots[4].isMe}
                      canClick={
                        !playerSlots[4].isMe &&
                        currentTurn === myPlayerId &&
                        gameState.phase.includes("betting")
                      }
                      onClick={onTokenClick}
                    />
                  )}
              </div>
              <div className="token-slot token-slot-bottom-right">
                {playerSlots[5].player &&
                  playerSlots[5].playerToken !== undefined && (
                    <TokenDisplay
                      number={playerSlots[5].playerToken}
                      phase={gameState.phase}
                      isMyToken={playerSlots[5].isMe}
                      canClick={
                        !playerSlots[5].isMe &&
                        currentTurn === myPlayerId &&
                        gameState.phase.includes("betting")
                      }
                      onClick={onTokenClick}
                    />
                  )}
              </div>
            </div>
          </div>

          {/* Right seat */}
          <div className="seat-area seat-right">
            {playerSlots[3].player && (
              <PlayerInfo
                player={playerSlots[3].player}
                isMe={playerSlots[3].isMe}
                isCurrentTurn={playerSlots[3].isCurrentTurn}
                myPocketCards={
                  playerSlots[3].isMe ? gameState.myPocketCards : null
                }
                gameState={gameState}
              />
            )}
          </div>
        </div>

        {/* Bottom seats - 2 seats */}
        <div className="seat-row seat-bottom">
          {playerSlots[4].player && (
            <div className="seat-area">
              <PlayerInfo
                player={playerSlots[4].player}
                isMe={playerSlots[4].isMe}
                isCurrentTurn={playerSlots[4].isCurrentTurn}
                myPocketCards={
                  playerSlots[4].isMe ? gameState.myPocketCards : null
                }
                gameState={gameState}
              />
            </div>
          )}
          {playerSlots[5].player && (
            <div className="seat-area">
              <PlayerInfo
                player={playerSlots[5].player}
                isMe={playerSlots[5].isMe}
                isCurrentTurn={playerSlots[5].isCurrentTurn}
                myPocketCards={
                  playerSlots[5].isMe ? gameState.myPocketCards : null
                }
                gameState={gameState}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// PlayerInfo sub-component
const PlayerInfo = ({
  player,
  isMe,
  isCurrentTurn,
  myPocketCards,
  gameState,
}) => {
  const hasPocketCards = gameState.phase !== "waiting";
  const isHost = player.id === gameState.hostId;

  // Get historical tokens for this player from previous rounds
  const tokenHistory =
    gameState.bettingRoundHistory
      ?.map((round) => {
        return round.tokenAssignments[player.id];
      })
      .filter((token) => token !== undefined) || [];

  return (
    <div
      className={`player-info ${isCurrentTurn ? "player-info-active" : ""} ${
        isMe ? "player-info-me" : ""
      }`}
    >
      <div className="player-name">
        {isHost && "👑 "}
        {player.name}
        {isMe ? " (You)" : ""}
      </div>

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
            <div
              key={i}
              className="token-history-item"
              style={{
                backgroundColor: ["#ffffff", "#ffff00", "#ff9900", "#ff0000"][
                  i
                ],
              }}
            >
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
    betting_1: "#ffffff",
    betting_2: "#ffff00",
    betting_3: "#ff9900",
    betting_4: "#ff0000",
  };

  const color = roundColors[phase] || "#ffd700";

  return (
    <div
      className={`token-display ${canClick ? "token-clickable" : ""} ${
        isMyToken ? "token-mine" : ""
      }`}
      style={{ backgroundColor: color }}
      onClick={canClick ? () => onClick(number) : undefined}
    >
      {number}
    </div>
  );
};

export default Table;
