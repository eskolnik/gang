#!/usr/bin/env bun
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket'], // WebSocket only, no polling
  upgrade: false
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);

  socket.emit('ping', (response) => {
    console.log('✅ Got callback:', response);
    process.exit(0);
  });

  setTimeout(() => {
    console.log('❌ Timeout');
    process.exit(1);
  }, 3000);
});

socket.on('connect_error', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
