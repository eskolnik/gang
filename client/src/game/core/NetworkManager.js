import { io } from 'socket.io-client';
import { SERVER_URL } from '../utils/constants.js';
import { saveSession, clearSession } from '../utils/storage.js';

/**
 * NetworkManager - Singleton wrapper for Socket.io client
 * Handles all server communication
 */
export class NetworkManager {
  constructor() {
    if (NetworkManager.instance) {
      return NetworkManager.instance;
    }

    this.socket = null;
    this.connected = false;
    this.roomId = null;
    this.playerId = null;
    this.playerName = null;
    this.gameState = null;
    this.eventHandlers = new Map();
    this.lastProcessedVersion = 0; // Track last processed state version to prevent stale updates

    NetworkManager.instance = this;
  }

  /**
   * Connect to the server
   */
  connect() {
    if (this.socket) {
      console.warn('Already connected');
      return;
    }

    console.log('Connecting to server:', SERVER_URL);

    this.socket = io(SERVER_URL, {
      transports: ['polling'], // Use polling for stability (can upgrade later)
      upgrade: false
    });

    // Set up base event handlers
    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket.id);
      this.connected = true;
      this.emit('connected', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      this.connected = false;
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.emit('error', error);
    });

    // Game-specific events
    this.socket.on('gameStateUpdate', (state) => {
      // Skip stale updates (can happen due to network latency)
      if (state.stateVersion && state.stateVersion <= this.lastProcessedVersion) {
        console.warn(`⚠️  Ignoring stale state update (version ${state.stateVersion}, last processed: ${this.lastProcessedVersion})`);
        return;
      }

      console.log('📢 Game state update:', state.phase, `(version ${state.stateVersion})`);
      this.lastProcessedVersion = state.stateVersion || 0;
      this.gameState = state;
      this.emit('gameStateUpdate', state);
    });

    this.socket.on('gameComplete', (result) => {
      console.log('🎊 Game complete:', result.success ? 'WIN' : 'LOSS');
      this.emit('gameComplete', result);
    });

    this.socket.on('roomListUpdate', (roomList) => {
      console.log('📋 Room list update:', roomList.length, 'rooms');
      this.emit('roomListUpdate', roomList);
    });

    this.socket.on('gameDeleted', (data) => {
      console.log('🗑️ Game deleted:', data.reason);
      this.emit('gameDeleted', data);
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Create a new game room
   */
  createRoom(playerName, maxPlayers = 6, minPlayers = 2, gameMode = 'single') {
    if (!this.connected) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('createRoom', {
        playerName,
        maxPlayers,
        minPlayers,
        gameMode
      }, (response) => {
        if (response.success) {
          this.roomId = response.roomId;
          this.playerId = response.playerId;
          this.playerName = playerName;
          this.gameState = response.gameState;
          this.lastProcessedVersion = 0; // Reset version counter for new game

          // Save session to localStorage
          saveSession({
            roomId: this.roomId,
            playerId: this.playerId,
            playerName: this.playerName
          });

          console.log('✅ Room created:', this.roomId);
          resolve(response);
        } else {
          console.error('❌ Failed to create room:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId, playerName) {
    if (!this.connected) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('joinRoom', {
        roomId: roomId.toUpperCase(),
        playerName
      }, (response) => {
        if (response.success) {
          this.roomId = response.roomId;
          this.playerId = response.playerId;
          this.playerName = playerName;
          this.gameState = response.gameState;
          this.lastProcessedVersion = 0; // Reset version counter for new game

          // Save session to localStorage
          saveSession({
            roomId: this.roomId,
            playerId: this.playerId,
            playerName: this.playerName
          });

          console.log('✅ Joined room:', this.roomId);
          resolve(response);
        } else {
          console.error('❌ Failed to join room:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Rejoin an existing game session
   * Used for reconnection and page refresh
   */
  rejoinGame(roomId, playerId) {
    if (!this.connected) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('rejoinGame', {
        roomId,
        playerId
      }, (response) => {
        if (response.success) {
          this.roomId = response.roomId;
          this.playerId = response.playerId;
          this.playerName = response.playerName;
          this.gameState = response.gameState;

          // Initialize to server's current state version (not 0)
          this.lastProcessedVersion = response.gameState?.stateVersion || 0;

          // Update session timestamp
          saveSession({
            roomId: this.roomId,
            playerId: this.playerId,
            playerName: this.playerName
          });

          console.log('✅ Rejoined game:', this.roomId, `(version ${this.lastProcessedVersion})`);
          resolve(response);
        } else {
          console.error('❌ Failed to rejoin game:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Join a room as a spectator
   */
  joinAsSpectator(roomId, spectatorName) {
    if (!this.connected) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('joinAsSpectator', {
        roomId: roomId.toUpperCase(),
        spectatorName
      }, (response) => {
        if (response.success) {
          this.roomId = response.roomId;
          this.playerId = response.spectatorId; // Spectators still get an ID
          this.playerName = spectatorName;
          this.isSpectator = true;

          console.log('✅ Joined as spectator:', this.roomId);
          resolve(response);
        } else {
          console.error('❌ Failed to join as spectator:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Leave spectator mode and return to lobby
   */
  leaveSpectator() {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.roomId) {
        reject(new Error('Not spectating any game'));
        return;
      }

      this.socket.emit('leaveSpectator', (response) => {
        if (response && response.success) {
          this.roomId = null;
          this.playerId = null;
          this.playerName = null;
          this.gameState = null;
          this.isSpectator = false;
          console.log('👁️  Left spectator mode');
          resolve(response);
        } else {
          console.error('❌ Failed to leave spectator:', response?.error);
          reject(new Error(response?.error || 'Failed to leave spectator'));
        }
      });
    });
  }

  /**
   * Leave the current game and return to lobby
   * Clears the session from localStorage
   */
  leaveGame() {
    // Notify server that we're explicitly leaving
    if (this.socket && this.roomId) {
      if (this.isSpectator) {
        this.socket.emit('leaveSpectator');
      } else {
        this.socket.emit('leaveGame');
      }
    }

    this.roomId = null;
    this.playerId = null;
    this.playerName = null;
    this.gameState = null;
    this.isSpectator = false;
    clearSession();
    console.log('👋 Left game');
  }

  /**
   * Get list of available rooms
   */
  getRoomList() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('getRoomList', (response) => {
        if (response.success) {
          console.log('✅ Got room list:', response.rooms.length, 'rooms');
          resolve({ rooms: response.rooms, myActiveGameId: response.myActiveGameId });
        } else {
          console.error('❌ Failed to get room list:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Return to lobby while keeping seat in game
   */
  returnToLobby() {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('returnToLobby', (response) => {
        if (response && response.success) {
          console.log('✅ Returned to lobby');
          resolve(response);
        } else {
          console.error('❌ Failed to return to lobby:', response?.error);
          reject(new Error(response?.error || 'Failed to return to lobby'));
        }
      });
    });
  }

  /**
   * Start the game
   */
  startGame() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('startGame', (response) => {
        if (response.success) {
          console.log('✅ Game started');
          resolve(response);
        } else {
          console.error('❌ Failed to start game:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Restart the game with same players
   */
  restartGame() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('restartGame', (response) => {
        if (response.success) {
          console.log('✅ Game restarted');
          resolve(response);
        } else {
          console.error('❌ Failed to restart game:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Start next round in best-of-5 series
   */
  nextRound() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('nextRound', (response) => {
        if (response.success) {
          console.log('✅ Next round started');
          resolve(response);
        } else {
          console.error('❌ Failed to start next round:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Claim a token
   */
  claimToken(tokenNumber) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('claimToken', { tokenNumber }, (response) => {
        if (response.success) {
          console.log('✅ Claimed token:', tokenNumber);
          resolve(response);
        } else {
          console.error('❌ Failed to claim token:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Pass turn (keep current token)
   */
  passTurn() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('passTurn', (response) => {
        if (response.success) {
          console.log('✅ Passed turn');
          resolve(response);
        } else {
          console.error('❌ Failed to pass turn:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Return token to pool (non-turn-based action)
   */
  returnToken() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('returnToken', (response) => {
        if (response.success) {
          console.log('✅ Returned token to pool');
          resolve(response);
        } else {
          console.error('❌ Failed to return token:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Mark player as ready
   */
  setReady() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('playerReady', (response) => {
        if (response.success) {
          console.log('✅ Marked as ready');
          resolve(response);
        } else {
          console.error('❌ Failed to mark ready:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Register an event handler
   */
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(callback);
  }

  /**
   * Unregister an event handler
   */
  off(event, callback) {
    if (!this.eventHandlers.has(event)) return;

    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(callback);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event to registered handlers
   */
  emit(event, data) {
    if (!this.eventHandlers.has(event)) return;

    const handlers = this.eventHandlers.get(event);
    handlers.forEach(callback => callback(data));
  }

  /**
   * Get current game state
   */
  getGameState() {
    return this.gameState;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
export default new NetworkManager();
