import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import { setupSocketHandlers } from './events/socketHandlers.js';
import { runScheduledCleanup } from './persistence/database.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST"]
  },
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// Store active game rooms
const gameRooms = new Map();

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: gameRooms.size,
    timestamp: new Date().toISOString()
  });
});

// Serve test.html for browser testing
app.get('/test', (req, res) => {
  res.sendFile('/Users/eskolnik/code/the_gang/server/test.html');
});

// Set up Socket.io event handlers
console.log('Setting up Socket.io handlers...');
setupSocketHandlers(io, gameRooms);
console.log('Socket.io handlers registered');

// Debug: log any connection attempts
io.engine.on("connection_error", (err) => {
  console.log('❌ Connection error:', err);
});

httpServer.listen(PORT, () => {
  console.log(`🎮 The Gang server running on port ${PORT}`);
  console.log(`📡 WebSocket ready for connections`);
  console.log(`   Socket.io path: /socket.io/`);
});

// Set up cleanup cron job - runs every 5 minutes
cron.schedule('*/5 * * * *', () => {
  const deletedRoomIds = runScheduledCleanup();

  // Remove deleted rooms from memory
  deletedRoomIds.forEach(roomId => {
    if (gameRooms.has(roomId)) {
      gameRooms.delete(roomId);
      console.log(`🗑️  Removed ${roomId} from memory (cleaned up by scheduler)`);
    }
  });
}, {
  scheduled: true,
  timezone: "America/New_York" // Adjust to your timezone
});

console.log('🧹 Cleanup cron job scheduled (every 5 minutes)');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
