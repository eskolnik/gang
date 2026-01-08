import { useState, useEffect } from "react";
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
  onSetReady,
  gameResult,
  revealedHands = [],
  showFinalResult = false,
  visibleCommunityCards = 0,
}) => {
  const [lastTokenAssignments, setLastTokenAssignments] = useState({});
  const [newlyClaimedTokens, setNewlyClaimedTokens] = useState(new Set());

  // Track newly claimed tokens for animation
  useEffect(() => {
    if (!gameState?.tokenAssignments) return;

    const currentAssignments = gameState.tokenAssignments;
    const newClaims = new Set();

    // Check for new token assignments
    Object.keys(currentAssignments).forEach(playerId => {
      if (!lastTokenAssignments[playerId] && currentAssignments[playerId] !== undefined) {
        newClaims.add(playerId);
      }
    });

    if (newClaims.size > 0) {
      setNewlyClaimedTokens(newClaims);
      // Clear the animation state after animation completes
      setTimeout(() => setNewlyClaimedTokens(new Set()), 600);
    }

    setLastTokenAssignments(currentAssignments);
  }, [gameState?.tokenAssignments]);

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
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[0].player.id)}
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
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[1].player.id)}
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
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[2].player.id)}
              />
            )}
          </div>

          {/* Table surface with grid layout */}
          <div className="table-surface">
            {/* Top row: tokens for top-left and top-right seats */}
            <div className="table-surface-top">
              {gameResult && showFinalResult ? (
                <div className="game-outcome game-outcome-animate">
                  <h2
                    className={
                      gameResult.success ? "result-win" : "result-lose"
                    }
                  >
                    {gameResult.success ? "Victory!" : "Defeat"}
                  </h2>
                </div>
              ) : (
                <>
                  <div className="token-slot token-slot-top-left">
                    {!gameResult &&
                      playerSlots[0].player &&
                      playerSlots[0].playerToken !== undefined && (
                        <TokenDisplay
                          number={playerSlots[0].playerToken}
                          phase={gameState.phase}
                          isMyToken={playerSlots[0].isMe}
                          isNewlyClaimed={newlyClaimedTokens.has(playerSlots[0].player.id)}
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
                    {!gameResult &&
                      playerSlots[1].player &&
                      playerSlots[1].playerToken !== undefined && (
                        <TokenDisplay
                          number={playerSlots[1].playerToken}
                          phase={gameState.phase}
                          isMyToken={playerSlots[1].isMe}
                          isNewlyClaimed={newlyClaimedTokens.has(playerSlots[1].player.id)}
                          canClick={
                            !playerSlots[1].isMe &&
                            currentTurn === myPlayerId &&
                            gameState.phase.includes("betting")
                          }
                          onClick={onTokenClick}
                        />
                      )}
                  </div>
                </>
              )}
            </div>

            {/* Middle row: left token, center content, right token */}
            <div className="table-surface-middle">
              <div className="token-slot token-slot-left">
                {!gameResult &&
                  playerSlots[2].player &&
                  playerSlots[2].playerToken !== undefined && (
                    <TokenDisplay
                      number={playerSlots[2].playerToken}
                      phase={gameState.phase}
                      isMyToken={playerSlots[2].isMe}
                      isNewlyClaimed={newlyClaimedTokens.has(playerSlots[2].player.id)}
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
                <div className="community-cards-container">
                  {gameState.communityCards &&
                    gameState.communityCards.length > 0 && (
                      <div className="community-cards">
                        {gameState.communityCards.slice(0, visibleCommunityCards).map((card, i) => {
                          const isInBestHand =
                            myPlayerId && gameState.myPocketCards
                              ? isCardInBestHand(
                                  card,
                                  gameState.myPocketCards,
                                  gameState.communityCards
                                )
                              : false;
                          return (
                            <div key={i} className="community-card-deal">
                              <Card
                                card={card}
                                isInBestHand={isInBestHand}
                                size="small"
                              />
                            </div>
                          );
                        })}
                        {[1, 2, 3, 4, 5]
                          .slice(visibleCommunityCards)
                          .map((i) => (
                            <div key={`empty-${i}`} className="card-small" />
                          ))}
                      </div>
                    )}{" "}
                </div>

                {/* Hand rankings or Token pool */}
                {gameResult && showFinalResult ? (
                  // Show hand rankings when game is complete and all hands revealed
                  <div className="result-rankings result-rankings-animate">
                    {gameResult.rankedHands.map((hand, i) => {
                      const correct =
                        hand.rank === gameState.tokenAssignments[hand.playerId];
                      const icon = correct ? "✅" : "❌";
                      return (
                        <div key={i} className="result-hand">
                          {icon} {hand.rank}. {hand.playerName}:{" "}
                          {hand.evaluation.description}
                        </div>
                      );
                    })}
                  </div>
                ) : !gameResult ? (
                  // Show token pool during game
                  <div className="token-pool-container">
                    {gameState.tokenPool && gameState.tokenPool.length > 0 && (
                      <div className="token-pool">
                        {[...gameState.tokenPool]
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
                    )}

                    {/* Ready button - only shown when all players have tokens */}
                    {gameState.phase.includes("betting") &&
                      gameState.allPlayersHaveTokens && (
                        <button
                          className="btn-ready-table"
                          onClick={onSetReady}
                        >
                          {gameState.players?.find((p) => p.id === myPlayerId)
                            ?.ready
                            ? "Unready"
                            : "Ready"}
                        </button>
                      )}
                  </div>
                )}
              </div>

              <div className="token-slot token-slot-right">
                {!gameResult &&
                  playerSlots[3].player &&
                  playerSlots[3].playerToken !== undefined && (
                    <TokenDisplay
                      number={playerSlots[3].playerToken}
                      phase={gameState.phase}
                      isMyToken={playerSlots[3].isMe}
                      isNewlyClaimed={newlyClaimedTokens.has(playerSlots[3].player.id)}
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
                {!gameResult &&
                  playerSlots[4].player &&
                  playerSlots[4].playerToken !== undefined && (
                    <TokenDisplay
                      number={playerSlots[4].playerToken}
                      phase={gameState.phase}
                      isMyToken={playerSlots[4].isMe}
                      isNewlyClaimed={newlyClaimedTokens.has(playerSlots[4].player.id)}
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
                {!gameResult &&
                  playerSlots[5].player &&
                  playerSlots[5].playerToken !== undefined && (
                    <TokenDisplay
                      number={playerSlots[5].playerToken}
                      phase={gameState.phase}
                      isMyToken={playerSlots[5].isMe}
                      isNewlyClaimed={newlyClaimedTokens.has(playerSlots[5].player.id)}
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
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[3].player.id)}
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
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[4].player.id)}
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
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[5].player.id)}
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
  gameResult,
  isRevealed = false,
}) => {
  const hasPocketCards = gameState.phase !== "waiting";
  const isHost = player.id === gameState.hostId;

  // Get player's actual cards from game result if game is complete
  const playerCards = gameResult
    ? gameResult.rankedHands.find((h) => h.playerId === player.id)?.pocketCards
    : null;

  // Get player's hand evaluation for display
  const playerHandEval = gameResult
    ? gameResult.rankedHands.find((h) => h.playerId === player.id)
    : null;

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
      } ${!player.atTable ? "player-info-away" : ""}`}
    >
      <div className="player-name">
        {isHost && "👑 "}
        {player.name}
        {!player.atTable && " 🚪"}
        {player.ready && <span className="ready-check">✓</span>}
      </div>

      {/* Always show cards container to maintain consistent size */}
      <div className="player-cards-container">
        <div className="player-cards-display">
          {hasPocketCards ? (
            // Show cards when in play
            gameResult && playerCards ? (
              // Game complete - show revealed or backs based on isRevealed
              isRevealed ? (
                <div className={`pocket-cards card-flip-reveal`}>
                  {playerCards.map((card, i) => (
                    <Card key={i} card={card} size="small" />
                  ))}
                </div>
              ) : (
                <div className="card-backs">
                  <CardBack size="small" />
                  <CardBack size="small" />
                </div>
              )
            ) : isMe && myPocketCards && myPocketCards.length > 0 ? (
              // Show actual cards for me during game
              <div className="pocket-cards">
                {myPocketCards.map((card, i) => (
                  <Card key={i} card={card} size="small" />
                ))}
              </div>
            ) : (
              // Show card backs for others during game
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

        {/* Show hand description when revealed */}
        {gameResult && isRevealed && playerHandEval && (
          <div className="hand-description">
            {playerHandEval.evaluation.description}
          </div>
        )}

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
const TokenDisplay = ({ number, phase, isMyToken, canClick, onClick, isNewlyClaimed = false }) => {
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
      } ${isNewlyClaimed ? "token-claimed" : ""}`}
      style={{ backgroundColor: color }}
      onClick={canClick ? () => onClick(number) : undefined}
    >
      {number}
    </div>
  );
};

export default Table;
