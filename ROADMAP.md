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
client/                      # React game client
  src/
    components/
      Lobby.jsx            # Room join/create
      Game.jsx             # Main game component
      Table.jsx            # Table and player areas
      Card.jsx             # Card display component
    context/
      NetworkContext.jsx   # Socket.io context provider
    game/
      core/
        NetworkManager.js  # Socket.io client wrapper
      utils/
        handEvaluator.js   # Client-side hand evaluation
        constants.js       # Game constants
        fingerprint.js     # Browser fingerprinting (Sprint 4)
        storage.js         # localStorage management (Sprint 4)
    App.jsx                # Root component
    main.jsx               # Entry point

server/                      # Node.js server (NEW)
  src/
    index.js               # Server entry point
    gameLogic/
      Deck.js              # Card/deck logic
      HandEvaluator.js     # Poker hand ranking (uses library)
      GameRoom.js          # Room state management
    events/
      socketHandlers.js    # Socket.io event handlers
    persistence/           # Database layer (Sprint 4)
      database.js          # DB connection & setup
      gameRepository.js    # Game state CRUD operations
      playerRepository.js  # Player session management
      migrations/          # Database schema migrations
    utils/
      cleanup.js           # Background cleanup jobs (Sprint 4)
  package.json             # Server dependencies
```

### Key Technologies
- **Client:**
  - React 19.2.3: UI framework
  - Socket.io-client: WebSocket client
  - Vite 6.3.1: Build tool
  - @fingerprintjs/fingerprintjs: Browser fingerprinting (Sprint 4)
  - JavaScript ES6+

- **Server:**
  - Node.js + Express: Web server
  - Socket.io: WebSocket server
  - pokersolver: Poker hand evaluation library
  - **Persistence (Sprint 4):**
    - PostgreSQL or SQLite: Primary database
    - node-postgres (pg) or better-sqlite3: Database driver
    - (Optional) Redis: Session caching for performance

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

### Sprint 4: Production Readiness - Persistence & Reconnection

#### 4.1 Database & Persistence Layer
1. **Database Setup**
   - [ ] Choose persistence solution (SQLite/PostgreSQL for production, or in-memory Redis)
   - [ ] Set up database connection and schema
   - [ ] Create migrations for game state tables
   - [ ] Add database client library to server dependencies

2. **Game State Persistence**
   - [ ] Design database schema for game rooms
     - [ ] Room metadata (roomId, phase, hostId, created/updated timestamps)
     - [ ] Player data (playerId, name, socketId, pocketCards, ready status)
     - [ ] Game state (communityCards, tokenAssignments, tokenPool, currentTurn)
     - [ ] History data (bettingRoundHistory)
   - [ ] Implement GameRoom.save() method to persist state to DB
   - [ ] Implement GameRoom.load() static method to restore from DB
   - [ ] Add auto-save hooks on state changes (after each game action)
   - [ ] Add periodic state sync (every N seconds as backup)

3. **Player Session Persistence**
   - [ ] Create player sessions table (sessionId, playerId, fingerprint, lastSeen)
   - [ ] Track active player sessions in database
   - [ ] Implement session cleanup for stale/expired sessions
   - [ ] Add session validation on reconnection

#### 4.2 Browser Fingerprinting & Client Storage
1. **Fingerprint Generation**
   - [ ] Install and configure fingerprinting library (e.g., FingerprintJS)
   - [ ] Generate stable browser fingerprint on client load
   - [ ] Store fingerprint in localStorage
   - [ ] Send fingerprint to server on connection

2. **Local Storage Management**
   - [ ] Store active game session data in localStorage
     - [ ] Current roomId
     - [ ] PlayerId
     - [ ] Fingerprint
     - [ ] Last connection timestamp
   - [ ] Clear localStorage on explicit "Leave Game" action
   - [ ] Implement localStorage cleanup for expired sessions

#### 4.3 Socket Reconnection Handling
1. **Server-Side Reconnection**
   - [ ] Modify addPlayer to handle reconnection vs new player
   - [ ] Implement reconnectPlayer(fingerprint, roomId) method
   - [ ] Update socketId for reconnecting player without changing playerId
   - [ ] Prevent duplicate players in same room
   - [ ] Send full game state to reconnecting player

2. **Socket Disconnection Handling**
   - [ ] Don't immediately remove player on disconnect
   - [ ] Mark player as "disconnected" with grace period (e.g., 60 seconds)
   - [ ] Keep game state frozen if player disconnects mid-turn
   - [ ] Only remove player after grace period expires
   - [ ] Transfer host if host disconnects beyond grace period

3. **Client-Side Reconnection**
   - [ ] Implement automatic reconnection on socket disconnect
   - [ ] Add reconnection UI state (show "Reconnecting..." message)
   - [ ] Retry logic with exponential backoff
   - [ ] Max retry attempts before giving up
   - [ ] Handle reconnection success/failure

#### 4.4 Auto-Rejoin on Page Refresh
1. **Client-Side Auto-Rejoin**
   - [ ] Check localStorage for active session on app load
   - [ ] Validate session hasn't expired (timestamp check)
   - [ ] Automatically attempt to rejoin game if active session found
   - [ ] Skip lobby if successfully rejoined
   - [ ] Fall back to lobby if rejoin fails

2. **Server-Side Rejoin Validation**
   - [ ] Create rejoinGame socket event handler
   - [ ] Validate fingerprint matches stored player
   - [ ] Validate game is still active (not completed/expired)
   - [ ] Validate player is still in the game
   - [ ] Return error codes for different failure scenarios

3. **State Synchronization After Rejoin**
   - [ ] Send complete game state to rejoining player
   - [ ] Update UI to match current game phase
   - [ ] Resume gameplay if it's player's turn
   - [ ] Show "Welcome back!" or "Reconnected" message

#### 4.5 Edge Cases & Error Handling
1. **Multiple Connection Handling**
   - [ ] Detect if player opens game in multiple tabs/windows
   - [ ] Handle same fingerprint connecting twice simultaneously
   - [ ] Close old socket connection when new one connects
   - [ ] Show warning about multiple connections

2. **Game Cleanup & Expiration**
   - [ ] Implement game expiration (remove games after N hours of inactivity)
   - [ ] Background job to clean up expired games from database
   - [ ] Handle edge case: player tries to rejoin expired game
   - [ ] Graceful error messages for cleanup scenarios

3. **Network Error Handling**
   - [ ] Handle database connection failures gracefully
   - [ ] Implement fallback to in-memory state if DB unavailable
   - [ ] Log errors for debugging without crashing server
   - [ ] Client-side error UI for connection issues

#### 4.6 Testing & Validation
1. **Reconnection Testing**
   - [ ] Test disconnect/reconnect during each game phase
   - [ ] Test page refresh during gameplay
   - [ ] Test multiple players disconnecting simultaneously
   - [ ] Test reconnection after grace period expiration
   - [ ] Test host transfer on disconnect

2. **Persistence Testing**
   - [ ] Verify game state survives server restart
   - [ ] Test game resume after DB restore
   - [ ] Validate data integrity across save/load cycles
   - [ ] Test concurrent game state updates

3. **Multi-Device Testing**
   - [ ] Test on different browsers (Chrome, Firefox, Safari)
   - [ ] Test on mobile devices (iOS, Android)
   - [ ] Verify fingerprint stability across browser sessions
   - [ ] Test network conditions (slow, intermittent)

---

### Sprint 5: Polish & Production Deployment (Future)
1. Visual polish and animations
2. Sound effects and music
3. Production deployment configuration
4. Performance optimization
5. Security hardening
