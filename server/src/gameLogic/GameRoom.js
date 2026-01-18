import { Deck } from './Deck.js';
import { HandEvaluator } from './HandEvaluator.js';
import { saveGameRoom, deleteGameRoom } from '../persistence/gameRepository.js';
import { savePlayer, loadPlayersByRoom, updatePlayerSocketId, deletePlayersByRoom, updatePlayerAtTable } from '../persistence/playerRepository.js';

/**
 * Game phases in order
 */
export const GAME_PHASES = {
  WAITING: 'waiting',           // Waiting for players
  INITIAL_DEAL: 'initial_deal', // Dealing pocket cards
  BETTING_1: 'betting_1',       // First betting round (after pocket cards)
  FLOP: 'flop',                 // Dealing flop (3 cards)
  BETTING_2: 'betting_2',       // Second betting round (after flop)
  TURN: 'turn',                 // Dealing turn (1 card)
  BETTING_3: 'betting_3',       // Third betting round (after turn)
  RIVER: 'river',               // Dealing river (1 card)
  BETTING_4: 'betting_4',       // Final betting round (after river)
  REVEAL: 'reveal',             // Revealing and evaluating hands
  COMPLETE: 'complete'          // Game complete
};

/**
 * GameRoom - Manages state for a single game room
 */
export class GameRoom {
  constructor(roomId, options = {}) {
    this.roomId = roomId;
    this.players = new Map(); // playerId -> {id, name, socketId, pocketCards, ready, atTable}
    this.spectators = new Map(); // spectatorId -> {id, name, socketId}
    this.phase = GAME_PHASES.WAITING;
    this.deck = new Deck();
    this.communityCards = [];
    this.currentTurn = null; // Player ID whose turn it is for token selection
    this.tokenAssignments = {}; // playerId -> token number
    this.tokenPool = []; // Available tokens in the center
    this.bettingRoundHistory = []; // History of token assignments per round
    this.actionLog = []; // Detailed log of all token claims
    this.maxPlayers = options.maxPlayers || 6;
    this.minPlayers = options.minPlayers || 2;
    this.playerReadyStatus = {}; // playerId -> boolean
    this.hostId = null; // Player ID of the room host
    this.createdAt = options.createdAt || Date.now();
    this.lastAction = null; // Timestamp of last player action (for inactive game cleanup)
    this.gameMode = options.gameMode || 'single'; // 'single' or 'best-of-5'
    this.seriesWins = options.seriesWins || 0; // Number of rounds won in the series
    this.seriesLosses = options.seriesLosses || 0; // Number of rounds lost in the series
    this.lastGameResult = null; // Last game result for rejoining players
    this.dealerIndex = options.dealerIndex || 0; // Index of the dealer (rotates in best-of-5)
  }

  /**
   * Add a player to the room
   */
  addPlayer(playerId, playerName, socketId) {
    if (this.players.size >= this.maxPlayers) {
      throw new Error('Room is full');
    }
    if (this.phase !== GAME_PHASES.WAITING) {
      throw new Error('Game already in progress');
    }

    const playerData = {
      id: playerId,
      name: playerName,
      socketId: socketId,
      pocketCards: [],
      ready: false,
      atTable: true
    };

    this.players.set(playerId, playerData);
    this.playerReadyStatus[playerId] = false;

    // Set first player as host
    if (this.hostId === null) {
      this.hostId = playerId;
    }

    // Persist game state (saves both game room and all players)
    this.save();
  }

  /**
   * Remove a player from the room
   * Returns true if game should be deleted
   */
  removePlayer(playerId) {
    this.players.delete(playerId);
    delete this.playerReadyStatus[playerId];
    delete this.tokenAssignments[playerId];

    // Transfer host if the host is leaving
    if (this.hostId === playerId) {
      // Get the first remaining player as the new host
      const remainingPlayers = Array.from(this.players.keys());
      this.hostId = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
    }

    // Auto-delete game if it drops to 1 or fewer players and is in progress
    // OR if the room is completely empty (0 players)
    const shouldDelete = (this.players.size <= 1 && this.phase !== GAME_PHASES.WAITING) || this.players.size === 0;

    if (shouldDelete) {
      console.log(`🗑️ Auto-deleting game ${this.roomId} - ${this.players.size === 0 ? 'no players remaining' : `only ${this.players.size} player(s) remaining`}`);
      this.delete();
      return true;
    }

    // Persist state
    this.save();
    return false;
  }

