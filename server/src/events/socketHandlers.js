import { GameRoom, GAME_PHASES } from '../gameLogic/GameRoom.js';
import { markPlayerDisconnected } from '../persistence/playerRepository.js';

/**
 * Generate a random room ID
 */
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Generate a random player ID
 */
function generatePlayerId() {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Helper function to broadcast private game state to all players in a room
 */
function broadcastGameState(io, room) {
  for (const [playerId, player] of room.players) {
    const playerSocket = io.sockets.sockets.get(player.socketId);
    if (playerSocket) {
      const playerState = room.getPlayerState(playerId);
      console.log(`Broadcasting to ${playerId}: myPocketCards =`, playerState.myPocketCards);
      playerSocket.emit('gameStateUpdate', playerState);
    }
  }
}

/**
 * Helper function to broadcast room list to all connected clients
 */
function broadcastRoomList(io, gameRooms) {
  const roomList = Array.from(gameRooms.values())
    .map(room => room.getLobbyInfo());
    // Show all rooms (joinable and in-progress) so players can see their active games

  io.emit('roomListUpdate', roomList);
}

/**
 * Set up all Socket.io event handlers
 */
export function setupSocketHandlers(io, gameRooms) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Test event to verify callbacks work
    socket.on('ping', (callback) => {
      console.log('Got ping, sending pong...');
      callback({ message: 'pong' });
    });

    let currentRoomId = null;
    let currentPlayerId = null;

    /**
     * Get list of all rooms (joinable and in-progress)
     */
    socket.on('getRoomList', (callback) => {
      try {
        const roomList = Array.from(gameRooms.values())
          .map(room => room.getLobbyInfo());

        // Find if current player is in any game
        let myActiveGameId = null;
        if (currentPlayerId) {
          for (const room of gameRooms.values()) {
            if (room.players.has(currentPlayerId)) {
              myActiveGameId = room.roomId;
              break;
            }
          }
        }

        callback({ success: true, rooms: roomList, myActiveGameId });
      } catch (error) {
        console.error('Error getting room list:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Create a new game room
     */
    socket.on('createRoom', (data, callback) => {
      try {
        // Check if player is already in a game
        if (currentPlayerId && currentRoomId) {
          const existingRoom = gameRooms.get(currentRoomId);
          if (existingRoom && existingRoom.players.has(currentPlayerId)) {
            return callback({
              success: false,
              error: 'You are already in a game. Please leave it first.',
              currentRoomId
            });
          }
        }

        const roomId = generateRoomId();
        const playerId = generatePlayerId();
        const playerName = data.playerName || 'Player';

        const room = new GameRoom(roomId, {
          maxPlayers: data.maxPlayers || 6,
          minPlayers: data.minPlayers || 2
        });

        room.addPlayer(playerId, playerName, socket.id);
        gameRooms.set(roomId, room);

        // Join the socket room
        socket.join(roomId);
        currentRoomId = roomId;
        currentPlayerId = playerId;

        console.log(`🎲 Room created: ${roomId} by ${playerName} (${playerId})`);

        const playerState = room.getPlayerState(playerId);
        console.log('  Calling callback with success response...');

        callback({
          success: true,
          roomId,
          playerId,
          playerName,
          gameState: playerState
        });

        console.log('  Callback called, broadcasting state update...');

        // Broadcast room update to all players (with private pocket cards)
        broadcastGameState(io, room);
        console.log('  State update broadcasted');

        // Broadcast updated room list to all clients
        broadcastRoomList(io, gameRooms);
      } catch (error) {
        console.error('Error creating room:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Join an existing room
     */
    socket.on('joinRoom', (data, callback) => {
      try {
        const { roomId, playerName } = data;

        // Check if player is already in a DIFFERENT game
        if (currentPlayerId && currentRoomId && currentRoomId !== roomId) {
          const existingRoom = gameRooms.get(currentRoomId);
          if (existingRoom && existingRoom.players.has(currentPlayerId)) {
            return callback({
              success: false,
              error: 'You are already in a different game. Please leave it first.',
              currentRoomId
            });
          }
        }

        const room = gameRooms.get(roomId);

        if (!room) {
          return callback({ success: false, error: 'Room not found' });
        }

        // Add new player
        const playerId = generatePlayerId();
        room.addPlayer(playerId, playerName || 'Player', socket.id);
        console.log(`👋 ${playerName} (${playerId}) joined room ${roomId}`);

        socket.join(roomId);
        currentRoomId = roomId;
        currentPlayerId = playerId;

        callback({
          success: true,
          roomId,
          playerId,
          playerName,
          gameState: room.getPlayerState(playerId)
        });

        // Broadcast room update to all players (with private pocket cards)
        broadcastGameState(io, room);

        // Broadcast updated room list to all clients
        broadcastRoomList(io, gameRooms);
      } catch (error) {
        console.error('Error joining room:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Rejoin an existing game
     */
    socket.on('rejoinGame', async (data, callback) => {
      try {
        const { roomId, playerId } = data;

        // Try to get room from memory first
        let room = gameRooms.get(roomId);

        // If not in memory, try to load from database
        if (!room) {
          console.log(`🔍 Room ${roomId} not in memory, attempting to load from database...`);
          room = await GameRoom.load(roomId);

          if (!room) {
            return callback({ success: false, error: 'Room not found' });
          }

          // Add loaded room to memory
          gameRooms.set(roomId, room);
          console.log(`✅ Room ${roomId} loaded from database`);
        }

        // Verify player exists in room
        const player = room.players.get(playerId);
        if (!player) {
          return callback({ success: false, error: 'Player not found in room' });
        }

        // Reconnect player with new socket ID
        room.reconnectPlayer(playerId, socket.id);

        socket.join(roomId);
        currentRoomId = roomId;
        currentPlayerId = playerId;

        console.log(`🔄 ${player.name} (${playerId}) rejoined room ${roomId}`);

        callback({
          success: true,
          roomId,
          playerId,
          playerName: player.name,
          gameState: room.getPlayerState(playerId)
        });

        // Broadcast room update to all players
        broadcastGameState(io, room);
      } catch (error) {
        console.error('Error rejoining game:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Start the game
     */
    socket.on('startGame', (callback) => {
      try {
        if (!currentRoomId) {
          return callback({ success: false, error: 'Not in a room' });
        }

        const room = gameRooms.get(currentRoomId);
        if (!room) {
          return callback({ success: false, error: 'Room not found' });
        }

        room.startGame();

        console.log(`🎮 Game started in room ${currentRoomId}`);

        callback({ success: true });

        // Send each player their private state (with pocket cards)
        for (const [playerId, player] of room.players) {
          const playerSocket = io.sockets.sockets.get(player.socketId);
          if (playerSocket) {
            playerSocket.emit('gameStateUpdate', room.getPlayerState(playerId));
          }
        }

        // Broadcast updated room list (game should disappear from lobby)
        broadcastRoomList(io, gameRooms);
      } catch (error) {
        console.error('Error starting game:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Restart the game with same players
     */
    socket.on('restartGame', (callback) => {
      try {
        if (!currentRoomId) {
          return callback({ success: false, error: 'Not in a room' });
        }

        const room = gameRooms.get(currentRoomId);
        if (!room) {
          return callback({ success: false, error: 'Room not found' });
        }

        room.restartGame();

        console.log(`🔄 Game restarted in room ${currentRoomId}`);

        callback({ success: true });

        // Send each player their private state (with new pocket cards)
        for (const [playerId, player] of room.players) {
          const playerSocket = io.sockets.sockets.get(player.socketId);
          if (playerSocket) {
            playerSocket.emit('gameStateUpdate', room.getPlayerState(playerId));
          }
        }
      } catch (error) {
        console.error('Error restarting game:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Claim a token
     */
    socket.on('claimToken', (data, callback) => {
      try {
        if (!currentRoomId || !currentPlayerId) {
          return callback({ success: false, error: 'Not in a game' });
        }

        const room = gameRooms.get(currentRoomId);
        if (!room) {
          return callback({ success: false, error: 'Room not found' });
        }

        const { tokenNumber } = data;
        const result = room.claimToken(currentPlayerId, tokenNumber);

        console.log(`🎯 Player ${currentPlayerId} claimed token ${tokenNumber} in room ${currentRoomId}`);

        callback({ success: true, ...result });

        // Broadcast updated state to all players
        broadcastGameState(io, room);
      } catch (error) {
        console.error('Error claiming token:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Pass turn (keep current token)
     */
    socket.on('passTurn', (callback) => {
      try {
        if (!currentRoomId || !currentPlayerId) {
          return callback({ success: false, error: 'Not in a game' });
        }

        const room = gameRooms.get(currentRoomId);
        if (!room) {
          return callback({ success: false, error: 'Room not found' });
        }

        const result = room.passTurn(currentPlayerId);

        console.log(`⏭️ Player ${currentPlayerId} passed turn in room ${currentRoomId}`);

        callback({ success: true, ...result });

        // Broadcast updated state to all players (with private pocket cards)
        broadcastGameState(io, room);
      } catch (error) {
        console.error('Error passing turn:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Mark player as ready
     */
    socket.on('playerReady', (callback) => {
      try {
        if (!currentRoomId || !currentPlayerId) {
          return callback({ success: false, error: 'Not in a game' });
        }

        const room = gameRooms.get(currentRoomId);
        if (!room) {
          return callback({ success: false, error: 'Room not found' });
        }

        room.setPlayerReady(currentPlayerId);

        console.log(`✅ Player ${currentPlayerId} is ready in room ${currentRoomId}`);

        callback({ success: true });

        // Broadcast updated state with private pocket cards
        broadcastGameState(io, room);

        // Check if all players are ready
        if (room.allPlayersReady()) {
          console.log(`⏭️  All players ready, advancing phase in room ${currentRoomId}`);

          // Advance to next phase
          const result = room.advancePhase();

          // If we're in reveal phase, send results
          if (result && room.phase === GAME_PHASES.COMPLETE) {
            io.to(currentRoomId).emit('gameComplete', result);
          }

          // Broadcast updated state with new cards
          broadcastGameState(io, room);
        }
      } catch (error) {
        console.error('Error setting player ready:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Get current game state
     */
    socket.on('getGameState', (callback) => {
      try {
        if (!currentRoomId || !currentPlayerId) {
          return callback({ success: false, error: 'Not in a game' });
        }

        const room = gameRooms.get(currentRoomId);
        if (!room) {
          return callback({ success: false, error: 'Room not found' });
        }

        callback({
          success: true,
          gameState: room.getPlayerState(currentPlayerId)
        });
      } catch (error) {
        console.error('Error getting game state:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Return to lobby - player stays in game but not at table
     */
    socket.on('returnToLobby', (callback) => {
      try {
        if (currentRoomId && currentPlayerId) {
          const room = gameRooms.get(currentRoomId);
          if (room) {
            room.setPlayerAtTable(currentPlayerId, false);

            console.log(`🚪 Player ${currentPlayerId} returned to lobby from room ${currentRoomId}`);

            // Broadcast updated state to all players
            broadcastGameState(io, room);
          }
        }

        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        console.error('Error returning to lobby:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    /**
     * Handle disconnect - mark player as disconnected but don't remove them
     */
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);

      if (currentRoomId && currentPlayerId) {
        const room = gameRooms.get(currentRoomId);
        if (room) {
          // Mark player as disconnected in database
          markPlayerDisconnected(currentPlayerId);

          console.log(`📴 Player ${currentPlayerId} disconnected from room ${currentRoomId} (can rejoin)`);

          // Broadcast updated state to remaining connected players
          broadcastGameState(io, room);
        }
      }
    });

    /**
     * Handle explicit quit - remove player and delete room if empty
     */
    socket.on('leaveGame', (callback) => {
      try {
        if (currentRoomId && currentPlayerId) {
          const room = gameRooms.get(currentRoomId);
          if (room) {
            const wasAutoDeleted = room.removePlayer(currentPlayerId);

            console.log(`👋 Player ${currentPlayerId} left room ${currentRoomId}`);

            // If room was auto-deleted or is now empty, remove from memory
            if (wasAutoDeleted || room.getPlayerCount() === 0) {
              gameRooms.delete(currentRoomId);
              if (!wasAutoDeleted) {
                room.delete();
                console.log(`🗑️  Room ${currentRoomId} deleted (empty)`);
              }
            } else {
              // Broadcast updated state to remaining players
              broadcastGameState(io, room);
            }

            // Broadcast updated room list
            broadcastRoomList(io, gameRooms);

            // Clear current room and player
            currentRoomId = null;
            currentPlayerId = null;
          }
        }

        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        console.error('Error leaving game:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });
  });
}
