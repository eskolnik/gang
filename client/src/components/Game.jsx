import { useEffect, useState, useCallback } from 'react';
import { useNetwork } from '../context/NetworkContext';
import Table from './Table';
import { HandEvaluator } from '../game/utils/handEvaluator';
import SettingsMenu from './SettingsMenu';
import './Game.css';

const GAME_PHASES = {
  WAITING: 'waiting',
  BETTING_1: 'betting_1',
  BETTING_2: 'betting_2',
  BETTING_3: 'betting_3',
  BETTING_4: 'betting_4',
  COMPLETE: 'complete'
};

const PHASE_NAMES = {
  betting_1: 'Pre-flop',
  betting_2: 'Flop',
  betting_3: 'Turn',
  betting_4: 'River'
};

const Game = ({ onReturnToLobby }) => {
  const { gameState, roomId, playerId, rejoinSuccess, startGame, restartGame, nextRound, claimToken, returnToken, setReady, leaveGame, returnToLobby, networkManager } = useNetwork();
  const [gameResult, setGameResult] = useState(null);
  const [revealedHands, setRevealedHands] = useState([]); // Array of player IDs whose hands have been revealed
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [visibleCommunityCards, setVisibleCommunityCards] = useState(0); // Number of community cards to show
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if this is the initial load
  const [gameDeleted, setGameDeleted] = useState(null); // Track if game was deleted {reason: string}
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false); // Track if leave confirmation modal is shown

  const handleReturnToLobby = useCallback(async () => {
    try {
      // Spectators leave immediately without keeping their seat
      if (gameState?.isSpectator) {
        leaveGame();
        onReturnToLobby();
      } else {
        // Players return to lobby but keep their seat
        await returnToLobby();
        onReturnToLobby();
      }
    } catch (error) {
      console.error('Failed to return to lobby:', error);
    }
  }, [returnToLobby, onReturnToLobby, leaveGame, gameState]);

  const handleLeaveGame = useCallback(() => {
    setShowLeaveConfirm(true);
  }, []);

  const handleConfirmLeave = useCallback(() => {
    leaveGame();
    onReturnToLobby();
  }, [leaveGame, onReturnToLobby]);

  const handleCancelLeave = useCallback(() => {
    setShowLeaveConfirm(false);
  }, []);

  const handleGameDeletedReturn = useCallback(() => {
    leaveGame();
    onReturnToLobby();
  }, [leaveGame, onReturnToLobby]);

  // Handle initial load - set state without animations
  useEffect(() => {
    if (isInitialLoad && gameState) {
      // Immediately show all community cards without animation
      if (gameState.communityCards) {
        setVisibleCommunityCards(gameState.communityCards.length);
      }

      // If game is complete on load, immediately show everything
      if (gameState.phase === GAME_PHASES.COMPLETE) {
        // Note: gameResult will be null initially on rejoin
        // It will be set via the evaluateHands call or gameComplete event
        // We'll reveal all hands and show final result immediately when gameResult arrives
      }

      // Mark that initial load is complete after a short delay
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, gameState]);

  // Listen for game complete event
  useEffect(() => {
    const handleGameComplete = (result) => {
      setGameResult(result);

      // If this is initial load and game is already complete, skip animations
      if (isInitialLoad) {
        // Immediately reveal all hands and show final result
        const allPlayerIds = result.rankedHands.map(h => h.playerId);
        setRevealedHands(allPlayerIds);
        setShowFinalResult(true);
      } else {
        // Normal gameplay - reset for animation
        setRevealedHands([]);
        setShowFinalResult(false);
      }
    };

    networkManager.on('gameComplete', handleGameComplete);

    return () => {
      networkManager.off('gameComplete', handleGameComplete);
    };
  }, [networkManager, isInitialLoad]);

  // Listen for game deleted event
  useEffect(() => {
    const handleGameDeleted = (data) => {
      setGameDeleted(data);
    };

    networkManager.on('gameDeleted', handleGameDeleted);

    return () => {
      networkManager.off('gameDeleted', handleGameDeleted);
    };
  }, [networkManager]);

  // Sequential hand reveal animation when game completes
  useEffect(() => {
    if (!gameResult || !gameResult.rankedHands) return;

    // Skip animation if this is initial load (already handled in gameComplete event)
    if (isInitialLoad) return;

    // Reveal hands in clockwise order around the table (by player index 0-5)
    // This matches the join order and clockwise seating
    const sortedClockwise = [...gameResult.rankedHands].sort((a, b) => {
      // Find player index in the players array
      const indexA = gameState.players.findIndex(p => p.id === a.playerId);
      const indexB = gameState.players.findIndex(p => p.id === b.playerId);
      return indexA - indexB;
    });

    // Reveal hands one by one
    let currentIndex = 0;
    const revealInterval = setInterval(() => {
      if (currentIndex < sortedClockwise.length) {
        const hand = sortedClockwise[currentIndex];
        setRevealedHands(prev => [...prev, hand.playerId]);
        currentIndex++;
      } else {
        // All hands revealed, show final result after a delay
        clearInterval(revealInterval);
        setTimeout(() => {
          setShowFinalResult(true);
        }, 800); // Wait 800ms after last hand before showing result
      }
    }, 1200); // Reveal each hand every 1.2 seconds

    return () => clearInterval(revealInterval);
  }, [gameResult, gameState.players, isInitialLoad]);

  // Animate community card dealing
  useEffect(() => {
    if (!gameState?.communityCards) {
      setVisibleCommunityCards(0);
      return;
    }

    const targetCount = gameState.communityCards.length;

    // Skip animation on initial load
    if (isInitialLoad) {
      setVisibleCommunityCards(targetCount);
      return;
    }

    // If we need to show more cards, animate them one by one
    if (visibleCommunityCards < targetCount) {
      const dealInterval = setInterval(() => {
        setVisibleCommunityCards(prev => {
          if (prev >= targetCount) {
            clearInterval(dealInterval);
            return prev;
          }
          return prev + 1;
        });
      }, 300); // Deal each card every 300ms

      return () => clearInterval(dealInterval);
    }
  }, [gameState?.communityCards?.length, isInitialLoad]);

  // Reset game result when game restarts
  useEffect(() => {
    if (gameState?.phase !== GAME_PHASES.COMPLETE && gameResult !== null) {
      setGameResult(null);
      setRevealedHands([]);
      setShowFinalResult(false);
    }

    // Reset visible community cards when game restarts (but not on initial load)
    if (gameState?.phase === GAME_PHASES.WAITING && !isInitialLoad) {
      setVisibleCommunityCards(0);
    }
  }, [gameState?.phase, gameResult, isInitialLoad]);

  const handleClaimToken = useCallback(async (tokenNumber) => {
    try {
      await claimToken(tokenNumber);
    } catch (error) {
      console.error('Failed to claim token:', error);
      alert('Failed to claim token: ' + error.message);
    }
  }, [claimToken]);

  const handleStartGame = useCallback(async () => {
    try {
      await startGame();
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game: ' + error.message);
    }
  }, [startGame]);

  const handleRestartGame = useCallback(async () => {
    try {
      await restartGame();
      setGameResult(null);
    } catch (error) {
      console.error('Failed to restart game:', error);
      alert('Failed to restart game: ' + error.message);
    }
  }, [restartGame]);

  const handleNextRound = useCallback(async () => {
    try {
      await nextRound();
      setGameResult(null);
    } catch (error) {
      console.error('Failed to start next round:', error);
      alert('Failed to start next round: ' + error.message);
    }
  }, [nextRound]);

  const handleReturnToken = useCallback(async () => {
    try {
      await returnToken();
    } catch (error) {
      console.error('Failed to return token:', error);
      alert('Failed to return token: ' + error.message);
    }
  }, [returnToken]);

  const handleSetReady = useCallback(async () => {
    try {
      await setReady();
    } catch (error) {
      console.error('Failed to set ready:', error);
      alert('Failed to set ready: ' + error.message);
    }
  }, [setReady]);

  if (!gameState) {
    return (
      <div className="game">
        <div className="game-loading">Loading game...</div>
      </div>
    );
  }

  // Evaluate hand for highlighting
  const evaluation = gameState.myPocketCards ? HandEvaluator.evaluateHand(
    gameState.myPocketCards,
    gameState.communityCards || []
  ) : null;

  const isInBestHand = (card) => {
    return evaluation && HandEvaluator.isCardInBestHand(card, evaluation.cards);
  };

  // Determine current round for round tracker
  let currentRound = 0;
  let phaseName = '';
  if (gameState.phase === GAME_PHASES.BETTING_1) {
    currentRound = 1;
    phaseName = 'Pre-flop';
  } else if (gameState.phase === GAME_PHASES.BETTING_2) {
    currentRound = 2;
    phaseName = 'Flop';
  } else if (gameState.phase === GAME_PHASES.BETTING_3) {
    currentRound = 3;
    phaseName = 'Turn';
  } else if (gameState.phase === GAME_PHASES.BETTING_4) {
    currentRound = 4;
    phaseName = 'River';
  }

  // Don't reorder players - same view for everyone
  const players = [...(gameState.players || [])];

  // Determine if current player is host
  const isHost = gameState.hostId === playerId;
  const hostPlayer = gameState.players?.find(p => p.id === gameState.hostId);

  // Status message
  let statusText = '';
  if (gameState.phase === GAME_PHASES.WAITING && !isHost) {
    statusText = `Waiting for ${hostPlayer?.name || 'host'} to start the game`;
  } else if (gameState.currentTurn === playerId && gameState.phase.includes('betting')) {
    statusText = 'Your turn to select a token';
  } else if (gameState.phase.includes('betting')) {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurn);
    if (!gameState.allPlayersHaveTokens) {
      statusText = 'Waiting for all players to select tokens...';
    } else {
      statusText = `Waiting for ${currentPlayer?.name || 'player'}...`;
    }
  }

  return (
    <div className="game">
      {/* TOP LEFT: Navigation buttons */}
      <div className="game-nav-buttons">
        <button className="btn-return" onClick={handleReturnToLobby}>
          Return to Lobby
        </button>
        {/* Only show Leave Game button for players, not spectators */}
        {!gameState?.isSpectator && (
          <button className="btn-leave" onClick={handleLeaveGame}>
            <i className="fas fa-right-from-bracket"></i> Leave Game
          </button>
        )}
        {/* Spectator indicator */}
        {gameState?.spectators && gameState.spectators.length > 0 && (
          <div className="spectator-indicator">
            <i className="fas fa-eye"></i>
            <span className="spectator-names">{gameState.spectators.map(s => s.name).join(', ')}</span>
            <div className="spectator-popover">
              {gameState.spectators.map(s => s.name).join(', ')}
            </div>
          </div>
        )}
      </div>

      {/* TOP RIGHT: Info Container */}
      <div className="game-info-container">
        {/* Round Tracker */}
        {currentRound > 0 && (
          <div className="round-tracker">
            <div className="round-circles">
              {[1, 2, 3, 4].map((round) => (
                <div
                  key={round}
                  className={`round-circle ${round === currentRound ? 'round-circle-active' : ''}`}
                  style={{
                    backgroundColor: ['#ffffff', '#ffff00', '#ff9900', '#ff0000'][round - 1]
                  }}
                />
              ))}
            </div>
            <div
              className="round-name"
              style={{ color: ['#ffffff', '#ffff00', '#ff9900', '#ff0000'][currentRound - 1] }}
            >
              {phaseName}
            </div>
          </div>
        )}

        {/* Series Tracker (Best of 5) */}
        {gameState.gameMode === 'best-of-5' && (
          <div className="series-tracker">
            <div className="series-record">
              <span className="series-label">Won:</span>
              <div className="series-markers">
                {[0, 1, 2].map((index) => (
                  <span
                    key={`win-${index}`}
                    className={`series-marker ${index < gameState.seriesWins ? 'series-marker-win' : ''}`}
                  >
                    {index < gameState.seriesWins ? '✓' : 'o'}
                  </span>
                ))}
              </div>
              <span className="series-separator">:</span>
              <span className="series-label">Lost:</span>
              <div className="series-markers">
                {[0, 1, 2].map((index) => (
                  <span
                    key={`loss-${index}`}
                    className={`series-marker ${index < gameState.seriesLosses ? 'series-marker-loss' : ''}`}
                  >
                    {index < gameState.seriesLosses ? '✗' : 'o'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusText && <div className="game-status">{statusText}</div>}
      </div>

      {/* Game Table */}
      <div className="game-table">
        <Table
          players={players}
          currentTurn={gameState.currentTurn}
          myPlayerId={playerId}
          gameState={gameState}
          onTokenClick={handleClaimToken}
          onSetReady={handleSetReady}
          onReturnToken={handleReturnToken}
          onRestartGame={handleRestartGame}
          onNextRound={handleNextRound}
          isHost={isHost}
          gameResult={gameResult}
          revealedHands={revealedHands}
          showFinalResult={showFinalResult}
          visibleCommunityCards={visibleCommunityCards}
        />

        {/* Start Game button in center of table when waiting - only for host */}
        {gameState.phase === GAME_PHASES.WAITING && isHost && (
          <button className="btn-action btn-start-center" onClick={handleStartGame}>
            Start Game
          </button>
        )}
      </div>

      {/* BOTTOM LEFT: Action Buttons (during gameplay) */}
      <div className="game-actions">
      </div>


      {/* BOTTOM RIGHT: Status/Game Log */}
      {/* {statusText && <div className="game-status">{statusText}</div>} */}

      {/* Game Deleted Modal */}
      {gameDeleted && (
        <div className="game-deleted-overlay">
          <div className="game-deleted-modal">
            <h2>The game has ended</h2>
            <p>{gameDeleted.reason}</p>
            <button className="btn-action" onClick={handleGameDeletedReturn}>
              Return to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Leave Game Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="leave-confirm-overlay">
          <div className="leave-confirm-modal">
            <h2>Leave Game?</h2>
            <p>Are you sure you want to leave this game? You will lose your seat.</p>
            <div className="leave-confirm-buttons">
              <button className="btn-action btn-cancel" onClick={handleCancelLeave}>
                Cancel
              </button>
              <button className="btn-action btn-confirm-leave" onClick={handleConfirmLeave}>
                Leave Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Menu */}
      <SettingsMenu />
    </div>
  );
};

export default Game;
