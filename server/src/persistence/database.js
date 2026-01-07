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
      updated_at INTEGER NOT NULL
    )
  `);

  // Players table
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      player_id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      name TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      socket_id TEXT,
      pocket_cards TEXT,
      ready INTEGER DEFAULT 0,
      connected INTEGER DEFAULT 1,
      last_seen INTEGER NOT NULL,
      FOREIGN KEY (room_id) REFERENCES game_rooms(room_id) ON DELETE CASCADE
    )
  `);

  // Create indexes for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
    CREATE INDEX IF NOT EXISTS idx_players_fingerprint ON players(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_players_socket_id ON players(socket_id);
  `);

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

// Initialize database on import
initDatabase();

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  cleanupExpiredGames
};
