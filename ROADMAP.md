# The Gang - Implementation Roadmap

## Game Overview
A cooperative card game where players attempt to order their poker hands from weakest to strongest using only numbered tokens (1-6) for communication.

## Architecture Questions & Decisions

### 1. Player Count & Multiplayer Architecture
**Question:** How many players and what multiplayer approach?
**Answer:** Online multiplayer using WebSocket (Socket.io)
**Rationale:** Turn-based nature fits WebSocket well. Server-authoritative state prevents cheating, validates moves, manages hidden cards. Simpler to implement and debug than WebRTC for this use case.

### 2. Card Assets & Visual Style
**Question:** What approach for card visuals?
**Answer:** Text-based cards initially (e.g., "7♠", "K♥"), with plan to upgrade to card graphics later
**Rationale:** Quick to implement for MVP. Can focus on game logic first, add polished graphics in future iteration.

### 3. Token Interaction Mechanism
**Question:** How should players interact with tokens?
**Answer:** Click to select/claim tokens
**Rationale:** Simple, intuitive interaction. Players click a token (from center or another player) to claim it.

### 4. Poker Hand Evaluation Library
**Question:** Library vs custom implementation?
**Answer:** Use existing poker hand evaluation library (e.g., pokersolver)
**Rationale:** Battle-tested, handles edge cases, faster development. No need to reinvent the wheel.

### 5. Game Visibility & Turn System
**Question:** Card visibility and turn handling?
**Answer:**
- Pocket cards hidden from other players (like real poker)
- Turn-based token selection (one player at a time)
**Rationale:** True to poker rules. Turn-based is simpler to implement and works well with WebSocket architecture.

---

## Phase 1: Core Game Implementation (Single Round)

### 1.0 Server Setup
- [ ] Create Node.js server project
- [ ] Set up Express + Socket.io
- [ ] Configure CORS for local development
- [ ] Implement room creation/joining logic
- [ ] Player connection/disconnection handling
- [ ] Broadcast system for game events

### 1.1 Game Data Layer
- [ ] Card representation (suits, ranks)
- [ ] Deck management (shuffle, deal)
- [ ] Hand evaluation logic (poker hand ranking)
- [ ] Game state management (current phase, community cards, player hands)
- [ ] Token state tracking

### 1.2 Core Game Logic
- [ ] Deal initial pocket cards (2 per player)
- [ ] Token selection phase implementation
  - [ ] Token claiming/swapping logic
  - [ ] Player satisfaction tracking
  - [ ] Phase completion detection
- [ ] Community card reveal sequence
  - [ ] Flop (3 cards)
  - [ ] Turn (1 card)
  - [ ] River (1 card)
- [ ] Final hand evaluation and win/loss determination

### 1.3 UI Components
- [ ] Card display components
  - [ ] Pocket cards (player's own hand)
  - [ ] Community cards area
  - [ ] Card back graphics (for face-down cards)
- [ ] Token display and interaction
  - [ ] Token pool (center area)
  - [ ] Player-held tokens
  - [ ] Previous round token displays
- [ ] Player areas
  - [ ] Hand display zones
  - [ ] Token selection zones
- [ ] Game controls
  - [ ] "I'm satisfied" / "Ready" button
  - [ ] Phase indicators
  - [ ] Round counter

### 1.4 Game Flow Scene
- [ ] Initial deal animation
- [ ] Betting round sequence (x4)
  - [ ] Token selection phase
  - [ ] Wait for all players ready
  - [ ] Advance to next phase
- [ ] Community card reveals with animation
- [ ] Final reveal and outcome display
  - [ ] Show all hands
  - [ ] Highlight correct/incorrect ordering
  - [ ] Win/loss message

### 1.5 Visual Polish
- [ ] Card animations (deal, flip, etc.)
- [ ] Token animations (selection, movement)
- [ ] Transition effects between phases
- [ ] Victory/defeat screens

---

## Phase 2: Future Enhancements (Not in Scope Yet)
- Multiple rounds/sessions
- Scoring system
- Difficulty variations
- Sound effects and music
- Settings/options menu
- Tutorial/help system
- Save/load game state

---

## Technical Architecture

### Project Structure
```
client/                      # Phaser game (current src/)
  src/
    game/
      main.js              # Phaser config
      scenes/
        Boot.js            # Initial setup
        Preloader.js       # Asset loading
        Lobby.js           # Room join/create (NEW)
        TheGangGame.js     # Main game scene (NEW)
        ResultsScene.js    # Win/loss display (NEW)
      core/
        NetworkManager.js  # Socket.io client wrapper (NEW)
        GameState.js       # Client-side state (NEW)
      components/
        Card.js            # Card display component (NEW)
        Token.js           # Token component (NEW)
        PlayerArea.js      # Player UI area (NEW)
      utils/
        constants.js       # Game constants (NEW)

server/                      # Node.js server (NEW)
  src/
    index.js               # Server entry point
    gameLogic/
      Deck.js              # Card/deck logic
      HandEvaluator.js     # Poker hand ranking (uses library)
      GameRoom.js          # Room state management
    events/
      socketHandlers.js    # Socket.io event handlers
  package.json             # Server dependencies
```

### Key Technologies
- **Client:**
  - Phaser 3.90.0: Game framework
  - Socket.io-client: WebSocket client
  - Vite 6.3.1: Build tool
  - JavaScript ES6+

- **Server:**
  - Node.js + Express: Web server
  - Socket.io: WebSocket server
  - pokersolver (or similar): Poker hand evaluation library

---

## Development Approach
1. Set up server infrastructure (Node.js + Socket.io)
2. Build server-side game logic (deck, hand evaluation, room management)
3. Create client network layer (Socket.io client wrapper)
4. Implement lobby/room joining UI
5. Build main game scene with UI components
6. Wire up client-server communication
7. Implement game flow and state synchronization
8. Add polish and animations

---

## Implementation Order (Recommended)

### Sprint 1: Server Foundation
1. Server setup with Express + Socket.io
2. Room creation/joining system
3. Server-side deck and hand evaluation
4. Basic event broadcasting

### Sprint 2: Client Foundation
1. Network manager (Socket.io client)
2. Lobby scene (join/create rooms)
3. Basic game scene structure
4. Card and token components

### Sprint 3: Core Gameplay
1. Initial deal and display
2. Token selection mechanism
3. Turn management
4. Community card reveals

### Sprint 4: Polish & Testing
1. Results screen
2. Error handling & reconnection
3. Visual polish
4. Multi-device testing
