import { getDatabase } from './database.js';

/**
 * Save a player to the database
 * @param {Object} player - Player data
 * @param {string} player.playerId - Player ID
 * @param {string} player.roomId - Room ID
 * @param {string} player.name - Player name
 * @param {string} player.fingerprint - Browser fingerprint
 * @param {string} player.socketId - Socket ID
 * @param {Array} player.pocketCards - Pocket cards
 * @param {boolean} player.ready - Ready status
 * @param {boolean} player.connected - Connection status
 */
export function savePlayer(player) {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO players (
      player_id, room_id, name, fingerprint, socket_id,
      pocket_cards, ready, connected, last_seen
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    player.playerId,
    player.roomId,
    player.name,
    player.fingerprint,
    player.socketId,
    JSON.stringify(player.pocketCards || []),
    player.ready ? 1 : 0,
    player.connected !== false ? 1 : 0,
    now
  );
}

/**
 * Load a player by ID
 * @param {string} playerId - Player ID
 * @returns {Object|null} Player data or null
 */
export function loadPlayer(playerId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM players WHERE player_id = ?
  `);

  const row = stmt.get(playerId);

  if (!row) {
    return null;
  }

  return {
    playerId: row.player_id,
    roomId: row.room_id,
    name: row.name,
    fingerprint: row.fingerprint,
    socketId: row.socket_id,
    pocketCards: JSON.parse(row.pocket_cards),
    ready: row.ready === 1,
    connected: row.connected === 1,
    lastSeen: row.last_seen
  };
}

/**
 * Load all players in a room
 * @param {string} roomId - Room ID
 * @returns {Array} Array of player data
 */
export function loadPlayersByRoom(roomId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM players WHERE room_id = ? ORDER BY last_seen ASC
  `);

  const rows = stmt.all(roomId);

  return rows.map(row => ({
    playerId: row.player_id,
    roomId: row.room_id,
    name: row.name,
    fingerprint: row.fingerprint,
    socketId: row.socket_id,
    pocketCards: JSON.parse(row.pocket_cards),
    ready: row.ready === 1,
    connected: row.connected === 1,
    lastSeen: row.last_seen
  }));
}

/**
 * Find a player by fingerprint in a specific room
 * @param {string} fingerprint - Browser fingerprint
 * @param {string} roomId - Room ID
 * @returns {Object|null} Player data or null
 */
export function findPlayerByFingerprint(fingerprint, roomId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM players WHERE fingerprint = ? AND room_id = ?
  `);

  const row = stmt.get(fingerprint, roomId);

  if (!row) {
    return null;
  }

  return {
    playerId: row.player_id,
    roomId: row.room_id,
    name: row.name,
    fingerprint: row.fingerprint,
    socketId: row.socket_id,
    pocketCards: JSON.parse(row.pocket_cards),
    ready: row.ready === 1,
    connected: row.connected === 1,
    lastSeen: row.last_seen
  };
}

/**
 * Update player's socket ID (for reconnection)
 * @param {string} playerId - Player ID
 * @param {string} socketId - New socket ID
 */
export function updatePlayerSocketId(playerId, socketId) {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    UPDATE players
    SET socket_id = ?, connected = 1, last_seen = ?
    WHERE player_id = ?
  `);

  stmt.run(socketId, now, playerId);
}

/**
 * Mark player as disconnected
 * @param {string} playerId - Player ID
 */
export function markPlayerDisconnected(playerId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE players SET connected = 0 WHERE player_id = ?
  `);

  stmt.run(playerId);
}

/**
 * Delete a player
 * @param {string} playerId - Player ID
 */
export function deletePlayer(playerId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    DELETE FROM players WHERE player_id = ?
  `);

  stmt.run(playerId);
}

/**
 * Delete all players in a room
 * @param {string} roomId - Room ID
 */
export function deletePlayersByRoom(roomId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    DELETE FROM players WHERE room_id = ?
  `);

  stmt.run(roomId);
}

/**
 * Update player's ready status
 * @param {string} playerId - Player ID
 * @param {boolean} ready - Ready status
 */
export function updatePlayerReady(playerId, ready) {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE players SET ready = ? WHERE player_id = ?
  `);

  stmt.run(ready ? 1 : 0, playerId);
}

/**
 * Update player's pocket cards
 * @param {string} playerId - Player ID
 * @param {Array} pocketCards - Pocket cards
 */
export function updatePlayerCards(playerId, pocketCards) {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE players SET pocket_cards = ? WHERE player_id = ?
  `);

  stmt.run(JSON.stringify(pocketCards), playerId);
}
