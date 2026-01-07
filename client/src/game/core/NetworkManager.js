import { io } from 'socket.io-client';
import { SERVER_URL } from '../utils/constants.js';

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
      console.log('📢 Game state update:', state.phase);
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
  createRoom(playerName, maxPlayers = 6, minPlayers = 2) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('createRoom', {
        playerName,
        maxPlayers,
        minPlayers
      }, (response) => {
        if (response.success) {
          this.roomId = response.roomId;
          this.playerId = response.playerId;
          this.playerName = playerName;
          this.gameState = response.gameState;
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
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('joinRoom', {
        roomId: roomId.toUpperCase(),
        playerName
      }, (response) => {
        if (response.success) {
          this.roomId = response.roomId;
          this.playerId = response.playerId;
          this.playerName = playerName;
          this.gameState = response.gameState;
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
          resolve(response.rooms);
        } else {
          console.error('❌ Failed to get room list:', response.error);
          reject(new Error(response.error));
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
