import { Deck } from './Deck.js';
import { HandEvaluator } from './HandEvaluator.js';
import { saveGameRoom, deleteGameRoom } from '../persistence/gameRepository.js';
import { savePlayer, loadPlayersByRoom, updatePlayerSocketId, deletePlayersByRoom } from '../persistence/playerRepository.js';

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
    this.players = new Map(); // playerId -> {id, name, socketId, pocketCards, ready}
    this.phase = GAME_PHASES.WAITING;
    this.deck = new Deck();
    this.communityCards = [];
    this.currentTurn = null; // Player ID whose turn it is for token selection
    this.tokenAssignments = {}; // playerId -> token number
    this.tokenPool = []; // Available tokens in the center
    this.bettingRoundHistory = []; // History of token assignments per round
    this.maxPlayers = options.maxPlayers || 6;
    this.minPlayers = options.minPlayers || 2;
    this.playerReadyStatus = {}; // playerId -> boolean
    this.hostId = null; // Player ID of the room host
    this.createdAt = options.createdAt || Date.now();
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
      ready: false
    };

    this.players.set(playerId, playerData);
    this.playerReadyStatus[playerId] = false;

    // Set first player as host
    if (this.hostId === null) {
      this.hostId = playerId;
    }

    // Persist player to database
    savePlayer({
      playerId,
      roomId: this.roomId,
      name: playerName,
      socketId,
      pocketCards: [],
      ready: false,
      connected: true
    });

    // Persist game state
    this.save();
  }

  /**
   * Remove a player from the room
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

    // Persist state
    this.save();
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
   */
  restartGame() {
    if (this.players.size < this.minPlayers) {
      throw new Error('Not enough players to restart');
    }

    // Reset game state
    this.deck.reset();
    this.deck.shuffle();
    this.communityCards = [];
    this.tokenAssignments = {};
    this.bettingRoundHistory = [];
    this.playerReadyStatus = {};

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

    // Remove token from pool or from other player
    if (tokenInPool) {
      this.tokenPool = this.tokenPool.filter(t => t !== tokenNumber);
    } else {
      const [ownerId] = tokenOwner;
      delete this.tokenAssignments[ownerId];
    }

    // Assign token to player
    this.tokenAssignments[playerId] = tokenNumber;

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

    this.phase = GAME_PHASES.COMPLETE;

    return {
      rankedHands,
      validation,
      success: validation.success
    };
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
    return {
      roomId: this.roomId,
      phase: this.phase,
      playerCount: this.players.size,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        ready: this.playerReadyStatus[p.id]
      })),
      communityCards: this.communityCards,
      tokenPool: this.tokenPool,
      tokenAssignments: this.tokenAssignments,
      currentTurn: this.currentTurn,
      bettingRoundHistory: this.bettingRoundHistory,
      allPlayersHaveTokens: this.allPlayersHaveTokens(),
      hostId: this.hostId
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
      myPocketCards: player.pocketCards
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
      isStarted: this.phase !== GAME_PHASES.WAITING,
      isJoinable: this.phase === GAME_PHASES.WAITING && this.players.size < this.maxPlayers
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
        connected: true
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

    // Load players
    const players = loadPlayersByRoom(roomId);
    for (const playerData of players) {
      room.players.set(playerData.playerId, {
        id: playerData.playerId,
        name: playerData.name,
        socketId: playerData.socketId,
        pocketCards: playerData.pocketCards,
        ready: playerData.ready
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
    updatePlayerSocketId(playerId, socketId);

    console.log(`✅ Player ${player.name} (${playerId}) reconnected`);
  }
}
