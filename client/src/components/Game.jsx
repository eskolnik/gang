import { useEffect, useState, useCallback } from 'react';
import { useNetwork } from '../context/NetworkContext';
import Table from './Table';
import { HandEvaluator } from '../game/utils/handEvaluator';
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
  const { gameState, roomId, playerId, startGame, restartGame, claimToken, passTurn, setReady, leaveGame, returnToLobby, networkManager } = useNetwork();
  const [gameResult, setGameResult] = useState(null);
  const [revealedHands, setRevealedHands] = useState([]); // Array of player IDs whose hands have been revealed
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [visibleCommunityCards, setVisibleCommunityCards] = useState(0); // Number of community cards to show

  const handleReturnToLobby = useCallback(async () => {
    try {
      await returnToLobby();
      onReturnToLobby();
    } catch (error) {
      console.error('Failed to return to lobby:', error);
    }
  }, [returnToLobby, onReturnToLobby]);

  const handleLeaveGame = useCallback(() => {
    if (window.confirm('Are you sure you want to leave this game? You will lose your seat.')) {
      leaveGame();
      onReturnToLobby();
    }
  }, [leaveGame, onReturnToLobby]);

  // Listen for game complete event
  useEffect(() => {
    const handleGameComplete = (result) => {
      setGameResult(result);
      setRevealedHands([]); // Reset revealed hands
      setShowFinalResult(false); // Reset final result display
    };

    networkManager.on('gameComplete', handleGameComplete);

    return () => {
      networkManager.off('gameComplete', handleGameComplete);
    };
  }, [networkManager]);

  // Sequential hand reveal animation when game completes
  useEffect(() => {
    if (!gameResult || !gameResult.rankedHands) return;

    // Sort hands by token assignment (rank) - lowest to highest
    const sortedByRank = [...gameResult.rankedHands].sort((a, b) => a.rank - b.rank);

    // Reveal hands one by one
    let currentIndex = 0;
    const revealInterval = setInterval(() => {
      if (currentIndex < sortedByRank.length) {
        const hand = sortedByRank[currentIndex];
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
  }, [gameResult]);

  // Animate community card dealing
  useEffect(() => {
    if (!gameState?.communityCards) {
      setVisibleCommunityCards(0);
      return;
    }

    const targetCount = gameState.communityCards.length;

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
  }, [gameState?.communityCards?.length]);

  // Reset game result when game restarts
  useEffect(() => {
    if (gameState?.phase !== GAME_PHASES.COMPLETE && gameResult !== null) {
      setGameResult(null);
      setRevealedHands([]);
      setShowFinalResult(false);
    }

    // Reset visible community cards when game restarts
    if (gameState?.phase === GAME_PHASES.WAITING) {
      setVisibleCommunityCards(0);
    }
  }, [gameState?.phase, gameResult]);

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

  const handlePassTurn = useCallback(async () => {
    try {
      await passTurn();
    } catch (error) {
      console.error('Failed to pass turn:', error);
      alert('Failed to pass turn: ' + error.message);
    }
  }, [passTurn]);

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
        <button className="btn-leave" onClick={handleLeaveGame}>
          <i className="fas fa-right-from-bracket"></i> Leave Game
        </button>
      </div>

      {/* TOP RIGHT: Round Tracker */}
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
      {statusText && <div className="game-status">{statusText}</div>}

      {/* Game Table */}
      <div className="game-table">
        <Table
          players={players}
          currentTurn={gameState.currentTurn}
          myPlayerId={playerId}
          gameState={gameState}
          onTokenClick={handleClaimToken}
          onSetReady={handleSetReady}
          onRestartGame={handleRestartGame}
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
        {gameState.phase.includes('betting') &&
         gameState.currentTurn === playerId &&
         gameState.tokenAssignments?.[playerId] !== undefined && (
          <button className="btn-action btn-pass" onClick={handlePassTurn}>
            Pass
          </button>
        )}
      </div>


      {/* BOTTOM RIGHT: Status/Game Log */}
      {/* {statusText && <div className="game-status">{statusText}</div>} */}
    </div>
  );
};

export default Game;
