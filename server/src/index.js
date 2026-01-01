import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './events/socketHandlers.js';

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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