  /**
   * Add a spectator to the room
   */
  addSpectator(spectatorId, spectatorName, socketId) {
    const spectatorData = {
      id: spectatorId,
      name: spectatorName,
      socketId: socketId
    };

    this.spectators.set(spectatorId, spectatorData);
    console.log(`👁️  Spectator ${spectatorName} joined room ${this.roomId}`);
  }

  /**
   * Remove a spectator from the room
   * Spectators can leave at any time without affecting the game
   */
  removeSpectator(spectatorId) {
    const spectator = this.spectators.get(spectatorId);
    if (spectator) {
      console.log(`👁️  Spectator ${spectator.name} left room ${this.roomId}`);
      this.spectators.delete(spectatorId);
    }
  }

  /**
   * Update spectator socket ID (for reconnection)
   */
  updateSpectatorSocket(spectatorId, newSocketId) {
    const spectator = this.spectators.get(spectatorId);
    if (spectator) {
      spectator.socketId = newSocketId;
    }
  }

  /**
   * Get player count
   */
  getPlayerCount() {
    return this.players.size;
  }

  /**
   * Check if room can start game
   */
  canStartGame() {
    return this.players.size >= this.minPlayers &&
           this.players.size <= this.maxPlayers &&
           this.phase === GAME_PHASES.WAITING;
  }

  /**
   * Start a new game
   */
  startGame() {
    if (!this.canStartGame()) {
      throw new Error('Cannot start game');
    }

    // Reset game state
    this.deck.reset();
    this.deck.shuffle();
    this.communityCards = [];
    this.tokenAssignments = {};
    this.bettingRoundHistory = [];
    this.actionLog = [];
    this.playerReadyStatus = {};

    // Deal pocket cards to each player
    this.phase = GAME_PHASES.INITIAL_DEAL;
    for (const [playerId, player] of this.players) {
      player.pocketCards = this.deck.dealMultiple(2);
      this.playerReadyStatus[playerId] = false;
    }

    // Start first betting round
    this.startBettingRound(GAME_PHASES.BETTING_1);

    // Persist state
    this.save();
  }

  /**
   * Restart the game with same players (from any phase)
   * Resets series wins/losses (for single mode or starting a new series)
   */
  restartGame() {
    if (this.players.size < this.minPlayers) {
      throw new Error('Not enough players to restart');
    }

    // Reset game state and series
    this.deck.reset();
    this.deck.shuffle();
    this.communityCards = [];
    this.tokenAssignments = {};
    this.bettingRoundHistory = [];
    this.actionLog = [];
    this.playerReadyStatus = {};
    this.seriesWins = 0;
    this.seriesLosses = 0;
    this.lastGameResult = null;

    // Deal pocket cards to each player
    this.phase = GAME_PHASES.INITIAL_DEAL;
    for (const [playerId, player] of this.players) {
      player.pocketCards = this.deck.dealMultiple(2);
      player.ready = false;
      this.playerReadyStatus[playerId] = false;
    }

    // Start first betting round
    this.startBettingRound(GAME_PHASES.BETTING_1);

    // Persist state
    this.save();
  }

  /**
   * Start the next round in a best-of-5 series
   * Preserves series wins/losses and rotates dealer
   */
  nextRound() {
    if (this.gameMode !== 'best-of-5') {
      throw new Error('Can only advance to next round in best-of-5 mode');
    }
    if (this.players.size < this.minPlayers) {
      throw new Error('Not enough players for next round');
    }
    if (this.seriesWins >= 3 || this.seriesLosses >= 3) {
      throw new Error('Series is already complete');
    }

    // Rotate dealer one position clockwise in best-of-5
    this.dealerIndex = (this.dealerIndex + 1) % this.players.size;

    // Reset round state but keep series state
    this.deck.reset();
    this.deck.shuffle();
    this.communityCards = [];
    this.tokenAssignments = {};
    this.bettingRoundHistory = [];
    this.actionLog = [];
    this.playerReadyStatus = {};
    this.lastGameResult = null;

    // Deal pocket cards to each player
    this.phase = GAME_PHASES.INITIAL_DEAL;
    for (const [playerId, player] of this.players) {
      player.pocketCards = this.deck.dealMultiple(2);
      player.ready = false;
      this.playerReadyStatus[playerId] = false;
    }

    // Start first betting round
    this.startBettingRound(GAME_PHASES.BETTING_1);

    // Persist state
    this.save();
  }

