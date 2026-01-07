import { GameRoom, GAME_PHASES } from '../gameLogic/GameRoom.js';

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
    .map(room => room.getLobbyInfo())
    .filter(info => info.isJoinable); // Only show joinable rooms

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
     * Get list of available rooms
     */
    socket.on('getRoomList', (callback) => {
      try {
        const roomList = Array.from(gameRooms.values())
          .map(room => room.getLobbyInfo())
          .filter(info => info.isJoinable);

        callback({ success: true, rooms: roomList });
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
        const room = gameRooms.get(roomId);

        if (!room) {
          return callback({ success: false, error: 'Room not found' });
        }

        const playerId = generatePlayerId();
        room.addPlayer(playerId, playerName || 'Player', socket.id);

        socket.join(roomId);
        currentRoomId = roomId;
        currentPlayerId = playerId;

        console.log(`👋 ${playerName} (${playerId}) joined room ${roomId}`);

        callback({
          success: true,
          roomId,
          playerId,
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
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);

      if (currentRoomId && currentPlayerId) {
        const room = gameRooms.get(currentRoomId);
        if (room) {
          room.removePlayer(currentPlayerId);

          console.log(`👋 Player ${currentPlayerId} left room ${currentRoomId}`);

          // If room is empty, delete it
          if (room.getPlayerCount() === 0) {
            gameRooms.delete(currentRoomId);
            console.log(`🗑️  Room ${currentRoomId} deleted (empty)`);
          } else {
            // Broadcast updated state to remaining players
            broadcastGameState(io, room);
          }

          // Broadcast updated room list
          broadcastRoomList(io, gameRooms);
        }
      }
    });
  });
}
