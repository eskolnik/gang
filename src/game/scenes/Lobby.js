import { Scene } from 'phaser';
import NetworkManager from '../core/NetworkManager.js';
import { COLORS, SCENES } from '../utils/constants.js';

export class Lobby extends Scene {
  constructor() {
    super(SCENES.LOBBY);
  }

  create() {
    console.log('🎮 Lobby scene create() called');
    const { width, height } = this.cameras.main;
    console.log('Screen size:', width, height);

    // Background
    this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);
    console.log('Background color set');

    // Title
    this.add.text(width / 2, 60, 'THE GANG', {
      fontFamily: 'Arial Black',
      fontSize: 48,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 110, 'Cooperative Poker', {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#cccccc'
    }).setOrigin(0.5);

    // Connection status
    this.statusText = this.add.text(width / 2, 150, 'Connecting to server...', {
      fontFamily: 'Arial',
      fontSize: 16,
      color: '#ffff00'
    }).setOrigin(0.5);

    // Player name section
    const nameY = 190;
    this.add.text(width / 2, nameY, 'Your Name:', {
      fontFamily: 'Arial',
      fontSize: 16,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.playerNameText = this.add.text(width / 2, nameY + 30, 'Player', {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive();

    this.playerNameText.on('pointerdown', () => {
      const name = prompt('Enter your name:', 'Player');
      if (name) {
        this.playerNameText.setText(name);
      }
    });

    // Available rooms section
    const roomListY = 270;
    this.add.text(width / 2, roomListY, 'Available Rooms', {
      fontFamily: 'Arial Black',
      fontSize: 24,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.roomListContainer = this.add.container(width / 2, roomListY + 40);
    this.roomListItems = [];

    // Create room button
    const createY = 550;
    this.createRoomButton = this.createButton(width / 2, createY, 'Create New Room', () => {
      this.createRoom();
    });

    // Manual join section (bottom)
    const joinY = 620;
    this.add.text(width / 2 - 100, joinY, 'Or enter code:', {
      fontFamily: 'Arial',
      fontSize: 14,
      color: '#cccccc'
    }).setOrigin(0.5);

    this.roomCodeText = this.add.text(width / 2 + 20, joinY, 'ABCDEF', {
      fontFamily: 'Arial',
      fontSize: 16,
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive();

    this.roomCodeText.on('pointerdown', () => {
      const code = prompt('Enter room code:', '');
      if (code) {
        this.roomCodeText.setText(code.toUpperCase());
      }
    });

    this.joinRoomButton = this.createButton(width / 2 + 120, joinY, 'Join', () => {
      this.joinRoomManually();
    }, 100);

    // Disable buttons initially
    this.setButtonsEnabled(false);

    // Connect to server
    this.connectToServer();
  }

  connectToServer() {
    NetworkManager.connect();

    // Listen for connection events
    NetworkManager.on('connected', () => {
      this.statusText.setText('✅ Connected to server');
      this.statusText.setColor('#00ff00');
      this.setButtonsEnabled(true);
      this.refreshRoomList();
    });

    NetworkManager.on('disconnected', (reason) => {
      this.statusText.setText('❌ Disconnected: ' + reason);
      this.statusText.setColor('#ff0000');
      this.setButtonsEnabled(false);
    });

    NetworkManager.on('error', (error) => {
      this.statusText.setText('❌ Error: ' + error.message);
      this.statusText.setColor('#ff0000');
    });

    // Listen for room list updates
    NetworkManager.on('roomListUpdate', (roomList) => {
      this.updateRoomList(roomList);
    });
  }

  async refreshRoomList() {
    try {
      const rooms = await NetworkManager.getRoomList();
      this.updateRoomList(rooms);
    } catch (error) {
      console.error('Failed to get room list:', error);
    }
  }

  updateRoomList(rooms) {
    // Clear existing items
    this.roomListContainer.removeAll(true);
    this.roomListItems = [];

    if (rooms.length === 0) {
      const emptyText = this.add.text(0, 0, 'No rooms available. Create one!', {
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#888888'
      }).setOrigin(0.5);
      this.roomListContainer.add(emptyText);
      return;
    }

    // Display up to 5 rooms
    const maxRooms = Math.min(rooms.length, 5);
    const itemHeight = 50;
    const startY = -(maxRooms - 1) * itemHeight / 2;

    for (let i = 0; i < maxRooms; i++) {
      const room = rooms[i];
      const y = startY + i * itemHeight;

      // Room item background
      const bg = this.add.rectangle(0, y, 500, 45, 0x2a5a3a)
        .setInteractive()
        .on('pointerover', () => bg.setFillStyle(0x3a6a4a))
        .on('pointerout', () => bg.setFillStyle(0x2a5a3a))
        .on('pointerdown', () => this.joinRoomById(room.roomId));

      // Room ID
      const roomIdText = this.add.text(-240, y, room.roomId, {
        fontFamily: 'Arial Black',
        fontSize: 18,
        color: '#ffffff'
      }).setOrigin(0, 0.5);

      // Player count
      const countText = this.add.text(100, y, `${room.playerCount}/${room.maxPlayers}`, {
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#ffff00'
      }).setOrigin(0, 0.5);

      // Player names
      const namesText = this.add.text(-100, y, room.players.join(', '), {
        fontFamily: 'Arial',
        fontSize: 14,
        color: '#cccccc'
      }).setOrigin(0, 0.5);

      this.roomListContainer.add([bg, roomIdText, countText, namesText]);
      this.roomListItems.push({ bg, roomIdText, countText, namesText });
    }
  }

  async joinRoomById(roomId) {
    const playerName = this.playerNameText.text;

    try {
      this.statusText.setText('Joining room...');
      this.statusText.setColor('#ffff00');
      this.setButtonsEnabled(false);

      await NetworkManager.joinRoom(roomId, playerName);

      this.statusText.setText(`✅ Joined room: ${roomId}`);
      this.statusText.setColor('#00ff00');

      // Transition to game scene
      this.time.delayedCall(500, () => {
        this.scene.start(SCENES.GAME);
      });

    } catch (error) {
      this.statusText.setText('❌ ' + error.message);
      this.statusText.setColor('#ff0000');
      this.setButtonsEnabled(true);
    }
  }

  async joinRoomManually() {
    const roomCode = this.roomCodeText.text;

    if (!roomCode || roomCode.length !== 6) {
      this.statusText.setText('❌ Invalid room code');
      this.statusText.setColor('#ff0000');
      return;
    }

    await this.joinRoomById(roomCode);
  }

  async createRoom() {
    const playerName = this.playerNameText.text;

    try {
      this.statusText.setText('Creating room...');
      this.statusText.setColor('#ffff00');
      this.setButtonsEnabled(false);

      const response = await NetworkManager.createRoom(playerName, 6, 2);

      // Show room code
      this.statusText.setText(`✅ Room created: ${response.roomId}`);
      this.statusText.setColor('#00ff00');

      // Transition to game scene after a brief delay
      this.time.delayedCall(500, () => {
        this.scene.start(SCENES.GAME);
      });

    } catch (error) {
      this.statusText.setText('❌ Failed: ' + error.message);
      this.statusText.setColor('#ff0000');
      this.setButtonsEnabled(true);
    }
  }

  createButton(x, y, text, callback, width = 200) {
    const button = this.add.rectangle(x, y, width, 40, COLORS.BUTTON)
      .setInteractive()
      .on('pointerover', () => {
        if (button.enabled) {
          button.setFillStyle(COLORS.BUTTON_HOVER);
        }
      })
      .on('pointerout', () => {
        if (button.enabled) {
          button.setFillStyle(COLORS.BUTTON);
        }
      })
      .on('pointerdown', () => {
        if (button.enabled) {
          callback();
        }
      });

    const buttonText = this.add.text(x, y, text, {
      fontFamily: 'Arial Black',
      fontSize: 16,
      color: '#ffffff'
    }).setOrigin(0.5);

    button.enabled = true;
    button.textObj = buttonText;

    return button;
  }

  setButtonsEnabled(enabled) {
    [this.createRoomButton, this.joinRoomButton].forEach(button => {
      button.enabled = enabled;
      if (enabled) {
        button.setFillStyle(COLORS.BUTTON);
        button.setAlpha(1);
        button.textObj.setAlpha(1);
      } else {
        button.setFillStyle(COLORS.DISABLED);
        button.setAlpha(0.5);
        button.textObj.setAlpha(0.5);
      }
    });
  }
}
