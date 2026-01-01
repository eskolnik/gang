#!/usr/bin/env bun
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['polling', 'websocket'], // Try polling first
  upgrade: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('✅ CONNECTED! ID:', socket.id);

  console.log('\nTesting createRoom...');
  socket.emit('createRoom', { playerName: 'Test' }, (res) => {
    console.log('Result:', JSON.stringify(res, null, 2));
    socket.disconnect();
    process.exit(0);
  });
});

socket.on('connect_error', (err) => {
  console.error('❌ Connect Error:', err.message);
  console.error('   Type:', err.type);
  console.error('   Description:', err.description);
});

socket.on('error', (err) => {
  console.error('❌ Socket Error:', err);
});

setTimeout(() => {
  console.log('⏱️  Timeout');
  socket.disconnect();
  process.exit(1);
}, 5000);
