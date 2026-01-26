import { useState, useEffect } from "react";
import { useNetwork } from "../context/NetworkContext";
import {
  getSession,
  getPlayerName,
  savePlayerName,
} from "../game/utils/storage";
import "./Lobby.css";
import SettingsMenu from "./SettingsMenu";

const Lobby = ({ onStartGame }) => {
  const { connected, roomList, createRoom, joinRoom, getRoomList, rejoinGame, joinAsSpectator } =
    useNetwork();
  const [playerName, setPlayerName] = useState(getPlayerName());
  const [tempName, setTempName] = useState(getPlayerName()); // Temporary name during editing
  const [isEditingName, setIsEditingName] = useState(!getPlayerName()); // Start in edit mode if no name
  const [roomCode, setRoomCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info"); // 'info' | 'success' | 'error'
  const [isLoading, setIsLoading] = useState(false);
  const [myActiveGameId, setMyActiveGameId] = useState(null);

  // Fetch room list and update myActiveGameId
  const fetchRoomList = async () => {
    try {
      const { myActiveGameId: activeId } = await getRoomList();
      setMyActiveGameId(activeId);
    } catch (error) {
      console.error("Failed to get room list:", error);
    }
  };

  // Update status message based on connection
  useEffect(() => {
    if (connected) {
      setStatusMessage("✅ Connected to server");
      setStatusType("success");
      fetchRoomList();
    } else {
      setStatusMessage("Connecting to server...");
      setStatusType("info");
    }
  }, [connected]);

  // Auto-refresh room list every 3 seconds
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      fetchRoomList();
    }, 3000);

    return () => clearInterval(interval);
  }, [connected]);

  const handleCreateRoom = async (gameMode) => {
    if (!playerName.trim()) {
      setStatusMessage("❌ Please enter your name");
      setStatusType("error");
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("Creating room...");
      setStatusType("info");

      const response = await createRoom(playerName.trim(), 6, 2, gameMode);

      setStatusMessage(`✅ Room created: ${response.roomId}`);
      setStatusType("success");

      // Transition to game after brief delay
      setTimeout(() => {
        onStartGame();
      }, 500);
    } catch (error) {
      setStatusMessage(`❌ Failed: ${error.message}`);
      setStatusType("error");
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    if (!playerName.trim()) {
      setStatusMessage("❌ Please enter your name");
      setStatusType("error");
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("Joining room...");
      setStatusType("info");

      await joinRoom(roomId, playerName.trim());

      setStatusMessage(`✅ Joined room: ${roomId}`);
      setStatusType("success");

      // Transition to game after brief delay
      setTimeout(() => {
        onStartGame();
      }, 500);
    } catch (error) {
      setStatusMessage(`❌ ${error.message}`);
      setStatusType("error");
      setIsLoading(false);
    }
  };

  const handleJoinByCode = () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) {
      setStatusMessage("❌ Invalid room code (must be 6 characters)");
      setStatusType("error");
      return;
    }
    handleJoinRoom(code);
  };

  const handleRejoinGame = async (roomId) => {
    try {
      setIsLoading(true);
      setStatusMessage("Rejoining game...");
      setStatusType("info");

      const session = getSession();
      if (!session || session.roomId !== roomId) {
        throw new Error("Session not found");
      }

      await rejoinGame(session.roomId, session.playerId);

      setStatusMessage(`✅ Rejoined game: ${roomId}`);
      setStatusType("success");

      // Transition to game after brief delay
      setTimeout(() => {
        onStartGame();
      }, 500);
    } catch (error) {
      setStatusMessage(`❌ ${error.message}`);
      setStatusType("error");
      setIsLoading(false);
    }
  };

  const handleSpectate = async (roomId) => {
    if (!playerName.trim()) {
      setStatusMessage("❌ Please enter your name");
      setStatusType("error");
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("Joining as spectator...");
      setStatusType("info");

      await joinAsSpectator(roomId, playerName.trim());

      setStatusMessage(`✅ Joined as spectator: ${roomId}`);
      setStatusType("success");

      // Transition to game after brief delay
      setTimeout(() => {
        onStartGame();
      }, 500);
    } catch (error) {
      setStatusMessage(`❌ ${error.message}`);
      setStatusType("error");
      setIsLoading(false);
    }
  };

  const handleRoomCodeKeyPress = (e) => {
    if (e.key === "Enter") {
      handleJoinByCode();
    }
  };

  const handlePlayerNameChange = (e) => {
    const name = e.target.value;
    setTempName(name);
  };

  const handleNameDone = () => {
    if (!tempName.trim()) {
      setStatusMessage("❌ Please enter your name");
      setStatusType("error");
      return;
    }
    setPlayerName(tempName.trim());
    savePlayerName(tempName.trim());
    setIsEditingName(false);
    setStatusMessage("");
  };

  const handleNameEdit = () => {
    setTempName(playerName);
    setIsEditingName(true);
  };

  const handleNameKeyPress = (e) => {
    if (e.key === "Enter") {
      handleNameDone();
    }
  };

  // If no player name set or editing, show only name entry
  if (!playerName || isEditingName) {
    return (
      <div className="lobby">
        <div className="lobby-container lobby-container-centered">
          {/* Header */}
          <h1 className="lobby-title">DA GANG</h1>
          <h4 className="lobby-subtitle">Be a gang. Do crimes.</h4>

          {/* Connection Status */}
          {statusType == "error" && (
            <div className={`status-message status-${statusType}`}>
              {statusMessage}
            </div>
          )}

          {/* Player Name Input - Large and Centered */}
          <div className="name-entry-form">
            <label htmlFor="player-name">Enter your name:</label>
            <input
              id="player-name"
              type="text"
              value={tempName}
              onChange={handlePlayerNameChange}
              onKeyPress={handleNameKeyPress}
              autoFocus
              maxLength={20}
            />
            <button
              className="btn btn-primary btn-done"
              onClick={handleNameDone}
              disabled={!tempName.trim()}
            >
              Done
            </button>
          </div>
        </div>
        <SettingsMenu />
      </div>
    );
  }

  return (
    <div className="lobby">
      <div className="lobby-container">
        {/* Header */}
        <h1 className="lobby-title">DA GANG</h1>
        <h4 className="lobby-subtitle">A game about friendship and cooperation</h4>

        {/* Connection Status */}
        {statusType == "error" && (
          <div className={`status-message status-${statusType}`}>
            {statusMessage}
          </div>
        )}

        {/* Player Name Display with Edit Button */}
        <div className="name-section">
          <label>Name:</label>
          <div className="name-display">
            <span className="player-name-text">{playerName}</span>
            <button
              className="btn-edit-name"
              onClick={handleNameEdit}
              title="Edit name"
            >
              <i className="fas fa-pencil"></i>
            </button>
          </div>
        </div>

        {/* Create Game Buttons */}
        <div className="create-game-buttons">
          <button
            className="btn btn-primary"
            onClick={() => handleCreateRoom("single")}
            disabled={!connected || isLoading}
          >
            New Single Round Table
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleCreateRoom("best-of-5")}
            disabled={!connected || isLoading}
          >
            New Best of 5 Table
          </button>
        </div>

        {/* My Active Game (if any) */}
        {myActiveGameId && (
          <div className="rooms-section">
            <h2>Your Active Game</h2>
            <div className="room-list">
              {roomList
                .filter((r) => r.roomId === myActiveGameId)
                .map((room) => (
                  <div key={room.roomId} className="room-item room-item-active">
                    <div className="room-id">{room.roomId}</div>
                    <div className="room-count">
                      {room.playerCount}/{room.maxPlayers}
                    </div>
                    <div className="room-game-type">
                      {room.gameMode === "best-of-5" ? "Best of 5" : "Single Round"}
                    </div>
                    <div className="room-players">
                      {room.players.join(", ")}
                    </div>
                    <div className="room-spectators">
                      {room.spectators && room.spectators.length > 0
                        ? `👁️ ${room.spectators.join(", ")}`
                        : "No spectators"}
                    </div>
                    <button
                      className="btn btn-primary btn-rejoin"
                      onClick={() =>
                        !isLoading && handleRejoinGame(room.roomId)
                      }
                      disabled={isLoading}
                    >
                      Rejoin Table
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Available Rooms */}
        <div className="rooms-section">
          <h2>All Tables</h2>
          <div className="room-list">
            {!connected ? (
              <div className="room-list-empty">Connecting...</div>
            ) : roomList.length === 0 ? (
              <div className="room-list-empty">
                No tables available. Create one!
              </div>
            ) : (
              roomList.slice(0, 10).map((room) => {
                const isMyGame = room.roomId === myActiveGameId;
                const isJoinable = room.isJoinable && !isMyGame;
                const isInProgress = room.isStarted;

                if (isMyGame) return null; // Already shown above

                // Determine CSS class for color coding
                const roomClass = isInProgress ? "room-item-in-progress" : "";

                return (
                  <div
                    key={room.roomId}
                    className={`room-item ${roomClass}`}
                  >
                    <div className="room-id">{room.roomId}</div>
                    <div className="room-count">
                      {room.playerCount}/{room.maxPlayers}
                    </div>
                    <div className="room-game-type">
                      {room.gameMode === "best-of-5" ? "Best of 5" : "Single Round"}
                    </div>
                    <div className="room-players">
                      {room.players.join(", ")}
                    </div>
                    <div className="room-spectators">
                      {room.spectators && room.spectators.length > 0
                        ? `👁️ ${room.spectators.join(", ")}`
                        : "No spectators"}
                    </div>
                    <div className="room-buttons">
                      {isJoinable && (
                        <button
                          className="btn btn-secondary btn-join"
                          onClick={() =>
                            !isLoading && handleJoinRoom(room.roomId)
                          }
                          disabled={isLoading}
                        >
                          Join
                        </button>
                      )}
                      <button
                        className="btn btn-spectate"
                        onClick={() =>
                          !isLoading && handleSpectate(room.roomId)
                        }
                        disabled={isLoading}
                      >
                        Spectate
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      <SettingsMenu />
    </div>
  );
};

export default Lobby;
