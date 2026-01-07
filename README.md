# The Gang - Poker Game

A multiplayer poker game built with React and Node.js.

## Project Structure

This project is organized into two main directories:

- `client/` - React-based frontend application
- `server/` - Node.js backend with Socket.IO for real-time gameplay

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v16 or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository
2. Install dependencies for both client and server:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running the Application

You'll need to run both the server and client:

1. Start the server:
```bash
cd server
npm start
```

2. In a separate terminal, start the client:
```bash
cd client
npm run dev
```

The client will be available at `http://localhost:5173` (or the port shown in your terminal).

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

## Development

The client uses Vite's hot module replacement (HMR) for instant updates during development. Simply edit files in `client/src/` and see changes immediately in your browser.

## Building for Production

```bash
cd client
npm run build
```

This creates an optimized production build in the `client/dist` folder.

## License

MIT
