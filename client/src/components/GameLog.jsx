import { useRef, useEffect } from 'react';
import './GameLog.css';

const PHASE_NAMES = {
  betting_1: 'Pre-flop',
  betting_2: 'Flop',
  betting_3: 'Turn',
  betting_4: 'River'
};

const PHASE_COLORS = {
  betting_1: '#ffffff',
  betting_2: '#ffff00',
  betting_3: '#ff9900',
  betting_4: '#ff0000'
};

const GameLog = ({ actionLog = [] }) => {
  const contentRef = useRef(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [actionLog]);

  if (!actionLog || actionLog.length === 0) {
    return (
      <div className="game-log">
        <div className="game-log-title">Game Log</div>
        <div className="game-log-content">
          <div className="game-log-empty">No actions yet</div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-log">
      <div className="game-log-title">Game Log</div>
      <div className="game-log-content" ref={contentRef}>
        {actionLog.map((action, index) => {
          const phaseName = PHASE_NAMES[action.phase] || action.phase;
          const phaseColor = PHASE_COLORS[action.phase] || '#ffffff';

          let logText;
          if (action.fromPool) {
            logText = `${action.playerName} took ${action.tokenNumber}.`;
          } else {
            logText = `${action.playerName} stole ${action.tokenNumber} from ${action.fromPlayerName}.`;
          }

          return (
            <div key={index} className="game-log-entry">
              <span className="game-log-phase" style={{ color: phaseColor }}>
                [{phaseName}]
              </span>
              <span className="game-log-text">{logText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameLog;