  /**
   * Initialize a betting round
   */
  startBettingRound(phase) {
    this.phase = phase;

    // Reset token pool with tokens 1 through player count
    this.tokenPool = Array.from({ length: this.players.size }, (_, i) => i + 1);
    this.tokenAssignments = {};

    // Reset ready status
    for (const playerId of this.players.keys()) {
      this.playerReadyStatus[playerId] = false;
    }

    // Set first player's turn
    const playerIds = Array.from(this.players.keys());
    this.currentTurn = playerIds[0];
  }

  /**
   * Player claims a token
   * @param {string} playerId - Player making the claim
   * @param {number} tokenNumber - Token to claim (1-6)
   * @returns {Object} Updated token state
   */
  claimToken(playerId, tokenNumber) {
    if (this.currentTurn !== playerId) {
      throw new Error('Not your turn');
    }

    // If player already has a token, return it to pool
    const currentToken = this.tokenAssignments[playerId];
    if (currentToken !== undefined) {
      this.tokenPool.push(currentToken);
    }

    // Check if token is available
    const tokenInPool = this.tokenPool.includes(tokenNumber);
    const tokenOwner = Object.entries(this.tokenAssignments).find(
      ([pid, token]) => token === tokenNumber
    );

    if (!tokenInPool && !tokenOwner) {
      throw new Error('Token not available');
    }

    // Get player names for logging
    const player = this.players.get(playerId);
    const playerName = player ? player.name : 'Unknown';
    let fromPlayerId = null;
    let fromPlayerName = null;

    // Remove token from pool or from other player
    if (tokenInPool) {
      this.tokenPool = this.tokenPool.filter(t => t !== tokenNumber);
    } else {
      const [ownerId] = tokenOwner;
      const ownerPlayer = this.players.get(ownerId);
      fromPlayerId = ownerId;
      fromPlayerName = ownerPlayer ? ownerPlayer.name : 'Unknown';
      delete this.tokenAssignments[ownerId];
    }

    // Assign token to player
    this.tokenAssignments[playerId] = tokenNumber;

    // Log the action
    this.actionLog.push({
      playerId,
      playerName,
      tokenNumber,
      phase: this.phase,
      fromPool: tokenInPool,
      fromPlayerId,
      fromPlayerName,
      timestamp: Date.now()
    });

    // Un-ready all players when a token is claimed
    for (const pid of this.players.keys()) {
      this.playerReadyStatus[pid] = false;
      const player = this.players.get(pid);
      if (player) {
        player.ready = false;
      }
    }

    // Move to next player's turn
    this.advanceTurn();

    // Update last action timestamp
    this.lastAction = Date.now();

    // Persist state
    this.save();

    return {
      tokenAssignments: { ...this.tokenAssignments },
      tokenPool: [...this.tokenPool],
      currentTurn: this.currentTurn
    };
  }

  /**
   * Pass turn (keep current token)
   */
  passTurn(playerId) {
    if (this.currentTurn !== playerId) {
      throw new Error('Not your turn');
    }

    if (this.tokenAssignments[playerId] === undefined) {
      throw new Error('Cannot pass without a token');
    }

    // Just advance to next player without changing tokens
    this.advanceTurn();

    // Update last action timestamp
    this.lastAction = Date.now();

    // Persist state
    this.save();

    return {
      currentTurn: this.currentTurn
    };
  }

  /**
   * Advance to next player's turn
   */
  advanceTurn() {
    const playerIds = Array.from(this.players.keys());
    const currentIndex = playerIds.indexOf(this.currentTurn);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    this.currentTurn = playerIds[nextIndex];
  }

  /**
   * Player toggles their ready status
   */
  setPlayerReady(playerId) {
    if (!this.tokenAssignments[playerId]) {
      throw new Error('Must claim a token before being ready');
    }
    // Toggle ready status
    this.playerReadyStatus[playerId] = !this.playerReadyStatus[playerId];

    // Update last action timestamp
    this.lastAction = Date.now();

    // Persist state
    this.save();
  }

