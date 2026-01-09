import { useState, useEffect, useRef } from "react";
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
  const [visualTokenAssignments, setVisualTokenAssignments] = useState({}); // What we actually render
  const [visualTokenPool, setVisualTokenPool] = useState([]); // What we actually show in pool
  const [animatingTokens, setAnimatingTokens] = useState([]); // Phantom tokens currently animating: [{ tokenNum, fromPlayerId, toPlayerId, offsetX, offsetY }]

  // Refs for token slot positions
  const tokenSlotRefs = useRef({});
  const centerPoolRef = useRef(null);
  const centerTokenSlotRefs = useRef({}); // Individual refs for each token slot in pool

  // Helper to calculate position offset between two elements
  const calculateOffset = (fromPlayerId, toPlayerId, tokenNum = null) => {
    // Get the appropriate ref for source
    let fromRef;
    if (fromPlayerId === 'center' && tokenNum !== null) {
      fromRef = centerTokenSlotRefs.current[tokenNum];
    } else if (fromPlayerId === 'center') {
      fromRef = centerPoolRef.current;
    } else {
      fromRef = tokenSlotRefs.current[fromPlayerId];
    }

    // Get the appropriate ref for destination
    let toRef;
    if (toPlayerId === 'center' && tokenNum !== null) {
      toRef = centerTokenSlotRefs.current[tokenNum];
    } else if (toPlayerId === 'center') {
      toRef = centerPoolRef.current;
    } else {
      toRef = tokenSlotRefs.current[toPlayerId];
    }

    if (!fromRef || !toRef) return { offsetX: 0, offsetY: 0 };

    const fromRect = fromRef.getBoundingClientRect();
    const toRect = toRef.getBoundingClientRect();

    // Calculate center-to-center offset
    const fromCenterX = fromRect.left + fromRect.width / 2;
    const fromCenterY = fromRect.top + fromRect.height / 2;
    const toCenterX = toRect.left + toRect.width / 2;
    const toCenterY = toRect.top + toRect.height / 2;

    return {
      offsetX: fromCenterX - toCenterX,
      offsetY: fromCenterY - toCenterY
    };
  };

  // Track token movements for sliding animations
  useEffect(() => {
    if (!gameState?.tokenAssignments || !gameState?.tokenPool) return;

    const currentAssignments = gameState.tokenAssignments;
    const currentPool = gameState.tokenPool;
    const phantomTokens = [];
    const ANIMATION_DURATION = 700; // Slower animation

    // Build reverse maps: token -> playerId
    const currentTokenToPlayer = {};
    Object.keys(currentAssignments).forEach(playerId => {
      currentTokenToPlayer[currentAssignments[playerId]] = playerId;
    });

    const previousTokenToPlayer = {};
    Object.keys(lastTokenAssignments).forEach(playerId => {
      previousTokenToPlayer[lastTokenAssignments[playerId]] = playerId;
    });

    // Check each player who currently has a token
    Object.keys(currentAssignments).forEach((playerId) => {
      const currentToken = currentAssignments[playerId];
      const previousToken = visualTokenAssignments[playerId];

      // Only animate if this player's token changed
      if (currentToken !== previousToken) {
        // Find where the current token came from
        const previousOwner = previousTokenToPlayer[currentToken];

        if (previousOwner && previousOwner !== playerId) {
          // Token came from another player - calculate FROM source TO destination
          const { offsetX, offsetY } = calculateOffset(previousOwner, playerId, currentToken);
          phantomTokens.push({
            tokenNum: currentToken,
            fromPlayerId: previousOwner,
            toPlayerId: playerId,
            offsetX,
            offsetY,
            phase: gameState.phase
          });
        } else if (visualTokenPool.includes(currentToken)) {
          // Token came from pool - calculate FROM pool TO player
          const { offsetX, offsetY } = calculateOffset('center', playerId, currentToken);
          phantomTokens.push({
            tokenNum: currentToken,
            fromPlayerId: 'center',
            toPlayerId: playerId,
            offsetX,
            offsetY,
            phase: gameState.phase
          });
        }
      }
    });

    // Check for tokens returning to pool
    Object.keys(visualTokenAssignments).forEach((playerId) => {
      const visualToken = visualTokenAssignments[playerId];
      const currentToken = currentAssignments[playerId];

      // If player had a token but now has a different one or none, and the old token is now in pool
      if (visualToken !== currentToken && currentPool.includes(visualToken)) {
        // Calculate FROM player TO pool (specific slot for this token)
        const { offsetX, offsetY } = calculateOffset(playerId, 'center', visualToken);
        phantomTokens.push({
          tokenNum: visualToken,
          fromPlayerId: playerId,
          toPlayerId: 'center',
          offsetX,
          offsetY,
          phase: gameState.phase
        });
      }
    });

    if (phantomTokens.length > 0) {
      setAnimatingTokens(phantomTokens);

      // Immediately update visual state to REMOVE tokens from their source
      // (so we don't see duplicates - only the phantom will be visible)
      const newVisualAssignments = { ...visualTokenAssignments };
      const newVisualPool = [...visualTokenPool];

      phantomTokens.forEach(phantom => {
        if (phantom.fromPlayerId === 'center') {
          // Remove from pool
          const poolIndex = newVisualPool.indexOf(phantom.tokenNum);
          if (poolIndex > -1) {
            newVisualPool.splice(poolIndex, 1);
          }
        } else {
          // Remove from player
          delete newVisualAssignments[phantom.fromPlayerId];
        }
      });

      setVisualTokenAssignments(newVisualAssignments);
      setVisualTokenPool(newVisualPool);

      // After animation completes, update visual state to show tokens at destination
      setTimeout(() => {
        setVisualTokenAssignments(currentAssignments);
        setVisualTokenPool(currentPool);
        setAnimatingTokens([]);
      }, ANIMATION_DURATION);
    } else {
      // No animation needed, update immediately
      setVisualTokenAssignments(currentAssignments);
      setVisualTokenPool(currentPool);
    }

    setLastTokenAssignments(currentAssignments);
  }, [gameState?.tokenAssignments, gameState?.tokenPool]);

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
    const playerToken = visualTokenAssignments[player.id]; // Use visual state, not actual

    return {
      ...slot,
      player,
      isMe,
      isCurrentTurn,
      playerToken,
    };
  });

  // Helper to get slot position for a player ID
  const getSlotPosition = (playerId) => {
    const slot = playerSlots.find(s => s.player?.id === playerId);
    return slot?.position || 'center';
  };

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
                  <div
                    className="token-slot token-slot-top-left"
                    ref={(el) => { if (playerSlots[0].player) tokenSlotRefs.current[playerSlots[0].player.id] = el; }}
                  >
                    {!gameResult &&
                      playerSlots[0].player &&
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
                  <div
                    className="token-slot token-slot-top-right"
                    ref={(el) => { if (playerSlots[1].player) tokenSlotRefs.current[playerSlots[1].player.id] = el; }}
                  >
                    {!gameResult &&
                      playerSlots[1].player &&
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
                </>
              )}
            </div>

            {/* Middle row: left token, center content, right token */}
            <div className="table-surface-middle">
              <div
                className="token-slot token-slot-left"
                ref={(el) => { if (playerSlots[2].player) tokenSlotRefs.current[playerSlots[2].player.id] = el; }}
              >
                {!gameResult &&
                  playerSlots[2].player &&
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
                <div className="community-cards-container">
                  {gameState.communityCards &&
                    gameState.communityCards.length > 0 && (
                      <div className="community-cards">
                        {gameState.communityCards
                          .slice(0, visibleCommunityCards)
                          .map((card, i) => {
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
                {gameResult && showFinalResult && (
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
                )}
                {!gameResult && (
                  // Show token pool during game - with fixed positions for each token
                  <div className="token-pool-container" ref={centerPoolRef}>
                    <div className="token-pool">
                      {[1, 2, 3, 4, 5, 6].map((tokenNum) => {
                        const isInPool = visualTokenPool.includes(tokenNum);

                        return (
                          <div
                            key={tokenNum}
                            className="token-slot"
                            ref={(el) => { centerTokenSlotRefs.current[tokenNum] = el; }}
                          >
                            {isInPool ? (
                              <TokenDisplay
                                number={tokenNum}
                                phase={gameState.phase}
                                isMyToken={false}
                                canClick={gameState.currentTurn === myPlayerId}
                                onClick={() => onTokenClick(tokenNum)}
                              />
                            ) : (
                              // Empty slot to maintain spacing
                              <div style={{ width: '54px', height: '54px' }} />
                            )}
                          </div>
                        );
                      })}
                    </div>

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

              <div
                className="token-slot token-slot-right"
                ref={(el) => { if (playerSlots[3].player) tokenSlotRefs.current[playerSlots[3].player.id] = el; }}
              >
                {!gameResult &&
                  playerSlots[3].player &&
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
              <div
                className="token-slot token-slot-bottom-left"
                ref={(el) => { if (playerSlots[4].player) tokenSlotRefs.current[playerSlots[4].player.id] = el; }}
              >
                {!gameResult &&
                  playerSlots[4].player &&
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
              <div
                className="token-slot token-slot-bottom-right"
                ref={(el) => { if (playerSlots[5].player) tokenSlotRefs.current[playerSlots[5].player.id] = el; }}
              >
                {!gameResult &&
                  playerSlots[5].player &&
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

      {/* Phantom tokens layer - animating tokens overlay */}
      {animatingTokens.map((phantom, index) => {
        // Get the specific source ref
        const sourceRef = phantom.fromPlayerId === 'center'
          ? centerTokenSlotRefs.current[phantom.tokenNum]
          : tokenSlotRefs.current[phantom.fromPlayerId];

        if (!sourceRef) return null;

        const sourceRect = sourceRef.getBoundingClientRect();
        const containerRect = sourceRef.closest('.table-container')?.getBoundingClientRect();

        if (!containerRect) return null;

        // Position phantom token at SOURCE (where it will animate FROM)
        const left = sourceRect.left - containerRect.left + (sourceRect.width / 2) - 27; // 27 = half of 54px token
        const top = sourceRect.top - containerRect.top + (sourceRect.height / 2) - 27;

        return (
          <div
            key={`phantom-${phantom.tokenNum}-${index}`}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            <TokenDisplay
              number={phantom.tokenNum}
              phase={phantom.phase}
              isMyToken={false}
              offsetX={-phantom.offsetX}
              offsetY={-phantom.offsetY}
              animating={true}
              canClick={false}
            />
          </div>
        );
      })}
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
const TokenDisplay = ({
  number,
  phase,
  isMyToken,
  canClick,
  onClick,
  offsetX = 0,
  offsetY = 0,
  animating = false,
}) => {
  const roundColors = {
    betting_1: "#ffffff",
    betting_2: "#ffff00",
    betting_3: "#ff9900",
    betting_4: "#ff0000",
  };

  const color = roundColors[phase] || "#ffd700";

  // Build inline style with CSS custom properties for dynamic animation
  // Set initial transform immediately to prevent flicker
  const inlineStyle = {
    backgroundColor: color,
    ...(animating && {
      '--offset-x': `${offsetX}px`,
      '--offset-y': `${offsetY}px`,
      animation: 'tokenSlide 0.7s ease-out both',
    }),
  };

  return (
    <div
      className={`token-display ${canClick ? "token-clickable" : ""} ${
        isMyToken ? "token-mine" : ""
      }`}
      style={inlineStyle}
      onClick={canClick ? () => onClick(number) : undefined}
    >
      {number}
    </div>
  );
};

export default Table;
