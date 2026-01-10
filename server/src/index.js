import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { setupSocketHandlers } from './events/socketHandlers.js';
import { runScheduledCleanup } from './persistence/database.js';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.isDevelopment ? config.corsOrigin : false,
    methods: ["GET", "POST"]
  },
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

// Store active game rooms
const gameRooms = new Map();

// Set Content Security Policy that allows our app to function
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );
  next();
});

// Serve static files from client build in production
if (config.isProduction) {
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));
  console.log('📦 Serving static files from:', clientDistPath);
}

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: config.nodeEnv,
    rooms: gameRooms.size,
    timestamp: new Date().toISOString()
  });
});

// Serve test.html for browser testing (development only)
if (config.isDevelopment) {
  app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, '../test.html'));
  });
}

// Set up Socket.io event handlers
console.log('Setting up Socket.io handlers...');
setupSocketHandlers(io, gameRooms);
console.log('Socket.io handlers registered');

// Debug: log any connection attempts
io.engine.on("connection_error", (err) => {
  console.log('❌ Connection error:', err);
});

// Catch-all route for SPA (must be last, after Socket.io setup)
if (config.isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

httpServer.listen(config.port, () => {
  console.log(`🎮 The Gang server running on port ${config.port}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`📡 WebSocket ready for connections`);
  console.log(`   Socket.io path: /socket.io/`);
});

// Set up cleanup cron job
cron.schedule(config.cleanupCron, () => {
  const deletedRoomIds = runScheduledCleanup();

  // Remove deleted rooms from memory and notify players
  deletedRoomIds.forEach(roomId => {
    if (gameRooms.has(roomId)) {
      const room = gameRooms.get(roomId);

      // Notify all players that the game has been deleted
      const playerSocketIds = Array.from(room.players.values())
        .map(p => p.socketId)
        .filter(sid => sid); // Filter out null/undefined

      playerSocketIds.forEach(socketId => {
        io.to(socketId).emit('gameDeleted', {
          reason: 'Game removed due to inactivity'
        });
      });

      gameRooms.delete(roomId);
      console.log(`🗑️  Removed ${roomId} from memory (cleaned up by scheduler)`);
    }
  });
}, {
  scheduled: true,
  timezone: config.cleanupTimezone
});

console.log(`🧹 Cleanup cron job scheduled: ${config.cleanupCron}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