  /**
   * Check if all players are ready to advance
   */
  allPlayersReady() {
    for (const playerId of this.players.keys()) {
      if (!this.playerReadyStatus[playerId]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Advance to next phase
   */
  advancePhase() {
    // Save current betting round results
    this.bettingRoundHistory.push({
      phase: this.phase,
      tokenAssignments: { ...this.tokenAssignments }
    });

    switch (this.phase) {
      case GAME_PHASES.BETTING_1:
        // Deal the flop
        this.phase = GAME_PHASES.FLOP;
        this.communityCards = this.deck.dealMultiple(3);
        this.startBettingRound(GAME_PHASES.BETTING_2);
        break;

      case GAME_PHASES.BETTING_2:
        // Deal the turn
        this.phase = GAME_PHASES.TURN;
        this.communityCards.push(this.deck.deal());
        this.startBettingRound(GAME_PHASES.BETTING_3);
        break;

      case GAME_PHASES.BETTING_3:
        // Deal the river
        this.phase = GAME_PHASES.RIVER;
        this.communityCards.push(this.deck.deal());
        this.startBettingRound(GAME_PHASES.BETTING_4);
        break;

      case GAME_PHASES.BETTING_4:
        // Reveal and evaluate
        this.phase = GAME_PHASES.REVEAL;
        this.save();
        return this.evaluateHands();

      default:
        throw new Error(`Cannot advance from phase: ${this.phase}`);
    }

    // Persist state
    this.save();
    return null;
  }

  /**
   * Evaluate all hands and determine win/loss
   */
  evaluateHands() {
    const playerHands = Array.from(this.players.values()).map(player => ({
      playerId: player.id,
      playerName: player.name,
      pocketCards: player.pocketCards
    }));

    const rankedHands = HandEvaluator.rankHands(playerHands, this.communityCards);
    const validation = HandEvaluator.validateTokenAssignments(rankedHands, this.tokenAssignments);

    // Update series wins/losses if in best-of-5 mode
    if (this.gameMode === 'best-of-5') {
      if (validation.success) {
        this.seriesWins++;
      } else {
        this.seriesLosses++;
      }
    }

    this.phase = GAME_PHASES.COMPLETE;

    // Reset ready status for all players at end of round
    for (const playerId of this.players.keys()) {
      this.playerReadyStatus[playerId] = false;
    }

    // Determine if the series is complete
    const seriesComplete = this.gameMode === 'best-of-5' && (this.seriesWins >= 3 || this.seriesLosses >= 3);

    const result = {
      rankedHands,
      validation,
      success: validation.success,
      gameMode: this.gameMode,
      seriesWins: this.seriesWins,
      seriesLosses: this.seriesLosses,
      seriesComplete
    };

    // Store the result for rejoining players
    this.lastGameResult = result;

    return result;
  }

  /**
   * Check if all players have tokens assigned
   */
  allPlayersHaveTokens() {
    for (const playerId of this.players.keys()) {
      if (this.tokenAssignments[playerId] === undefined) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get public game state (for broadcasting to all players)
   */
  getPublicState() {
    // Determine dealer player ID from dealer index
    const playerIds = Array.from(this.players.keys());
    const dealerId = playerIds.length > 0 ? playerIds[this.dealerIndex % playerIds.length] : null;

    return {
      roomId: this.roomId,
      phase: this.phase,
      playerCount: this.players.size,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        ready: this.playerReadyStatus[p.id],
        atTable: p.atTable
      })),
      spectators: Array.from(this.spectators.values()).map(s => ({
        id: s.id,
        name: s.name
      })),
      communityCards: this.communityCards,
      tokenPool: this.tokenPool,
      tokenAssignments: this.tokenAssignments,
      currentTurn: this.currentTurn,
      bettingRoundHistory: this.bettingRoundHistory,
      actionLog: this.actionLog,
      allPlayersHaveTokens: this.allPlayersHaveTokens(),
      hostId: this.hostId,
      dealerId: dealerId,
      gameMode: this.gameMode,
      seriesWins: this.seriesWins,
      seriesLosses: this.seriesLosses
    };
  }

  /**
   * Get player-specific state (includes their pocket cards)
   */
  getPlayerState(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    return {
      ...this.getPublicState(),
      myPocketCards: player.pocketCards,
      isSpectator: false
    };
  }

  /**
   * Get spectator-specific state (includes ALL pocket cards)
   */
  getSpectatorState(spectatorId) {
    const spectator = this.spectators.get(spectatorId);
    if (!spectator) {
      throw new Error('Spectator not found');
    }

    // Spectators can see all pocket cards
    const allPocketCards = {};
    for (const [playerId, player] of this.players) {
      allPocketCards[playerId] = player.pocketCards;
    }

    return {
      ...this.getPublicState(),
      allPocketCards: allPocketCards,
      isSpectator: true
    };
  }

  /**
   * Get lobby info (for displaying in room list)
   */
  getLobbyInfo() {
    return {
      roomId: this.roomId,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      players: Array.from(this.players.values()).map(p => p.name),
      spectators: Array.from(this.spectators.values()).map(s => s.name),
      isStarted: this.phase !== GAME_PHASES.WAITING,
      isJoinable: this.phase === GAME_PHASES.WAITING && this.players.size < this.maxPlayers,
      gameMode: this.gameMode
    };
  }

  /**
   * Save game state to database
   */
  save() {
    saveGameRoom(this);

    // Also save all players
    for (const [playerId, player] of this.players) {
      savePlayer({
        playerId,
        roomId: this.roomId,
        name: player.name,
        socketId: player.socketId,
        pocketCards: player.pocketCards,
        ready: this.playerReadyStatus[playerId],
        connected: true,
        atTable: player.atTable
      });
    }
  }

  /**
   * Delete game and all players from database
   */
  delete() {
    deletePlayersByRoom(this.roomId);
    deleteGameRoom(this.roomId);
  }

  /**
   * Load a game room from database
   * @param {string} roomId - Room ID to load
   * @returns {GameRoom|null} Loaded game room or null
   */
  static async load(roomId) {
    const { loadGameRoom } = await import('../persistence/gameRepository.js');
    const gameData = loadGameRoom(roomId);

    if (!gameData) {
      return null;
    }

    // Create new GameRoom instance
    const room = new GameRoom(gameData.roomId, {
      maxPlayers: gameData.maxPlayers,
      minPlayers: gameData.minPlayers,
      createdAt: gameData.createdAt
    });

    // Restore game state
    room.phase = gameData.phase;
    room.hostId = gameData.hostId;
    room.communityCards = gameData.communityCards;
    room.tokenPool = gameData.tokenPool;
    room.tokenAssignments = gameData.tokenAssignments;
    room.currentTurn = gameData.currentTurn;
    room.bettingRoundHistory = gameData.bettingRoundHistory;
    room.actionLog = gameData.actionLog || [];
    room.lastAction = gameData.lastAction;

    // Load players
    const players = loadPlayersByRoom(roomId);
    for (const playerData of players) {
      room.players.set(playerData.playerId, {
        id: playerData.playerId,
        name: playerData.name,
        socketId: playerData.socketId,
        pocketCards: playerData.pocketCards,
        ready: playerData.ready,
        atTable: playerData.atTable
      });
      room.playerReadyStatus[playerData.playerId] = playerData.ready;
    }

    // Restore deck state (create new deck - exact state not critical)
    room.deck = new Deck();

    return room;
  }

  /**
   * Reconnect a player (update their socket ID)
   */
  reconnectPlayer(playerId, socketId) {
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    player.socketId = socketId;
    player.atTable = true; // Player is back at table when reconnecting
    updatePlayerSocketId(playerId, socketId);
    updatePlayerAtTable(playerId, true);

    console.log(`✅ Player ${player.name} (${playerId}) reconnected`);
  }

  /**
   * Set whether a player is currently at the table (viewing the game)
   * @param {string} playerId - Player ID
   * @param {boolean} atTable - Whether player is at table
   */
  setPlayerAtTable(playerId, atTable) {
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    player.atTable = atTable;
    updatePlayerAtTable(playerId, atTable);

    console.log(`${atTable ? '✅' : '📴'} Player ${player.name} (${playerId}) ${atTable ? 'at table' : 'left table'}`);
  }
}
