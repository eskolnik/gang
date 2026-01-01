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
    this.add.text(width / 2, 80, 'THE GANG', {
      fontFamily: 'Arial Black',
      fontSize: 64,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(width / 2, 140, 'Cooperative Poker', {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#cccccc'
    }).setOrigin(0.5);

    // Connection status
    this.statusText = this.add.text(width / 2, 200, 'Connecting to server...', {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#ffff00'
    }).setOrigin(0.5);

    // Player name input section
    const nameY = 280;
    this.add.text(width / 2, nameY, 'Your Name:', {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.playerNameText = this.add.text(width / 2, nameY + 40, 'Player', {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    // Create room section
    const createY = 400;
    this.add.text(width / 2, createY, 'Create New Room', {
      fontFamily: 'Arial Black',
      fontSize: 28,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.createRoomButton = this.createButton(width / 2, createY + 60, 'Create Room', () => {
      this.createRoom();
    });

    // Join room section
    const joinY = 550;
    this.add.text(width / 2, joinY, 'Join Existing Room', {
      fontFamily: 'Arial Black',
      fontSize: 28,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(width / 2, joinY + 50, 'Room Code:', {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.roomCodeText = this.add.text(width / 2, joinY + 90, 'ABC123', {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    this.joinRoomButton = this.createButton(width / 2, joinY + 150, 'Join Room', () => {
      this.joinRoom();
    });

    // Disable buttons initially
    this.setButtonsEnabled(false);

    // Connect to server
    this.connectToServer();

    // Set up keyboard input for name/room code (simplified)
    this.playerNameText.on('pointerdown', () => {
      const name = prompt('Enter your name:', 'Player');
      if (name) {
        this.playerNameText.setText(name);
      }
    });

    this.roomCodeText.on('pointerdown', () => {
      const code = prompt('Enter room code:', '');
      if (code) {
        this.roomCodeText.setText(code.toUpperCase());
      }
    });
  }

  connectToServer() {
    NetworkManager.connect();

    // Listen for connection events
    NetworkManager.on('connected', () => {
      this.statusText.setText('✅ Connected to server');
      this.statusText.setColor('#00ff00');
      this.setButtonsEnabled(true);
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
  }

  async createRoom() {
    const playerName = this.playerNameText.text;

    try {
      this.statusText.setText('Creating room...');
      this.setButtonsEnabled(false);

      const response = await NetworkManager.createRoom(playerName, 6, 2);

      // Show room code
      this.statusText.setText(`✅ Room created: ${response.roomId}`);
      this.statusText.setColor('#00ff00');

      // Transition to game scene after a brief delay
      this.time.delayedCall(1500, () => {
        this.scene.start(SCENES.GAME);
      });

    } catch (error) {
      this.statusText.setText('❌ Failed: ' + error.message);
      this.statusText.setColor('#ff0000');
      this.setButtonsEnabled(true);
    }
  }

  async joinRoom() {
    const playerName = this.playerNameText.text;
    const roomCode = this.roomCodeText.text;

    if (!roomCode || roomCode.length !== 6) {
      this.statusText.setText('❌ Invalid room code');
      this.statusText.setColor('#ff0000');
      return;
    }

    try {
      this.statusText.setText('Joining room...');
      this.setButtonsEnabled(false);

      await NetworkManager.joinRoom(roomCode, playerName);

      this.statusText.setText(`✅ Joined room: ${roomCode}`);
      this.statusText.setColor('#00ff00');

      // Transition to game scene
      this.time.delayedCall(1500, () => {
        this.scene.start(SCENES.GAME);
      });

    } catch (error) {
      this.statusText.setText('❌ Failed: ' + error.message);
      this.statusText.setColor('#ff0000');
      this.setButtonsEnabled(true);
    }
  }

  createButton(x, y, text, callback) {
    const button = this.add.rectangle(x, y, 200, 50, COLORS.BUTTON)
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
      fontSize: 20,
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
