import { useState, useEffect } from 'react';
import { NetworkProvider, useNetwork } from './context/NetworkContext';
import { SettingsProvider } from './context/SettingsContext';
import Lobby from './components/Lobby';
import Game from './components/Game';

function AppContent() {
  const [currentScene, setCurrentScene] = useState('lobby'); // 'lobby' | 'game'
  const { rejoinSuccess, isRejoining, connected } = useNetwork();

  // Automatically switch to game scene when rejoin is successful
  useEffect(() => {
    if (rejoinSuccess) {
      setCurrentScene('game');
    }
  }, [rejoinSuccess]);

  // Show loading while rejoining
  if (isRejoining) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#ffffff',
        fontSize: '24px'
      }}>
        Reconnecting to game...
      </div>
    );
  }

  return (
    <>
      {/* Disconnection indicator */}
      {!connected && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ff0000',
          color: '#ffffff',
          padding: '10px',
          textAlign: 'center',
          zIndex: 1000,
          fontWeight: 'bold'
        }}>
          ⚠️ Disconnected from server - Attempting to reconnect...
        </div>
      )}

      {currentScene === 'lobby' && <Lobby onStartGame={() => setCurrentScene('game')} />}
      {currentScene === 'game' && <Game onReturnToLobby={() => setCurrentScene('lobby')} />}
    </>
  );
}

function App() {
  return (
    <SettingsProvider>
      <NetworkProvider>
        <AppContent />
      </NetworkProvider>
    </SettingsProvider>
  );
}

export default App;
