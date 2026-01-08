# The Gang

A cooperative multiplayer poker game where players work together to order their hands from weakest to strongest using only numbered tokens for communication.

## 🎮 Game Overview

Players each receive 2 pocket cards and must coordinate to correctly rank their hands (1 = weakest, 6 = strongest) using only numbered tokens (1-6). The team wins if all players correctly identify their hand rankings after 4 rounds of betting.

### Features

- ✅ Full multiplayer gameplay (2-6 players)
- ✅ Real-time WebSocket communication
- ✅ SQLite persistence with auto-save
- ✅ Auto-rejoin on page refresh
- ✅ Lobby browser with active game tracking
- ✅ Player name persistence
- ✅ Automatic cleanup of abandoned games

## Project Structure

This project is organized into two main directories:

- `client/` - React-based frontend application
- `server/` - Node.js backend with Socket.IO for real-time gameplay

In production, the server serves the built client files (monolithic deployment). In development, they run separately with Vite HMR for fast iteration.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v20 or higher)
- npm (comes with Node.js)

### Installation

From the project root:

```bash
# Install all dependencies (client + server)
npm run install:all

# Or install individually
npm run install:client
npm run install:server
```

### Running the Application

**Development mode** (runs both server and client with hot reloading):

```bash
npm run dev
```

This starts:
- Server on `http://localhost:3000`
- Client on `http://localhost:8080` (with Vite HMR)

**Production mode** (server serves built client):

```bash
# Build the client
npm run build

# Start the server (serves client at http://localhost:3000)
npm start
```

## Architecture

### Client (React)

The client is a React application using Vite for fast development and building.

**Key Components:**
- `App.jsx` - Main application component, manages scene routing (lobby/game)
- `components/Lobby.jsx` - Lobby interface for creating/joining games
- `components/Game.jsx` - Main game interface
- `components/Table.jsx` - Poker table layout and player positions
- `components/Card.jsx` - Individual playing card component
- `components/PlayerCard.jsx` - Player tableau (cards, chips, status)
- `components/Token.jsx` - Chip/token display component

**State Management:**
- `context/NetworkContext.jsx` - Manages Socket.IO connection and game state

**Utilities:**
- `game/core/NetworkManager.js` - Handles network communication
- `game/utils/handEvaluator.js` - Evaluates poker hands
- `game/utils/constants.js` - Game constants and configuration

### Server (Node.js + Socket.IO)

See `server/README.md` for detailed server documentation.

## Deployment

This app is ready to deploy to [Fly.io](https://fly.io) with automatic GitHub Actions deployment. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on:

- Setting up Fly.io with persistent volumes for SQLite
- Configuring GitHub Actions for automatic deployments
- Environment variable management
- Monitoring and scaling
- Database backups

**Quick deploy:**
```bash
# Install flyctl and login
brew install flyctl
flyctl auth login

# Deploy
flyctl deploy
```

## Environment Variables

The server supports the following environment variables (see `server/.env.example`):

- `NODE_ENV` - `development` or `production` (default: `development`)
- `PORT` - Server port (default: `3000`)
- `CORS_ORIGIN` - CORS origin for development (default: `http://localhost:8080`)
- `DB_PATH` - SQLite database path (default: `./game_state.db`)
- `CLEANUP_CRON` - Cron schedule for cleanup job (default: `*/5 * * * *`)
- `CLEANUP_TIMEZONE` - Timezone for cleanup job (default: `America/New_York`)

## Development

The client uses Vite's hot module replacement (HMR) for instant updates during development. Simply edit files in `client/src/` and see changes immediately in your browser.

## Building for Production

```bash
# Build client for production
npm run build
```

This creates an optimized production build in the `client/dist` folder, which the server will serve in production mode.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for upcoming features and improvements.

## License

MIT
