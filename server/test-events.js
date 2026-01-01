#!/usr/bin/env bun
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['polling', 'websocket'],
  upgrade: true
});

socket.on('connect', () => {
  console.log('✅ Connected! ID:', socket.id);
  console.log('\nSending createRoom...');

  // Send the event
  socket.emit('createRoom', {
    playerName: 'TestPlayer',
    maxPlayers: 4,
    minPlayers: 2
  }, (response) => {
    console.log('\n📩 Got callback response!');
    console.log('Success:', response.success);
    if (response.success) {
      console.log('Room ID:', response.roomId);
      console.log('Player ID:', response.playerId);
      console.log('Phase:', response.gameState.phase);
    } else {
      console.log('Error:', response.error);
    }
    socket.disconnect();
    process.exit(0);
  });

  // Set a timeout
  setTimeout(() => {
    console.log('\n⏱️  No callback received in 3 seconds');
    socket.disconnect();
    process.exit(1);
  }, 3000);
});

socket.on('gameStateUpdate', (state) => {
  console.log('\n📢 Got gameStateUpdate event!');
  console.log('Phase:', state.phase);
  console.log('Players:', state.playerCount);
});

socket.on('connect_error', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
