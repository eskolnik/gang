import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import networkManager from '../game/core/NetworkManager.js';
import { getSession } from '../game/utils/storage.js';

const NetworkContext = createContext(null);

export const NetworkProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState(null);
  const [roomList, setRoomList] = useState([]);
  const [isRejoining, setIsRejoining] = useState(false);
  const [rejoinSuccess, setRejoinSuccess] = useState(false);

  useEffect(() => {
    // Connect to server on mount
    networkManager.connect();

    // Set up event listeners
    const handleConnected = async () => {
      setConnected(true);

      // Check for active session and attempt to rejoin
      const session = getSession();
      if (session && session.roomId && session.playerId) {
        console.log('Found active session, attempting to rejoin...', session.roomId);
        setIsRejoining(true);

        try {
          await networkManager.rejoinGame(session.roomId, session.playerId);
          setRoomId(networkManager.roomId);
          setPlayerId(networkManager.playerId);
          setPlayerName(networkManager.playerName);
          setGameState(networkManager.gameState);
          setRejoinSuccess(true);
          console.log('✅ Successfully rejoined game');
        } catch (error) {
          console.log('❌ Failed to rejoin:', error.message);
          setRejoinSuccess(false);
        } finally {
          setIsRejoining(false);
        }
      }
    };

    const handleDisconnected = () => {
      setConnected(false);
    };

    const handleGameStateUpdate = (state) => {
      setGameState(state);
    };

    const handleRoomListUpdate = (rooms) => {
      setRoomList(rooms);
    };

    networkManager.on('connected', handleConnected);
    networkManager.on('disconnected', handleDisconnected);
    networkManager.on('gameStateUpdate', handleGameStateUpdate);
    networkManager.on('roomListUpdate', handleRoomListUpdate);

    // Clean up on unmount
    return () => {
      networkManager.off('connected', handleConnected);
      networkManager.off('disconnected', handleDisconnected);
      networkManager.off('gameStateUpdate', handleGameStateUpdate);
      networkManager.off('roomListUpdate', handleRoomListUpdate);
      networkManager.disconnect();
    };
  }, []);

  // Wrapper methods that update local state after NetworkManager calls
  const createRoom = useCallback(async (playerName, maxPlayers = 6, minPlayers = 2, gameMode = 'single') => {
    const response = await networkManager.createRoom(playerName, maxPlayers, minPlayers, gameMode);
    setRoomId(networkManager.roomId);
    setPlayerId(networkManager.playerId);
    setPlayerName(networkManager.playerName);
    setGameState(networkManager.gameState);
    return response;
  }, []);

  const joinRoom = useCallback(async (roomId, playerName) => {
    const response = await networkManager.joinRoom(roomId, playerName);
    setRoomId(networkManager.roomId);
    setPlayerId(networkManager.playerId);
    setPlayerName(networkManager.playerName);
    setGameState(networkManager.gameState);
    return response;
  }, []);

  const getRoomList = useCallback(async () => {
    const result = await networkManager.getRoomList();
    setRoomList(result.rooms);
    return result;
  }, []);

  const rejoinGame = useCallback(async (roomId, playerId) => {
    const response = await networkManager.rejoinGame(roomId, playerId);
    setRoomId(networkManager.roomId);
    setPlayerId(networkManager.playerId);
    setPlayerName(networkManager.playerName);
    setGameState(networkManager.gameState);
    return response;
  }, []);

  const joinAsSpectator = useCallback(async (roomId, spectatorName) => {
    const response = await networkManager.joinAsSpectator(roomId, spectatorName);
    setRoomId(networkManager.roomId);
    setPlayerId(networkManager.playerId);
    setPlayerName(networkManager.playerName);
    setGameState(networkManager.gameState);
    return response;
  }, []);

  const leaveSpectator = useCallback(async () => {
    await networkManager.leaveSpectator();
    setRoomId(null);
    setPlayerId(null);
    setPlayerName(null);
    setGameState(null);
  }, []);

  const returnToLobby = useCallback(async () => {
    return await networkManager.returnToLobby();
  }, []);

  const startGame = useCallback(async () => {
    return await networkManager.startGame();
  }, []);

  const restartGame = useCallback(async () => {
    return await networkManager.restartGame();
  }, []);

  const nextRound = useCallback(async () => {
    return await networkManager.nextRound();
  }, []);

  const claimToken = useCallback(async (tokenNumber) => {
    return await networkManager.claimToken(tokenNumber);
  }, []);

  const returnToken = useCallback(async () => {
    return await networkManager.returnToken();
  }, []);

  const setReady = useCallback(async () => {
    return await networkManager.setReady();
  }, []);

  const leaveGame = useCallback(() => {
    networkManager.leaveGame();
    setRoomId(null);
    setPlayerId(null);
    setPlayerName(null);
    setGameState(null);
    setRejoinSuccess(false);
  }, []);

  const value = {
    connected,
    gameState,
    roomId,
    playerId,
    playerName,
    roomList,
    isRejoining,
    rejoinSuccess,
    createRoom,
    joinRoom,
    getRoomList,
    rejoinGame,
    joinAsSpectator,
    leaveSpectator,
    returnToLobby,
    startGame,
    restartGame,
    nextRound,
    claimToken,
    returnToken,
    setReady,
    leaveGame,
    networkManager // Expose the raw manager for advanced use cases
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
