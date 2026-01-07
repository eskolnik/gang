import { useState } from 'react';
import { NetworkProvider } from './context/NetworkContext';
import Lobby from './components/Lobby';
import Game from './components/Game';

function App() {
  const [currentScene, setCurrentScene] = useState('lobby'); // 'lobby' | 'game'

  return (
    <NetworkProvider>
      {currentScene === 'lobby' && <Lobby onStartGame={() => setCurrentScene('game')} />}
      {currentScene === 'game' && <Game onReturnToLobby={() => setCurrentScene('lobby')} />}
    </NetworkProvider>
  );
}

export default App;
