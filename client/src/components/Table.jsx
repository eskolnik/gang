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
  onRestartGame,
  onNextRound,
  isHost,
  gameResult,
  revealedHands = [],
  showFinalResult = false,
  visibleCommunityCards = 0,
}) => {
  const [lastTokenAssignments, setLastTokenAssignments] = useState({});
  const [visualTokenAssignments, setVisualTokenAssignments] = useState({}); // What we actually render
  const [visualTokenPool, setVisualTokenPool] = useState([]); // What we actually show in pool
  const [animatingTokens, setAnimatingTokens] = useState([]); // Phantom tokens currently animating: [{ tokenNum, fromPlayerId, toPlayerId, offsetX, offsetY }]
  const [archivingTokens, setArchivingTokens] = useState([]); // Tokens being archived to history: [{ tokenNum, playerId, roundIndex, offsetX, offsetY }]
  const [appearingTokens, setAppearingTokens] = useState([]); // Tokens appearing in pool at round start: [tokenNum, ...]
  const [visualTokenHistory, setVisualTokenHistory] = useState({}); // { playerId: [token1, token2, token3, token4] }
  const [lastPhase, setLastPhase] = useState(null);

  // Refs for token slot positions
  const tokenSlotRefs = useRef({});
  const centerPoolRef = useRef(null);
  const centerTokenSlotRefs = useRef({}); // Individual refs for each token slot in pool
  const tokenHistoryRefs = useRef({}); // { playerId: { 0: ref, 1: ref, 2: ref, 3: ref } }

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

    // Skip all token movement tracking if we're in the middle of an archiving animation
    // This prevents phantom tokens from being created during phase transitions
    if (archivingTokens.length > 0) return;

    const currentAssignments = gameState.tokenAssignments;
    const currentPool = gameState.tokenPool;
    const phantomTokens = [];
    const ANIMATION_DURATION = 700; // Slower animation

    // Detect if this is a round start: pool went from empty/few tokens to full set (one per player)
    // This happens at the start of each betting round
    const playerCount = players?.length || 0;
    const isRoundStart = currentPool.length === playerCount && visualTokenPool.length < playerCount && Object.keys(currentAssignments).length === 0;

    if (isRoundStart) {
      // At round start, tokens should only use flip animation, not sliding
      // Update visual state immediately without creating phantom tokens
      setVisualTokenAssignments({});
      setVisualTokenPool(currentPool);
      setLastTokenAssignments({});
      return;
    }

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
        } else if (visualTokenPool.includes(currentToken) && !appearingTokens.includes(currentToken)) {
          // Token came from pool - calculate FROM pool TO player
          // Skip if token is currently appearing (it will use flip animation instead)
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

    // Check for tokens returning to pool (but not during round transitions when they're archived)
    Object.keys(visualTokenAssignments).forEach((playerId) => {
      const visualToken = visualTokenAssignments[playerId];
      const currentToken = currentAssignments[playerId];

      // If player had a token but now has a different one or none, and the old token is now in pool
      // Skip if this token is being archived or appearing (will be handled by those animations)
      if (visualToken !== currentToken && currentPool.includes(visualToken) &&
          archivingTokens.length === 0 && !appearingTokens.includes(visualToken)) {
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
  }, [gameState?.tokenAssignments, gameState?.tokenPool, appearingTokens, archivingTokens.length]);

  // Detect phase changes and trigger token archiving animations
  useEffect(() => {
    if (!gameState?.phase || !lastPhase) {
      setLastPhase(gameState?.phase);
      return;
    }

    const currentPhase = gameState.phase;
    const ARCHIVE_DURATION = 700;

    // Detect transition from one betting round to the next
    const phaseTransitions = {
      'betting_1': { next: 'betting_2', roundIndex: 0 },
      'betting_2': { next: 'betting_3', roundIndex: 1 },
      'betting_3': { next: 'betting_4', roundIndex: 2 },
      'betting_4': { next: 'complete', roundIndex: 3 }
    };

    const transition = phaseTransitions[lastPhase];
    if (transition && currentPhase === transition.next) {
      // A betting round just completed - archive current tokens to history
      const tokensToArchive = [];
      const currentHistory = gameState.bettingRoundHistory || [];
      const roundIndex = transition.roundIndex;

      // IMMEDIATELY identify tokens that will appear in the new pool
      // This prevents the movement tracking effect from creating sliding animations
      const tokensInNewPool = gameState.tokenPool || [];
      if (tokensInNewPool.length > 0) {
        setAppearingTokens(tokensInNewPool);
      }

      Object.keys(visualTokenAssignments).forEach(playerId => {
        const tokenNum = visualTokenAssignments[playerId];
        if (tokenNum !== undefined) {
          // Calculate offset from player's token slot to their history slot
          const fromRef = tokenSlotRefs.current[playerId];
          const toRef = tokenHistoryRefs.current[playerId]?.[roundIndex];

          if (fromRef && toRef) {
            const fromRect = fromRef.getBoundingClientRect();
            const toRect = toRef.getBoundingClientRect();
            const containerRect = fromRef.closest('.table-container')?.getBoundingClientRect();

            if (containerRect) {
              const fromCenterX = fromRect.left + fromRect.width / 2;
              const fromCenterY = fromRect.top + fromRect.height / 2;
              const toCenterX = toRect.left + toRect.width / 2;
              const toCenterY = toRect.top + toRect.height / 2;

              tokensToArchive.push({
                tokenNum,
                playerId,
                roundIndex,
                offsetX: fromCenterX - toCenterX,
                offsetY: fromCenterY - toCenterY,
                phase: lastPhase
              });
            }
          }
        }
      });

      if (tokensToArchive.length > 0) {
        setArchivingTokens(tokensToArchive);

        // Remove current tokens from visual state immediately
        setVisualTokenAssignments({});

        // After animation, update visual history and show appearing tokens in pool
        setTimeout(() => {
          const newHistory = { ...visualTokenHistory };
          tokensToArchive.forEach(({ playerId, tokenNum, roundIndex }) => {
            if (!newHistory[playerId]) {
              newHistory[playerId] = [];
            }
            newHistory[playerId][roundIndex] = tokenNum;
          });
          setVisualTokenHistory(newHistory);
          setArchivingTokens([]);

          // Now show tokens in the pool (they're already marked as appearing)
          setVisualTokenPool(tokensInNewPool);

          // Clear appearing animation after it completes
          setTimeout(() => {
            setAppearingTokens([]);
            // After all animations, sync visual history with actual state
            const finalHistory = {};
            players.forEach(player => {
              const playerHistory = gameState.bettingRoundHistory
                ?.map(round => round.tokenAssignments[player.id])
                .filter(token => token !== undefined) || [];
              finalHistory[player.id] = playerHistory;
            });
            setVisualTokenHistory(finalHistory);
          }, 700);
        }, ARCHIVE_DURATION);
      }
    }

    setLastPhase(currentPhase);
  }, [gameState?.phase, lastPhase, visualTokenAssignments, gameState?.bettingRoundHistory, gameState?.tokenPool]);

  // Initialize visual token history from game state (only on mount and when not animating)
  useEffect(() => {
    // Don't update during animations or phase transitions
    if (archivingTokens.length > 0 || appearingTokens.length > 0) return;

    // Also don't update if we just transitioned phases (wait for animations to complete)
    if (gameState?.phase !== lastPhase && lastPhase !== null) return;

    // Only sync if visual history is empty or doesn't match game state
    // (to avoid overwriting during animations)
    const gameHistory = {};
    players.forEach(player => {
      const playerHistory = gameState.bettingRoundHistory
        ?.map(round => round.tokenAssignments[player.id])
        .filter(token => token !== undefined) || [];
      gameHistory[player.id] = playerHistory;
    });

    // Only update if visual history is significantly different (prevents flicker)
    const needsUpdate = Object.keys(gameHistory).some(playerId => {
      const visual = visualTokenHistory[playerId] || [];
      const game = gameHistory[playerId] || [];
      return visual.length !== game.length;
    });

    if (needsUpdate) {
      setVisualTokenHistory(gameHistory);
    }
  }, [gameState?.bettingRoundHistory, players, archivingTokens.length, appearingTokens.length, visualTokenHistory, gameState?.phase, lastPhase]);

  // Define fixed slots: 2 top, 1 left, 1 right, 2 bottom
  // Players are seated clockwise around the table
  const FIXED_SLOTS = [
    { id: "seat-0", position: "top-left", index: 0 },
    { id: "seat-1", position: "top-right", index: 1 },
    { id: "seat-2", position: "left", index: 5 },
    { id: "seat-3", position: "right", index: 2 },
    { id: "seat-4", position: "bottom-left", index: 4 },
    { id: "seat-5", position: "bottom-right", index: 3 },
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

  // Helper to determine if a player's guess was correct
  // Handles ties: players with identical hands are correct if they chose any token within the tie group's range
  const isPlayerCorrect = (playerId) => {
    if (!gameResult || !gameState?.tokenAssignments) return null;
    const playerHand = gameResult.rankedHands.find(h => h.playerId === playerId);
    if (!playerHand) return null;

    const actualRank = playerHand.rank;
    const assignedToken = gameState.tokenAssignments[playerId];

    // Find all players with the same rank (tied players)
    const tiedPlayers = gameResult.rankedHands.filter(h => h.rank === actualRank);

    if (tiedPlayers.length === 1) {
      // No tie - must match exactly
      return actualRank === assignedToken;
    } else {
      // Tie - token must be within the valid range for this tie group
      const minValidToken = actualRank;
      const maxValidToken = actualRank + tiedPlayers.length - 1;
      return assignedToken >= minValidToken && assignedToken <= maxValidToken;
    }
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
                  playerSlots[0].isMe
                    ? gameState.myPocketCards
                    : (gameState.allPocketCards ? gameState.allPocketCards[playerSlots[0].player.id] : null)
                }
                gameState={gameState}
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[0].player.id)}
                isCorrect={isPlayerCorrect(playerSlots[0].player.id)}
                visualTokenHistory={visualTokenHistory}
                tokenHistoryRefs={tokenHistoryRefs}
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
                  playerSlots[1].isMe
                    ? gameState.myPocketCards
                    : (gameState.allPocketCards ? gameState.allPocketCards[playerSlots[1].player.id] : null)
                }
                gameState={gameState}
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[1].player.id)}
                isCorrect={isPlayerCorrect(playerSlots[1].player.id)}
                visualTokenHistory={visualTokenHistory}
                tokenHistoryRefs={tokenHistoryRefs}
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
                  playerSlots[2].isMe
                    ? gameState.myPocketCards
                    : (gameState.allPocketCards ? gameState.allPocketCards[playerSlots[2].player.id] : null)
                }
                gameState={gameState}
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[2].player.id)}
                isCorrect={isPlayerCorrect(playerSlots[2].player.id)}
                visualTokenHistory={visualTokenHistory}
                tokenHistoryRefs={tokenHistoryRefs}
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
                    {/* Show Success/Failure for non-final rounds in best-of-5, Victory/Defeat otherwise */}
                    {gameResult.gameMode === 'best-of-5' && !gameResult.seriesComplete
                      ? (gameResult.success ? "Success!" : "Failure")
                      : (gameResult.success ? "Victory!" : "Defeat")}
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
                {/* Community cards - always render 5 slots to maintain consistent layout */}
                <div className="community-cards-container">
                  <div className="community-cards">
                    {[0, 1, 2, 3, 4].map((i) => {
                      const card = gameState.communityCards?.[i];
                      const isVisible = i < visibleCommunityCards;
                      const isInBestHand =
                        card && myPlayerId && gameState.myPocketCards
                          ? isCardInBestHand(
                              card,
                              gameState.myPocketCards,
                              gameState.communityCards
                            )
                          : false;
                      return (
                        // Change key when card becomes visible to trigger animation
                        <div
                          key={isVisible && card ? `card-${i}` : `empty-${i}`}
                          className={isVisible && card ? "community-card-deal" : ""}
                        >
                          {isVisible && card ? (
                            <Card
                              card={card}
                              isInBestHand={isInBestHand}
                              size="small"
                            />
                          ) : (
                            <div className="card-small" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Token pool - always visible to maintain consistent layout */}
                <div className="token-pool-container" ref={centerPoolRef}>
                  {!gameResult ? (
                    // During game - show token pool
                    <>
                      <div className="token-pool">
                        {[1, 2, 3, 4, 5, 6].map((tokenNum) => {
                          const isInPool = visualTokenPool.includes(tokenNum);
                          const isAppearing = appearingTokens.includes(tokenNum);

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
                                  appearing={isAppearing}
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
                    </>
                  ) : (
                    // Game complete - show appropriate button based on game mode and player role
                    showFinalResult && (
                      gameResult.gameMode === 'best-of-5' && !gameResult.seriesComplete ? (
                        // Best-of-5 non-final round
                        isHost ? (
                          // Host sees "Next Round" button, enabled only when all non-host players are ready
                          <button
                            className="btn-ready-table"
                            onClick={onNextRound}
                            disabled={!gameState.players?.filter(p => p.id !== gameState.hostId).every(p => p.ready)}
                          >
                            Next Round
                          </button>
                        ) : (
                          // Non-host sees "Ready" button
                          <button
                            className="btn-ready-table"
                            onClick={onSetReady}
                          >
                            {gameState.players?.find((p) => p.id === myPlayerId)?.ready
                              ? "Unready"
                              : "Ready"}
                          </button>
                        )
                      ) : (
                        // Single round or final round of best-of-5 - show Play Again for host only
                        isHost && (
                          <button
                            className="btn-ready-table"
                            onClick={onRestartGame}
                          >
                            Play Again
                          </button>
                        )
                      )
                    )
                  )}
                </div>
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
                  playerSlots[3].isMe
                    ? gameState.myPocketCards
                    : (gameState.allPocketCards ? gameState.allPocketCards[playerSlots[3].player.id] : null)
                }
                gameState={gameState}
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[3].player.id)}
                isCorrect={isPlayerCorrect(playerSlots[3].player.id)}
                visualTokenHistory={visualTokenHistory}
                tokenHistoryRefs={tokenHistoryRefs}
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
                  playerSlots[4].isMe
                    ? gameState.myPocketCards
                    : (gameState.allPocketCards ? gameState.allPocketCards[playerSlots[4].player.id] : null)
                }
                gameState={gameState}
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[4].player.id)}
                isCorrect={isPlayerCorrect(playerSlots[4].player.id)}
                visualTokenHistory={visualTokenHistory}
                tokenHistoryRefs={tokenHistoryRefs}
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
                  playerSlots[5].isMe
                    ? gameState.myPocketCards
                    : (gameState.allPocketCards ? gameState.allPocketCards[playerSlots[5].player.id] : null)
                }
                gameState={gameState}
                gameResult={gameResult}
                isRevealed={revealedHands.includes(playerSlots[5].player.id)}
                isCorrect={isPlayerCorrect(playerSlots[5].player.id)}
                visualTokenHistory={visualTokenHistory}
                tokenHistoryRefs={tokenHistoryRefs}
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

      {/* Archiving tokens - tokens moving to history with shrink animation */}
      {archivingTokens.map((archive, index) => {
        const sourceRef = tokenSlotRefs.current[archive.playerId];
        if (!sourceRef) return null;

        const sourceRect = sourceRef.getBoundingClientRect();
        const containerRect = sourceRef.closest('.table-container')?.getBoundingClientRect();
        if (!containerRect) return null;

        // Position at source (current token slot)
        const left = sourceRect.left - containerRect.left + (sourceRect.width / 2) - 27;
        const top = sourceRect.top - containerRect.top + (sourceRect.height / 2) - 27;

        return (
          <div
            key={`archive-${archive.playerId}-${archive.tokenNum}-${index}`}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            <TokenDisplay
              number={archive.tokenNum}
              phase={archive.phase}
              isMyToken={false}
              offsetX={-archive.offsetX}
              offsetY={-archive.offsetY}
              animating={true}
              shrinking={true}
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
  isCorrect = null,
  visualTokenHistory,
  tokenHistoryRefs,
}) => {
  const hasPocketCards = gameState.phase !== "waiting";
  const isHost = player.id === gameState.hostId;
  const isDealer = player.id === gameState.dealerId;

  // Get player's actual cards from game result if game is complete
  const playerCards = gameResult
    ? gameResult.rankedHands.find((h) => h.playerId === player.id)?.pocketCards
    : null;

  // Get player's hand evaluation for display
  const playerHandEval = gameResult
    ? gameResult.rankedHands.find((h) => h.playerId === player.id)
    : null;

  // Evaluate current hand during the game (for current player or spectator viewing any player)
  const currentHandEval = myPocketCards && myPocketCards.length > 0 && gameState.communityCards
    ? HandEvaluator.evaluateHand(myPocketCards, gameState.communityCards)
    : null;

  // Get historical tokens for this player from visual state (not actual state during animation)
  const tokenHistory = visualTokenHistory[player.id] || [];

  return (
    <div
      className={`player-info ${isCurrentTurn ? "player-info-active" : ""} ${
        isMe ? "player-info-me" : ""
      } ${!player.atTable ? "player-info-away" : ""} ${
        gameResult && isRevealed && isCorrect === true ? "player-info-correct" : ""
      } ${gameResult && isRevealed && isCorrect === false ? "player-info-incorrect" : ""}`}
    >
      <div className="player-name">
        {isHost && <span>👑</span>}
        {isDealer && <span className="dealer-button">D</span>}
        {player.name}
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
            ) : myPocketCards && myPocketCards.length > 0 ? (
              // Show actual cards (for current player or spectator viewing any player)
              <div className="pocket-cards">
                {myPocketCards.map((card, i) => (
                  <Card key={i} card={card} size="small" />
                ))}
              </div>
            ) : (
              // Show card backs for others (when not spectating)
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

        {/* Always show hand description space to maintain consistent size */}
        <div className={`hand-description ${gameResult && isRevealed ? 'hand-description-reveal' : ''}`}>
          {gameResult && isRevealed && playerHandEval ? (
            // Game complete and hand revealed - show final hand with animation
            playerHandEval.evaluation.description
          ) : !gameResult && isMe && currentHandEval ? (
            // During game - show current player's current best hand (no animation)
            currentHandEval.description
          ) : (
            // Empty space to maintain size (non-breaking space)
            '\u00A0'
          )}
        </div>

        {/* Token history from previous rounds - fixed slots for all 4 rounds */}
        <div className="token-history">
          {[0, 1, 2, 3].map((roundIndex) => {
            const token = tokenHistory[roundIndex];
            return (
              <div
                key={roundIndex}
                className="token-history-item"
                ref={(el) => {
                  if (!tokenHistoryRefs.current[player.id]) {
                    tokenHistoryRefs.current[player.id] = {};
                  }
                  tokenHistoryRefs.current[player.id][roundIndex] = el;
                }}
                style={{
                  backgroundColor: token !== undefined
                    ? ["#ffffff", "#ffff00", "#ff9900", "#ff0000"][roundIndex]
                    : "transparent",
                  border: token !== undefined
                    ? "2px solid #333333"
                    : "2px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                {token !== undefined ? token : ""}
              </div>
            );
          })}
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
  shrinking = false,
  appearing = false,
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
      animation: shrinking ? 'tokenSlideShrink 0.7s ease-out both' : 'tokenSlide 0.7s ease-out both',
    }),
    ...(appearing && !animating && {
      animation: 'tokenFlipBounce 0.7s ease-out both',
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
