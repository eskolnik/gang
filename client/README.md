# The Gang - Client

React-based frontend for The Gang poker game.

## Installation

```bash
npm install
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install project dependencies |
| `npm run dev` | Launch development server with hot-reload |
| `npm run build` | Create production build in the `dist` folder |

## Development

The development server runs on `http://localhost:5173` by default.

Once the server is running, you can edit any files in the `src/` folder and Vite will automatically recompile and reload the browser.

## Project Structure

```
client/
├── src/
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # Application entry point
│   ├── index.css               # Global styles
│   ├── components/             # React components
│   │   ├── Lobby.jsx          # Lobby interface
│   │   ├── Game.jsx           # Main game view
│   │   ├── Table.jsx          # Poker table layout
│   │   ├── Card.jsx           # Playing card component
│   │   ├── PlayerCard.jsx     # Player info/cards display
│   │   └── Token.jsx          # Chip/token component
│   ├── context/
│   │   └── NetworkContext.jsx # Socket.IO context provider
│   └── game/
│       ├── core/
│       │   └── NetworkManager.js  # Network communication
│       └── utils/
│           ├── handEvaluator.js   # Poker hand evaluation
│           └── constants.js       # Game constants
├── public/
│   └── assets/                # Static assets (images, etc.)
├── index.html                 # HTML template
└── vite/                      # Vite configuration

```

## Architecture

### Component Hierarchy

```
App
├── NetworkProvider (context)
│   ├── Lobby
│   │   └── [Lobby UI components]
│   └── Game
│       ├── Table
│       │   ├── PlayerCard (for each player)
│       │   │   ├── Card (pocket cards)
│       │   │   └── Token (player chips)
│       │   └── Card (community cards)
│       └── [Game UI controls]
```

### State Management

The application uses React Context (`NetworkContext`) to manage:
- Socket.IO connection
- Game state (players, cards, pot, etc.)
- Network events

### Networking

Communication with the server is handled through Socket.IO via the `NetworkManager` and `NetworkContext`. All real-time game updates flow through this connection.

## Building for Production

```bash
npm run build
```

The production build will be created in the `dist/` folder. Upload the contents of this folder to a web server to deploy.
