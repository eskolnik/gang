# The Gang - Game Server

WebSocket server for The Gang cooperative poker game.

## Quick Start

```bash
# Install dependencies
bun install

# Start server (production)
bun start

# Start with hot reload (development)
bun dev
```

Server runs on **http://localhost:3000**

## Server Architecture

### Core Components

- **Express Server**: HTTP server for health checks
- **Socket.io**: WebSocket server for real-time game communication
- **GameRoom**: Manages individual game room state
- **Deck**: Card deck management (shuffle, deal)
- **HandEvaluator**: Poker hand evaluation using pokersolver library

### File Structure

```
server/
├── src/
│   ├── index.js                 # Server entry point
│   ├── gameLogic/
│   │   ├── Deck.js              # Card deck logic
│   │   ├── HandEvaluator.js     # Poker hand ranking
│   │   └── GameRoom.js          # Room state management
│   └── events/
│       └── socketHandlers.js    # Socket.io event handlers
└── package.json
```

## Socket.io Events

### Client → Server

#### `createRoom`
Create a new game room.
```javascript
socket.emit('createRoom', {
  playerName: 'Alice',
  maxPlayers: 6,
  minPlayers: 2
}, (response) => {
  // response: { success, roomId, playerId, gameState }
});
```

#### `joinRoom`
Join an existing room.
```javascript
socket.emit('joinRoom', {
  roomId: 'ABC123',
  playerName: 'Bob'
}, (response) => {
  // response: { success, roomId, playerId, gameState }
});
```

#### `startGame`
Start the game (must have min players).
```javascript
socket.emit('startGame', (response) => {
  // response: { success }
});
```

#### `claimToken`
Claim a token during betting round.
```javascript
socket.emit('claimToken', {
  tokenNumber: 3
}, (response) => {
  // response: { success, tokenAssignments, tokenPool, currentTurn }
});
```

#### `playerReady`
Mark yourself as ready to advance to next phase.
```javascript
socket.emit('playerReady', (response) => {
  // response: { success }
});
```

#### `getGameState`
Request current game state.
```javascript
socket.emit('getGameState', (response) => {
  // response: { success, gameState }
});
```

### Server → Client

#### `gameStateUpdate`
Broadcast when game state changes.
```javascript
socket.on('gameStateUpdate', (gameState) => {
  // gameState includes:
  // - phase, players, communityCards
  // - tokenPool, tokenAssignments, currentTurn
  // - myPocketCards (player-specific)
});
```

#### `gameComplete`
Sent when game ends with results.
```javascript
socket.on('gameComplete', (result) => {
  // result: { rankedHands, validation, success }
});
```

## Game Phases

1. **WAITING** - Waiting for players to join
2. **INITIAL_DEAL** - Dealing pocket cards
3. **BETTING_1** - First betting round (after pocket cards)
4. **FLOP** - Dealing flop (3 community cards)
5. **BETTING_2** - Second betting round
6. **TURN** - Dealing turn (1 card)
7. **BETTING_3** - Third betting round
8. **RIVER** - Dealing river (1 card)
9. **BETTING_4** - Final betting round
10. **REVEAL** - Revealing and evaluating hands
11. **COMPLETE** - Game complete

## Game Flow

### Starting a Game
1. First player creates room → receives `roomId` and `playerId`
2. Other players join with `roomId`
3. When enough players, any player calls `startGame`
4. Server deals pocket cards to all players
5. Game enters first betting round

### Betting Round Flow
1. Server creates token pool (tokens 1 through player count)
2. Players take turns claiming tokens
3. Each player can:
   - Claim available token from pool
   - Take token from another player (returns their current token to pool)
4. When player has token they want, they call `playerReady`
5. When all players ready, server advances to next phase

### Advancing Phases
- After BETTING_1 → Deal flop (3 cards) → BETTING_2
- After BETTING_2 → Deal turn (1 card) → BETTING_3
- After BETTING_3 → Deal river (1 card) → BETTING_4
- After BETTING_4 → Evaluate hands → REVEAL/COMPLETE

### Game End
- Server evaluates all hands using pokersolver
- Ranks hands from weakest (1) to strongest (player count)
- Compares token assignments to actual rankings
- Returns success: true if all correct, false if any mismatches

## Health Check

```bash
curl http://localhost:3000/health
```

Returns:
```json
{
  "status": "ok",
  "rooms": 2,
  "timestamp": "2025-12-31T18:00:00.000Z"
}
```

## Error Handling

All events use callbacks with error handling:
```javascript
{
  success: false,
  error: "Error message"
}
```

Common errors:
- "Room is full" - Max players reached
- "Game already in progress" - Can't join started game
- "Not your turn" - Tried to claim token out of turn
- "Token not available" - Invalid token number
- "Must claim a token before being ready" - Ready without token

## Card Format

Cards are represented as objects:
```javascript
{
  rank: 'A',  // '2'-'9', 'T', 'J', 'Q', 'K', 'A'
  suit: 's'   // 'h' (♥), 'd' (♦), 'c' (♣), 's' (♠)
}
```

Display format: `A♠`, `7♥`, `K♣`, etc.

## Development Notes

- Room IDs are 6-character uppercase alphanumeric codes
- Player IDs are randomly generated
- Rooms are automatically deleted when empty
- Players are removed on disconnect
- No authentication/authorization (add later if needed)
