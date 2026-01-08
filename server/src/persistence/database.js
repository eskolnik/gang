import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database file path (stored in server root)
const DB_PATH = path.join(__dirname, '../../game_state.db');

let db = null;

/**
 * Initialize database connection and create tables if they don't exist
 */
export function initDatabase() {
  if (db) {
    return db;
  }

  console.log('📦 Initializing database at:', DB_PATH);

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Create tables
  createTables();

  console.log('✅ Database initialized successfully');

  return db;
}

/**
 * Create database tables
 */
function createTables() {
  // Game rooms table
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_rooms (
      room_id TEXT PRIMARY KEY,
      phase TEXT NOT NULL,
      host_id TEXT NOT NULL,
      max_players INTEGER NOT NULL,
      min_players INTEGER NOT NULL,
      community_cards TEXT,
      token_pool TEXT,
      token_assignments TEXT,
      current_turn TEXT,
      betting_round_history TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_action INTEGER
    )
  `);

  // Check if we need to migrate the players table
  const tableInfo = db.prepare("PRAGMA table_info(players)").all();
  const hasFingerprintColumn = tableInfo.some(col => col.name === 'fingerprint');
  const hasAtTableColumn = tableInfo.some(col => col.name === 'at_table');

  if (hasFingerprintColumn || (tableInfo.length > 0 && !hasAtTableColumn)) {
    console.log('🔄 Migrating players table...');

    // SQLite doesn't support DROP COLUMN or ADD COLUMN with constraints easily
    // So we recreate the table
    db.exec(`
      -- Create new table with correct schema
      CREATE TABLE players_new (
        player_id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        name TEXT NOT NULL,
        socket_id TEXT,
        pocket_cards TEXT,
        ready INTEGER DEFAULT 0,
        connected INTEGER DEFAULT 1,
        at_table INTEGER DEFAULT 1,
        last_seen INTEGER NOT NULL,
        FOREIGN KEY (room_id) REFERENCES game_rooms(room_id) ON DELETE CASCADE
      );

      -- Copy data from old table (handling both old schemas)
      INSERT INTO players_new (player_id, room_id, name, socket_id, pocket_cards, ready, connected, at_table, last_seen)
      SELECT player_id, room_id, name, socket_id, pocket_cards,
             COALESCE(ready, 0),
             COALESCE(connected, 1),
             1,
             last_seen
      FROM players;

      -- Drop old table
      DROP TABLE players;

      -- Rename new table
      ALTER TABLE players_new RENAME TO players;
    `);

    console.log('✅ Players table migrated successfully');
  } else {
    // Create players table with correct schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        player_id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        name TEXT NOT NULL,
        socket_id TEXT,
        pocket_cards TEXT,
        ready INTEGER DEFAULT 0,
        connected INTEGER DEFAULT 1,
        at_table INTEGER DEFAULT 1,
        last_seen INTEGER NOT NULL,
        FOREIGN KEY (room_id) REFERENCES game_rooms(room_id) ON DELETE CASCADE
      )
    `);
  }

  // Create indexes for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
    CREATE INDEX IF NOT EXISTS idx_players_socket_id ON players(socket_id);
  `);

  // Check if we need to add last_action column to game_rooms
  const roomTableInfo = db.prepare("PRAGMA table_info(game_rooms)").all();
  const hasLastActionColumn = roomTableInfo.some(col => col.name === 'last_action');

  if (!hasLastActionColumn && roomTableInfo.length > 0) {
    console.log('🔄 Adding last_action column to game_rooms...');
    db.exec(`ALTER TABLE game_rooms ADD COLUMN last_action INTEGER`);
    // Set existing games' last_action to their updated_at time
    db.exec(`UPDATE game_rooms SET last_action = updated_at WHERE last_action IS NULL`);
    console.log('✅ last_action column added successfully');
  }

  console.log('✅ Database tables created/verified');
}

/**
 * Get database instance
 */
export function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('📦 Database connection closed');
  }
}

/**
 * Clean up expired games (called periodically)
 * Removes games that haven't been updated in 4 hours
 */
export function cleanupExpiredGames() {
  const db = getDatabase();
  const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000);

  const result = db.prepare(`
    DELETE FROM game_rooms WHERE updated_at < ?
  `).run(fourHoursAgo);

  if (result.changes > 0) {
    console.log(`🗑️ Cleaned up ${result.changes} expired game(s)`);
  }

  return result.changes;
}

/**
 * Purge all game data (useful for development/testing)
 * WARNING: This deletes ALL games and players
 */
export function purgeAllGames() {
  const db = getDatabase();

  db.exec(`
    DELETE FROM players;
    DELETE FROM game_rooms;
  `);

  console.log('🗑️ All game data purged');
}

/**
 * Clean up stale unstarted games
 * Deletes games that:
 * - Are in 'waiting' phase
 * - Have 1 or fewer players
 * - Last updated more than 10 minutes ago
 * @returns {Array<string>} Array of deleted room IDs
 */
export function cleanupStaleUnstartedGames() {
  const db = getDatabase();
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);

  // First get room_ids to delete
  const roomsToDelete = db.prepare(`
    SELECT gr.room_id, COUNT(p.player_id) as player_count
    FROM game_rooms gr
    LEFT JOIN players p ON gr.room_id = p.room_id
    WHERE gr.phase = 'waiting'
      AND gr.updated_at < ?
    GROUP BY gr.room_id
    HAVING player_count <= 1
  `).all(tenMinutesAgo);

  if (roomsToDelete.length === 0) {
    return [];
  }

  // Delete the rooms (CASCADE will delete players)
  const placeholders = roomsToDelete.map(() => '?').join(',');
  const roomIds = roomsToDelete.map(r => r.room_id);

  const result = db.prepare(`
    DELETE FROM game_rooms WHERE room_id IN (${placeholders})
  `).run(...roomIds);

  if (result.changes > 0) {
    console.log(`🗑️ Cleaned up ${result.changes} stale unstarted game(s)`);
  }

  return roomIds;
}

/**
 * Clean up empty in-progress games
 * Deletes games that:
 * - Are in any phase except 'waiting'
 * - Have 1 or fewer players
 * @returns {Array<string>} Array of deleted room IDs
 */
export function cleanupEmptyInProgressGames() {
  const db = getDatabase();

  // First get room_ids to delete
  const roomsToDelete = db.prepare(`
    SELECT gr.room_id, COUNT(p.player_id) as player_count
    FROM game_rooms gr
    LEFT JOIN players p ON gr.room_id = p.room_id
    WHERE gr.phase != 'waiting'
    GROUP BY gr.room_id
    HAVING player_count <= 1
  `).all();

  if (roomsToDelete.length === 0) {
    return [];
  }

  // Delete the rooms (CASCADE will delete players)
  const placeholders = roomsToDelete.map(() => '?').join(',');
  const roomIds = roomsToDelete.map(r => r.room_id);

  const result = db.prepare(`
    DELETE FROM game_rooms WHERE room_id IN (${placeholders})
  `).run(...roomIds);

  if (result.changes > 0) {
    console.log(`🗑️ Cleaned up ${result.changes} empty in-progress game(s)`);
  }

  return roomIds;
}

/**
 * Clean up inactive in-progress games
 * Deletes games that:
 * - Are in any phase except 'waiting' or 'complete'
 * - Have had no player action for 20+ minutes
 * @returns {Array<string>} Array of deleted room IDs
 */
export function cleanupInactiveGames() {
  const db = getDatabase();
  const twentyMinutesAgo = Date.now() - (20 * 60 * 1000);

  // First get room_ids to delete
  const roomsToDelete = db.prepare(`
    SELECT room_id
    FROM game_rooms
    WHERE phase NOT IN ('waiting', 'complete')
      AND last_action < ?
  `).all(twentyMinutesAgo);

  if (roomsToDelete.length === 0) {
    return [];
  }

  const roomIds = roomsToDelete.map(r => r.room_id);
  const placeholders = roomIds.map(() => '?').join(',');

  const result = db.prepare(`
    DELETE FROM game_rooms WHERE room_id IN (${placeholders})
  `).run(...roomIds);

  if (result.changes > 0) {
    console.log(`🗑️ Cleaned up ${result.changes} inactive game(s) (no action for 20+ minutes)`);
  }

  return roomIds;
}

/**
 * Run all scheduled cleanup tasks
 * Called by cron job every 5 minutes
 * @returns {Array<string>} Array of all deleted room IDs
 */
export function runScheduledCleanup() {
  console.log('🧹 Running scheduled cleanup...');

  const staleUnstarted = cleanupStaleUnstartedGames();
  const emptyInProgress = cleanupEmptyInProgressGames();
  const inactive = cleanupInactiveGames();
  const expired = cleanupExpiredGames();

  // Combine all deleted room IDs
  const allDeletedRoomIds = [
    ...staleUnstarted,
    ...emptyInProgress,
    ...inactive
    // expired doesn't return room IDs, just count
  ];

  if (allDeletedRoomIds.length > 0 || expired > 0) {
    const total = allDeletedRoomIds.length + expired;
    console.log(`✅ Cleanup complete: ${total} game(s) removed`);
  } else {
    console.log('✅ Cleanup complete: No games to remove');
  }

  return allDeletedRoomIds;
}

// Initialize database on import
initDatabase();

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  cleanupExpiredGames,
  purgeAllGames,
  cleanupStaleUnstartedGames,
  cleanupEmptyInProgressGames,
  cleanupInactiveGames,
  runScheduledCleanup
};
