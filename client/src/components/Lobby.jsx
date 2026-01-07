import { useState, useEffect } from 'react';
import { useNetwork } from '../context/NetworkContext';
import './Lobby.css';

const Lobby = ({ onStartGame }) => {
  const { connected, roomList, createRoom, joinRoom, getRoomList } = useNetwork();
  const [playerName, setPlayerName] = useState('Player');
  const [roomCode, setRoomCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info'); // 'info' | 'success' | 'error'
  const [isLoading, setIsLoading] = useState(false);

  // Update status message based on connection
  useEffect(() => {
    if (connected) {
      setStatusMessage('✅ Connected to server');
      setStatusType('success');
      getRoomList().catch(console.error);
    } else {
      setStatusMessage('Connecting to server...');
      setStatusType('info');
    }
  }, [connected, getRoomList]);

  // Auto-refresh room list every 3 seconds
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      getRoomList().catch(console.error);
    }, 3000);

    return () => clearInterval(interval);
  }, [connected, getRoomList]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setStatusMessage('❌ Please enter your name');
      setStatusType('error');
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage('Creating room...');
      setStatusType('info');

      const response = await createRoom(playerName.trim(), 6, 2);

      setStatusMessage(`✅ Room created: ${response.roomId}`);
      setStatusType('success');

      // Transition to game after brief delay
      setTimeout(() => {
        onStartGame();
      }, 500);
    } catch (error) {
      setStatusMessage(`❌ Failed: ${error.message}`);
      setStatusType('error');
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    if (!playerName.trim()) {
      setStatusMessage('❌ Please enter your name');
      setStatusType('error');
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage('Joining room...');
      setStatusType('info');

      await joinRoom(roomId, playerName.trim());

      setStatusMessage(`✅ Joined room: ${roomId}`);
      setStatusType('success');

      // Transition to game after brief delay
      setTimeout(() => {
        onStartGame();
      }, 500);
    } catch (error) {
      setStatusMessage(`❌ ${error.message}`);
      setStatusType('error');
      setIsLoading(false);
    }
  };

  const handleJoinByCode = () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) {
      setStatusMessage('❌ Invalid room code (must be 6 characters)');
      setStatusType('error');
      return;
    }
    handleJoinRoom(code);
  };

  const handleRoomCodeKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinByCode();
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-container">
        {/* Header */}
        <h1 className="lobby-title">THE GANG</h1>
        <p className="lobby-subtitle">Cooperative Poker</p>

        {/* Connection Status */}
        <div className={`status-message status-${statusType}`}>
          {statusMessage}
        </div>

        {/* Player Name Input */}
        <div className="name-section">
          <label htmlFor="player-name">Your Name:</label>
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            disabled={isLoading}
            maxLength={20}
          />
        </div>

        {/* Available Rooms */}
        <div className="rooms-section">
          <h2>Available Rooms</h2>
          <div className="room-list">
            {!connected ? (
              <div className="room-list-empty">Connecting...</div>
            ) : roomList.length === 0 ? (
              <div className="room-list-empty">No rooms available. Create one!</div>
            ) : (
              roomList.slice(0, 5).map((room) => (
                <div
                  key={room.roomId}
                  className="room-item"
                  onClick={() => !isLoading && handleJoinRoom(room.roomId)}
                >
                  <div className="room-id">{room.roomId}</div>
                  <div className="room-count">{room.playerCount}/{room.maxPlayers}</div>
                  <div className="room-players">{room.players.join(', ')}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create Room Button */}
        <button
          className="btn btn-primary"
          onClick={handleCreateRoom}
          disabled={!connected || isLoading}
        >
          Create New Room
        </button>

        {/* Manual Join Section */}
        <div className="manual-join">
          <label htmlFor="room-code">Or enter code:</label>
          <input
            id="room-code"
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyPress={handleRoomCodeKeyPress}
            placeholder="ABCDEF"
            disabled={isLoading}
            maxLength={6}
          />
          <button
            className="btn btn-secondary"
            onClick={handleJoinByCode}
            disabled={!connected || isLoading}
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
