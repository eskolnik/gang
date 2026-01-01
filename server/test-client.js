#!/usr/bin/env bun
/**
 * Interactive test client for The Gang server
 * Usage: bun test-client.js
 */

import { io } from 'socket.io-client';
import readline from 'readline';

const socket = io('http://localhost:3000');
let currentRoomId = null;
let currentPlayerId = null;
let playerName = `Player${Math.floor(Math.random() * 1000)}`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

console.log('🎮 The Gang Test Client');
console.log('========================\n');

socket.on('connect', () => {
  console.log('✅ Connected to server\n');
  showHelp();
  rl.prompt();
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('gameStateUpdate', (state) => {
  console.log('\n📢 Game State Update:');
  console.log('  Phase:', state.phase);
  console.log('  Players:', state.players.length);
  console.log('  Community Cards:', state.communityCards.map(c => `${c.rank}${c.suit}`).join(' ') || 'None yet');
  console.log('  Token Pool:', state.tokenPool);
  console.log('  Token Assignments:', state.tokenAssignments);
  console.log('  Current Turn:', state.currentTurn);
  if (state.myPocketCards) {
    console.log('  My Pocket Cards:', state.myPocketCards.map(c => `${c.rank}${c.suit}`).join(' '));
  }
  console.log('');
  rl.prompt();
});

socket.on('gameComplete', (result) => {
  console.log('\n🎊 GAME COMPLETE!');
  console.log('  Success:', result.success ? '✅ WIN!' : '❌ LOSS');
  console.log('\nHand Rankings:');
  result.rankedHands.forEach((hand, i) => {
    console.log(`  ${i + 1}. ${hand.playerName}: ${hand.evaluation.description}`);
  });
  if (!result.success) {
    console.log('\nErrors:');
    result.validation.errors.forEach(err => {
      console.log(`  ❌ ${err.playerName}: Had token ${err.assignedToken}, should be ${err.actualRank}`);
    });
  }
  console.log('');
  rl.prompt();
});

function showHelp() {
  console.log('Commands:');
  console.log('  create [name]     - Create a new room');
  console.log('  join <roomId>     - Join a room');
  console.log('  start             - Start the game');
  console.log('  claim <token>     - Claim a token (1-6)');
  console.log('  ready             - Mark ready to advance');
  console.log('  state             - Get current game state');
  console.log('  help              - Show this help');
  console.log('  quit              - Exit\n');
}

rl.on('line', (line) => {
  const [command, ...args] = line.trim().split(' ');

  switch (command) {
    case 'create':
      if (args[0]) playerName = args[0];
      socket.emit('createRoom', {
        playerName,
        maxPlayers: 6,
        minPlayers: 2
      }, (response) => {
        if (response.success) {
          currentRoomId = response.roomId;
          currentPlayerId = response.playerId;
          console.log(`✅ Room created: ${currentRoomId}`);
          console.log(`   Your Player ID: ${currentPlayerId}`);
          console.log(`   Share this room code with others: ${currentRoomId}\n`);
        } else {
          console.log(`❌ Error: ${response.error}\n`);
        }
        rl.prompt();
      });
      break;

    case 'join':
      if (!args[0]) {
        console.log('❌ Usage: join <roomId>\n');
        rl.prompt();
        break;
      }
      socket.emit('joinRoom', {
        roomId: args[0].toUpperCase(),
        playerName
      }, (response) => {
        if (response.success) {
          currentRoomId = response.roomId;
          currentPlayerId = response.playerId;
          console.log(`✅ Joined room: ${currentRoomId}`);
          console.log(`   Your Player ID: ${currentPlayerId}\n`);
        } else {
          console.log(`❌ Error: ${response.error}\n`);
        }
        rl.prompt();
      });
      break;

    case 'start':
      socket.emit('startGame', (response) => {
        if (response.success) {
          console.log('✅ Game started!\n');
        } else {
          console.log(`❌ Error: ${response.error}\n`);
        }
        rl.prompt();
      });
      break;

    case 'claim':
      if (!args[0]) {
        console.log('❌ Usage: claim <token>\n');
        rl.prompt();
        break;
      }
      socket.emit('claimToken', {
        tokenNumber: parseInt(args[0])
      }, (response) => {
        if (response.success) {
          console.log(`✅ Claimed token ${args[0]}\n`);
        } else {
          console.log(`❌ Error: ${response.error}\n`);
        }
        rl.prompt();
      });
      break;

    case 'ready':
      socket.emit('playerReady', (response) => {
        if (response.success) {
          console.log('✅ Marked as ready\n');
        } else {
          console.log(`❌ Error: ${response.error}\n`);
        }
        rl.prompt();
      });
      break;

    case 'state':
      socket.emit('getGameState', (response) => {
        if (response.success) {
          console.log('Current State:', JSON.stringify(response.gameState, null, 2), '\n');
        } else {
          console.log(`❌ Error: ${response.error}\n`);
        }
        rl.prompt();
      });
      break;

    case 'help':
      showHelp();
      rl.prompt();
      break;

    case 'quit':
    case 'exit':
      console.log('Goodbye!');
      process.exit(0);
      break;

    default:
      if (command) {
        console.log(`❌ Unknown command: ${command}`);
        console.log('Type "help" for available commands\n');
      }
      rl.prompt();
  }
});

rl.on('close', () => {
  console.log('\nGoodbye!');
  process.exit(0);
});
