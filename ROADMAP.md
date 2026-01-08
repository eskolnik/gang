# The Gang - Implementation Roadmap

## Game Overview
A cooperative card game where players attempt to order their poker hands from weakest to strongest using only numbered tokens (1-6) for communication.

## Current Status

**🎮 PLAYABLE - Core game fully functional!**

**Completed Features:**
- ✅ Full multiplayer gameplay with WebSocket (Socket.io)
- ✅ Complete poker hand mechanics with 4 betting rounds
- ✅ Token claiming and swapping system
- ✅ SQLite persistence with auto-save
- ✅ Auto-rejoin on page refresh
- ✅ Lobby navigation (Return to Lobby / Leave Game)
- ✅ Lobby browser showing all active games
- ✅ Player name persistence
- ✅ Scheduled cleanup jobs (cron)
- ✅ Auto-delete for abandoned games
- ✅ Visual indicators for absent players

**Ready for:**
- User testing and feedback
- Multiplayer sessions with 2-6 players
- Extended play sessions with persistence

---

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

## Phase 1: Core Game Implementation ✅ COMPLETE

### 1.0 Server Setup ✅
- [x] Create Node.js server project
- [x] Set up Express + Socket.io
- [x] Configure CORS for local development
- [x] Implement room creation/joining logic
- [x] Player connection/disconnection handling
- [x] Broadcast system for game events

### 1.1 Game Data Layer ✅
- [x] Card representation (suits, ranks)
- [x] Deck management (shuffle, deal)
- [x] Hand evaluation logic (poker hand ranking)
- [x] Game state management (current phase, community cards, player hands)
- [x] Token state tracking

### 1.2 Core Game Logic ✅
- [x] Deal initial pocket cards (2 per player)
- [x] Token selection phase implementation
  - [x] Token claiming/swapping logic
  - [x] Player satisfaction tracking
  - [x] Phase completion detection
- [x] Community card reveal sequence
  - [x] Flop (3 cards)
  - [x] Turn (1 card)
  - [x] River (1 card)
- [x] Final hand evaluation and win/loss determination

