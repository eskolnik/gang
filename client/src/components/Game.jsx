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
  const { gameState, roomId, playerId, startGame, restartGame, claimToken, passTurn, setReady, networkManager } = useNetwork();
  const [gameResult, setGameResult] = useState(null);

  // Listen for game complete event
  useEffect(() => {
    const handleGameComplete = (result) => {
      setGameResult(result);
    };

    networkManager.on('gameComplete', handleGameComplete);

    return () => {
      networkManager.off('gameComplete', handleGameComplete);
    };
  }, [networkManager]);

  // Reset game result when game restarts
  useEffect(() => {
    if (gameState?.phase === GAME_PHASES.WAITING) {
      setGameResult(null);
    }
  }, [gameState?.phase]);

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

  // Status message
  let statusText = '';
  if (gameState.currentTurn === playerId && gameState.phase.includes('betting')) {
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
      {/* TOP LEFT: Return to Lobby button */}
      <button className="btn-return" onClick={onReturnToLobby}>
        Return to Lobby
      </button>

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

      {/* Game Table */}
      <div className="game-table">
        <Table
          players={players}
          currentTurn={gameState.currentTurn}
          myPlayerId={playerId}
          gameState={gameState}
          onTokenClick={handleClaimToken}
        />
      </div>

      {/* BOTTOM LEFT: Action Buttons */}
      <div className="game-actions">
        {gameState.phase === GAME_PHASES.WAITING && (
          <button className="btn-action" onClick={handleStartGame}>
            Start Game
          </button>
        )}
        {gameState.phase.includes('betting') &&
         gameState.currentTurn === playerId &&
         gameState.tokenAssignments?.[playerId] !== undefined && (
          <button className="btn-action btn-pass" onClick={handlePassTurn}>
            Pass
          </button>
        )}
        {gameState.phase.includes('betting') && gameState.allPlayersHaveTokens && (
          <button className="btn-action" onClick={handleSetReady}>
            Ready
          </button>
        )}
      </div>

      {/* BOTTOM RIGHT: Status/Game Log */}
      {statusText && <div className="game-status">{statusText}</div>}

      {/* Game Result Modal */}
      {gameResult && (
        <div className="game-result-overlay">
          <div className="game-result-modal">
            <h1 className={gameResult.success ? 'result-win' : 'result-lose'}>
              {gameResult.success ? '🎊 YOU WIN!' : '❌ YOU LOSE'}
            </h1>

            <div className="result-rankings">
              <h3>Hand Rankings:</h3>
              {gameResult.rankedHands.map((hand, i) => {
                const correct = hand.rank === gameState.tokenAssignments[hand.playerId];
                const icon = correct ? '✅' : '❌';
                return (
                  <div key={i} className="result-hand">
                    {icon} {hand.rank}. {hand.playerName}: {hand.evaluation.description}
                  </div>
                );
              })}
            </div>

            <div className="result-actions">
              <button className="btn-action" onClick={handleRestartGame}>
                Play Again
              </button>
              <button className="btn-action" onClick={onReturnToLobby}>
                Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
