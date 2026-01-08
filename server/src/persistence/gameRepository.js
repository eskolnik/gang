import { getDatabase } from './database.js';

/**
 * Save a game room to the database
 * @param {Object} gameRoom - GameRoom instance
 */
export function saveGameRoom(gameRoom) {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO game_rooms (
      room_id, phase, host_id, max_players, min_players,
      community_cards, token_pool, token_assignments,
      current_turn, betting_round_history,
      created_at, updated_at, last_action
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    gameRoom.roomId,
    gameRoom.phase,
    gameRoom.hostId,
    gameRoom.maxPlayers,
    gameRoom.minPlayers,
    JSON.stringify(gameRoom.communityCards),
    JSON.stringify(gameRoom.tokenPool),
    JSON.stringify(gameRoom.tokenAssignments),
    gameRoom.currentTurn,
    JSON.stringify(gameRoom.bettingRoundHistory),
    gameRoom.createdAt || now,
    now,
    gameRoom.lastAction || now
  );
}

/**
 * Load a game room from the database
 * @param {string} roomId - Room ID to load
 * @returns {Object|null} Game room data or null if not found
 */
export function loadGameRoom(roomId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM game_rooms WHERE room_id = ?
  `);

  const row = stmt.get(roomId);

  if (!row) {
    return null;
  }

  // Parse JSON fields
  return {
    roomId: row.room_id,
    phase: row.phase,
    hostId: row.host_id,
    maxPlayers: row.max_players,
    minPlayers: row.min_players,
    communityCards: JSON.parse(row.community_cards),
    tokenPool: JSON.parse(row.token_pool),
    tokenAssignments: JSON.parse(row.token_assignments),
    currentTurn: row.current_turn,
    bettingRoundHistory: JSON.parse(row.betting_round_history),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAction: row.last_action
  };
}

/**
 * Delete a game room from the database
 * @param {string} roomId - Room ID to delete
 */
export function deleteGameRoom(roomId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    DELETE FROM game_rooms WHERE room_id = ?
  `);

  stmt.run(roomId);
}

/**
 * Check if a game room exists
 * @param {string} roomId - Room ID to check
 * @returns {boolean} True if room exists
 */
export function gameRoomExists(roomId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT 1 FROM game_rooms WHERE room_id = ? LIMIT 1
  `);

  return stmt.get(roomId) !== undefined;
}

/**
 * Get all active game rooms
 * @returns {Array} Array of room data
 */
export function getAllGameRooms() {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT room_id, phase, max_players, min_players, updated_at
    FROM game_rooms
    ORDER BY created_at DESC
  `);

  return stmt.all();
}
