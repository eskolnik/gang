/**
 * localStorage management for game session persistence
 * Stores and retrieves active game session data
 */

const STORAGE_KEYS = {
  SESSION: 'game_session',
  PLAYER_NAME: 'player_name',
};

// Session expiration time (4 hours in milliseconds)
const SESSION_EXPIRATION_MS = 4 * 60 * 60 * 1000;

/**
 * Save the current game session to localStorage
 * @param {Object} session - Session data
 * @param {string} session.roomId - Current room ID
 * @param {string} session.playerId - Player ID
 * @param {string} session.playerName - Player name
 */
export function saveSession(session) {
  const sessionData = {
    ...session,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Failed to save session to localStorage:', error);
  }
}

/**
 * Get the current game session from localStorage
 * Returns null if no session exists or if session is expired
 * @returns {Object|null} Session data or null
 */
export function getSession() {
  try {
    const sessionJson = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!sessionJson) {
      return null;
    }

    const session = JSON.parse(sessionJson);

    // Check if session has expired
    const age = Date.now() - session.timestamp;
    if (age > SESSION_EXPIRATION_MS) {
      console.log('Session expired, clearing...');
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to read session from localStorage:', error);
    return null;
  }
}

/**
 * Clear the current game session from localStorage
 * Called when player explicitly leaves game or session expires
 */
export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch (error) {
    console.error('Failed to clear session from localStorage:', error);
  }
}

/**
 * Update specific session fields without replacing entire session
 * @param {Object} updates - Partial session data to update
 */
export function updateSession(updates) {
  const session = getSession();
  if (session) {
    saveSession({ ...session, ...updates });
  }
}

/**
 * Check if there's an active session
 * @returns {boolean} True if active session exists
 */
export function hasActiveSession() {
  return getSession() !== null;
}

/**
 * Clear all game-related data from localStorage
 * Useful for complete reset or testing
 */
export function clearAllData() {
  clearSession();
  clearPlayerName();
}

/**
 * Save player name to localStorage for persistence across sessions
 * @param {string} name - Player name to save
 */
export function savePlayerName(name) {
  try {
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
  } catch (error) {
    console.error('Failed to save player name to localStorage:', error);
  }
}

/**
 * Get saved player name from localStorage
 * @returns {string|null} Saved player name or null
 */
export function getPlayerName() {
  try {
    return localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
  } catch (error) {
    console.error('Failed to read player name from localStorage:', error);
    return null;
  }
}

/**
 * Clear saved player name from localStorage
 */
export function clearPlayerName() {
  try {
    localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
  } catch (error) {
    console.error('Failed to clear player name from localStorage:', error);
  }
}
