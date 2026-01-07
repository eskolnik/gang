/**
 * Game constants shared across the client
 */

// Server configuration
export const SERVER_URL = 'http://localhost:3000';

// Game phases (must match server)
export const GAME_PHASES = {
  WAITING: 'waiting',
  INITIAL_DEAL: 'initial_deal',
  BETTING_1: 'betting_1',
  FLOP: 'flop',
  BETTING_2: 'betting_2',
  TURN: 'turn',
  BETTING_3: 'betting_3',
  RIVER: 'river',
  BETTING_4: 'betting_4',
  REVEAL: 'reveal',
  COMPLETE: 'complete'
};

// Card suits and ranks
export const SUITS = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠'
};

export const SUIT_COLORS = {
  h: 0xff0000, // red
  d: 0xff0000, // red
  c: 0x000000, // black
  s: 0x000000  // black
};

// UI Colors
export const COLORS = {
  BACKGROUND: 0x1a472a,      // Dark green (poker table)
  CARD_BACK: 0x2a5a3a,       // Medium green
  CARD_FRONT: 0xffffff,      // White
  TOKEN: 0xffd700,           // Gold
  TOKEN_SELECTED: 0xff6b35,  // Orange
  TOKEN_ROUND_1: 0xffffff,   // White (pre-flop)
  TOKEN_ROUND_2: 0xffff00,   // Yellow (flop)
  TOKEN_ROUND_3: 0xff9900,   // Orange (turn)
  TOKEN_ROUND_4: 0xff0000,   // Red (river)
  TEXT: 0xffffff,            // White
  TEXT_DARK: 0x000000,       // Black
  BUTTON: 0x4a90e2,          // Blue
  BUTTON_HOVER: 0x6ba3e8,    // Light blue
  DISABLED: 0x888888         // Gray
};

// Round colors for tokens
export const ROUND_COLORS = {
  [GAME_PHASES.BETTING_1]: 0xffffff,  // White
  [GAME_PHASES.BETTING_2]: 0xffff00,  // Yellow
  [GAME_PHASES.BETTING_3]: 0xff9900,  // Orange
  [GAME_PHASES.BETTING_4]: 0xff0000   // Red
};

// UI Layout
export const LAYOUT = {
  CARD_WIDTH: 80,
  CARD_HEIGHT: 112,
  CARD_SPACING: 10,
  TOKEN_SIZE: 60,
  TOKEN_SPACING: 15
};

// Scene keys
export const SCENES = {
  BOOT: 'Boot',
  PRELOADER: 'Preloader',
  MAIN_MENU: 'MainMenu',
  LOBBY: 'Lobby',
  GAME: 'TheGangGame',
  RESULTS: 'Results'
};
