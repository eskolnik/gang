#!/usr/bin/env bun
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected:', socket.id);

  socket.emit('ping', (response) => {
    console.log('Got response:', response);
    socket.disconnect();
    process.exit(0);
  });

  setTimeout(() => {
    console.log('Timeout');
    process.exit(1);
  }, 2000);
});
