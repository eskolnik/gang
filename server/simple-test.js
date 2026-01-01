#!/usr/bin/env bun
/**
 * Simple connection test
 */
import { io } from 'socket.io-client';

console.log('🔌 Attempting to connect to http://localhost:3000...\n');

const socket = io('http://localhost:3000', {
  reconnectionDelay: 1000,
  reconnection: true,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected! Socket ID:', socket.id);

  // Test creating a room
  console.log('\n📝 Creating room...');
  socket.emit('createRoom', {
    playerName: 'TestPlayer',
    maxPlayers: 6,
    minPlayers: 2
  }, (response) => {
    console.log('Response:', response);
    if (response.success) {
      console.log('✅ Room created:', response.roomId);
      console.log('Player ID:', response.playerId);
      console.log('\nGame State:', JSON.stringify(response.gameState, null, 2));
    } else {
      console.log('❌ Error:', response.error);
    }

    process.exit(0);
  });
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.log('⏱️  Timeout - no response');
  process.exit(1);
}, 5000);