### 1.3 UI Components ✅
- [x] Card display components
  - [x] Pocket cards (player's own hand)
  - [x] Community cards area
  - [x] Card back graphics (for face-down cards)
- [x] Token display and interaction
  - [x] Token pool (center area)
  - [x] Player-held tokens
  - [x] Previous round token displays
- [x] Player areas
  - [x] Hand display zones
  - [x] Token selection zones
- [x] Game controls
  - [x] "Ready" button
  - [x] Phase indicators
  - [x] Round counter

### 1.4 Game Flow ✅
- [x] Initial deal
- [x] Betting round sequence (x4)
  - [x] Token selection phase
  - [x] Wait for all players ready
  - [x] Advance to next phase
- [x] Community card reveals
- [x] Final reveal and outcome display
  - [x] Show all hands
  - [x] Highlight correct/incorrect ordering
  - [x] Win/loss message

### 1.5 Visual Polish ✅
- [x] Card highlighting for best hand
- [x] Token color coding by round
- [x] Round tracker with phase names
- [x] Victory/defeat screens
- [x] Game outcome display with rankings

---

## Technical Architecture

### Project Structure
```
client/                      # React game client
  src/
    components/
      Lobby.jsx            # Room join/create with lobby browser
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
        storage.js         # localStorage management (session + player name)
    App.jsx                # Root component
    main.jsx               # Entry point

server/                      # Node.js server
  src/
    index.js               # Server entry point with cron scheduler
    gameLogic/
      Deck.js              # Card/deck logic
      HandEvaluator.js     # Poker hand ranking (uses pokersolver)
      GameRoom.js          # Room state management
    events/
      socketHandlers.js    # Socket.io event handlers
    persistence/           # Database layer (SQLite)
      database.js          # DB connection, migrations, cleanup functions
      gameRepository.js    # Game state CRUD operations
      playerRepository.js  # Player session management
  package.json             # Server dependencies
  game_state.db            # SQLite database file
```

### Key Technologies
- **Client:**
  - React 19.2.3: UI framework
  - Socket.io-client 4.8.3: WebSocket client
  - Vite 6.3.1: Build tool
  - @fortawesome/fontawesome-free 7.1.0: Icon library
  - pokersolver: Client-side hand evaluation
  - JavaScript ES6+

- **Server:**
  - Node.js + Express: Web server
  - Socket.io 4.8.3: WebSocket server
  - pokersolver 2.1.4: Poker hand evaluation library
  - better-sqlite3: SQLite database driver
  - node-cron: Scheduled cleanup jobs

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

## Implementation Order

### Sprint 1: Server Foundation ✅ COMPLETE
1. Server setup with Express + Socket.io
2. Room creation/joining system
3. Server-side deck and hand evaluation
4. Basic event broadcasting

### Sprint 2: Client Foundation ✅ COMPLETE
1. Network manager (Socket.io client)
2. Lobby scene (join/create rooms)
3. Basic game scene structure
4. Card and token components

### Sprint 3: Core Gameplay ✅ COMPLETE
1. Initial deal and display
2. Token selection mechanism
3. Turn management
4. Community card reveals
5. Win/loss determination
6. Hand ranking display

### Sprint 4: Persistence & Reconnection ✅ COMPLETE

#### 4.1 Database & Persistence Layer ✅
- [x] Choose SQLite as persistence solution
- [x] Set up database connection with better-sqlite3
- [x] Create database schema with migrations
  - [x] game_rooms table (roomId, phase, hostId, communityCards, tokenPool, tokenAssignments, currentTurn, bettingRoundHistory, timestamps, last_action)
  - [x] players table (playerId, roomId, name, socketId, pocketCards, ready, connected, at_table, last_seen)
- [x] Implement GameRoom.save() to persist state
- [x] Implement GameRoom.load() to restore from DB
- [x] Auto-save on all state changes

#### 4.2 Player Session Management ✅
- [x] Store session data in localStorage (roomId, playerId, playerName)
- [x] Session validation with 4-hour expiration
- [x] Player name persistence across sessions
- [x] Clear session on explicit "Leave Game"

#### 4.3 Socket Reconnection & Rejoin ✅
- [x] Auto-rejoin on page refresh
- [x] rejoinGame socket event handler
- [x] Validate playerId + roomId on rejoin
- [x] Send full game state to rejoining player
- [x] Update socketId on reconnection
- [x] Handle disconnection with player persistence

#### 4.4 Game Cleanup & Expiration ✅
- [x] Scheduled cleanup job (cron every 5 minutes)
- [x] Clean stale unstarted games (≤1 player, 10+ min inactive)
- [x] Clean empty in-progress games (≤1 player)
- [x] Clean inactive games (20+ min no player action)
- [x] Clean expired games (4+ hours old)
- [x] Auto-delete when game drops to 1 player during gameplay
- [x] Track last_action timestamp on player actions

### Sprint 5: Lobby Navigation & UX Improvements ✅ COMPLETE

#### 5.1 Lobby Navigation System ✅
- [x] Return to Lobby functionality (keeps seat, marks player away)
- [x] Leave Game functionality (permanent exit with confirmation)
- [x] Visual indicators for absent players
  - [x] Red border on player info
  - [x] Door emoji indicator
  - [x] Reduced opacity
- [x] Lobby browser showing all games (joinable + in-progress)
- [x] "Your Active Game" section with rejoin button
- [x] Prevent joining multiple games simultaneously

#### 5.2 UI Enhancements ✅
- [x] FontAwesome icon library integration
- [x] Red "Leave Game" button with exit icon
- [x] Styled navigation buttons (stacked layout)
- [x] Game status indicators (🎮 In Progress / ⏳ Waiting)
- [x] Room/table terminology updates

---

### Sprint 6: Future Enhancements (Roadmap)

#### 6.1 Gameplay Features
- [ ] Multiple rounds/sessions with scoring
- [ ] Difficulty modifier cards
- [ ] Game statistics and history
- [ ] Spectator mode

#### 6.2 UI/UX Polish
- [ ] Smooth card animations (deal, flip)
- [ ] Token movement animations
- [ ] Transition effects between phases
- [ ] Improved mobile responsiveness
- [ ] Tutorial/help system
- [ ] Settings/options menu

#### 6.3 Audio
- [ ] Sound effects for game actions
- [ ] Background music
- [ ] Audio settings (volume, mute)

#### 6.4 Production Deployment
- [ ] Environment configuration (dev/staging/prod)
- [ ] Production database setup
- [ ] Security hardening (rate limiting, input validation)
- [ ] Performance optimization
- [ ] Monitoring and logging
- [ ] Deployment automation (CI/CD)
