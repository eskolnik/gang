import { Scene } from 'phaser';
import NetworkManager from '../core/NetworkManager.js';
import { COLORS, SCENES, GAME_PHASES } from '../utils/constants.js';

export class TheGangGame extends Scene {
  constructor() {
    super(SCENES.GAME);
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background
    this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);

    // Game state
    this.gameState = NetworkManager.getGameState();

    // Title area
    this.roomCodeText = this.add.text(20, 20, '', {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#ffffff'
    });

    this.phaseText = this.add.text(width - 20, 20, '', {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#ffff00'
    }).setOrigin(1, 0);

    // Player list area
    this.playerListText = this.add.text(20, 60, '', {
      fontFamily: 'Arial',
      fontSize: 16,
      color: '#ffffff'
    });

    // Community cards area
    this.add.text(width / 2, 200, 'Community Cards', {
      fontFamily: 'Arial Black',
      fontSize: 24,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.communityCardsContainer = this.add.container(width / 2, 250);

    // My pocket cards area
    this.add.text(width / 2, height - 250, 'My Hand', {
      fontFamily: 'Arial Black',
      fontSize: 24,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.pocketCardsContainer = this.add.container(width / 2, height - 200);

    // Token selection area
    this.add.text(width / 2, height / 2, 'Token Selection', {
      fontFamily: 'Arial Black',
      fontSize: 24,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.tokensContainer = this.add.container(width / 2, height / 2 + 50);

    // Action buttons
    this.startButton = this.createButton(width / 2, height - 80, 'Start Game', () => {
      this.startGame();
    });

    this.readyButton = this.createButton(width / 2, height - 80, 'Ready', () => {
      this.setReady();
    });
    this.readyButton.setVisible(false);

    // Status text
    this.statusText = this.add.text(width / 2, height - 40, '', {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#ffff00'
    }).setOrigin(0.5);

    // Listen for game state updates
    NetworkManager.on('gameStateUpdate', (state) => {
      this.onGameStateUpdate(state);
    });

    NetworkManager.on('gameComplete', (result) => {
      this.onGameComplete(result);
    });

    // Initial update
    if (this.gameState) {
      this.updateUI();
    }
  }

  onGameStateUpdate(state) {
    console.log('Game state updated:', state);
    this.gameState = state;
    this.updateUI();
  }

  onGameComplete(result) {
    console.log('Game complete:', result);

    // Show results
    let message = result.success ? '🎊 YOU WIN!' : '❌ YOU LOSE';

    this.add.rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2, 600, 400, 0x000000, 0.9);

    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 100, message, {
      fontFamily: 'Arial Black',
      fontSize: 48,
      color: result.success ? '#00ff00' : '#ff0000'
    }).setOrigin(0.5);

    // Show hand rankings
    let rankingsText = '\nHand Rankings:\n';
    result.rankedHands.forEach((hand, i) => {
      const correct = hand.rank === this.gameState.tokenAssignments[hand.playerId];
      const icon = correct ? '✅' : '❌';
      rankingsText += `${icon} ${hand.rank}. ${hand.playerName}: ${hand.evaluation.description}\n`;
    });

    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, rankingsText, {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#ffffff',
      align: 'left'
    }).setOrigin(0.5);
  }

  updateUI() {
    if (!this.gameState) return;

    // Update room code and phase
    this.roomCodeText.setText(`Room: ${NetworkManager.roomId}`);
    this.phaseText.setText(`Phase: ${this.gameState.phase}`);

    // Update player list
    let playerListStr = 'Players:\n';
    this.gameState.players.forEach(player => {
      const token = this.gameState.tokenAssignments[player.id];
      const tokenStr = token ? ` [${token}]` : '';
      const readyStr = player.ready ? ' ✓' : '';
      playerListStr += `  ${player.name}${tokenStr}${readyStr}\n`;
    });
    this.playerListText.setText(playerListStr);

    // Update community cards
    this.updateCommunityCards();

    // Update pocket cards
    this.updatePocketCards();

    // Update tokens
    this.updateTokens();

    // Update buttons
    this.updateButtons();
  }

  updateCommunityCards() {
    this.communityCardsContainer.removeAll(true);

    if (!this.gameState.communityCards || this.gameState.communityCards.length === 0) {
      return;
    }

    const spacing = 90;
    const startX = -(this.gameState.communityCards.length - 1) * spacing / 2;

    this.gameState.communityCards.forEach((card, i) => {
      const cardObj = this.createCardDisplay(card);
      cardObj.setPosition(startX + i * spacing, 0);
      this.communityCardsContainer.add(cardObj);
    });
  }

  updatePocketCards() {
    this.pocketCardsContainer.removeAll(true);

    if (!this.gameState.myPocketCards || this.gameState.myPocketCards.length === 0) {
      return;
    }

    const spacing = 90;
    const startX = -(this.gameState.myPocketCards.length - 1) * spacing / 2;

    this.gameState.myPocketCards.forEach((card, i) => {
      const cardObj = this.createCardDisplay(card);
      cardObj.setPosition(startX + i * spacing, 0);
      this.pocketCardsContainer.add(cardObj);
    });
  }

  updateTokens() {
    this.tokensContainer.removeAll(true);

    console.log('updateTokens - Phase:', this.gameState.phase);

    // Only show tokens during betting rounds
    if (!this.gameState.phase.includes('betting')) {
      console.log('Not a betting phase, skipping tokens');
      return;
    }

    console.log('Token pool:', this.gameState.tokenPool);
    console.log('Token assignments:', this.gameState.tokenAssignments);
    console.log('Current turn:', this.gameState.currentTurn);
    console.log('My player ID:', NetworkManager.playerId);

    const allTokens = [...this.gameState.tokenPool];

    // Add tokens held by players
    Object.entries(this.gameState.tokenAssignments).forEach(([playerId, token]) => {
      if (!allTokens.includes(token)) {
        allTokens.push(token);
      }
    });

    allTokens.sort((a, b) => a - b);

    const spacing = 75;
    const startX = -(allTokens.length - 1) * spacing / 2;

    allTokens.forEach((tokenNum, i) => {
      const isMyToken = this.gameState.tokenAssignments[NetworkManager.playerId] === tokenNum;
      const isAvailable = this.gameState.tokenPool.includes(tokenNum);
      const isMyTurn = this.gameState.currentTurn === NetworkManager.playerId;

      console.log(`Token ${tokenNum}: myToken=${isMyToken}, available=${isAvailable}, myTurn=${isMyTurn}`);

      const tokenObj = this.createTokenDisplay(tokenNum, isMyToken, isAvailable);
      tokenObj.setPosition(startX + i * spacing, 0);

      // Make interactive if it's my turn
      if (isMyTurn && (isAvailable || !isMyToken)) {
        console.log(`Making token ${tokenNum} interactive`);
        tokenObj.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);
        tokenObj.on('pointerdown', () => {
          console.log(`Token ${tokenNum} clicked!`);
          this.claimToken(tokenNum);
        });
      }

      this.tokensContainer.add(tokenObj);
    });
  }

  updateButtons() {
    if (this.gameState.phase === GAME_PHASES.WAITING) {
      this.startButton.setVisible(true);
      this.readyButton.setVisible(false);
    } else if (this.gameState.phase.includes('betting')) {
      this.startButton.setVisible(false);
      const hasToken = this.gameState.tokenAssignments[NetworkManager.playerId] !== undefined;
      this.readyButton.setVisible(hasToken);
    } else {
      this.startButton.setVisible(false);
      this.readyButton.setVisible(false);
    }

    // Update status
    if (this.gameState.currentTurn === NetworkManager.playerId) {
      this.statusText.setText('Your turn to select a token');
    } else if (this.gameState.phase.includes('betting')) {
      const currentPlayer = this.gameState.players.find(p => p.id === this.gameState.currentTurn);
      this.statusText.setText(`Waiting for ${currentPlayer?.name || 'player'}...`);
    } else {
      this.statusText.setText('');
    }
  }

  createCardDisplay(card) {
    const container = this.add.container(0, 0);

    // Card background
    const bg = this.add.rectangle(0, 0, 80, 112, COLORS.CARD_FRONT);
    bg.setStrokeStyle(2, 0x000000);
    container.add(bg);

    // Card text (e.g., "A♠")
    const suitSymbols = { h: '♥', d: '♦', c: '♣', s: '♠' };
    const suitColors = { h: '#ff0000', d: '#ff0000', c: '#000000', s: '#000000' };

    const cardText = this.add.text(0, 0, `${card.rank}${suitSymbols[card.suit]}`, {
      fontFamily: 'Arial Black',
      fontSize: 32,
      color: suitColors[card.suit]
    }).setOrigin(0.5);

    container.add(cardText);

    return container;
  }

  createTokenDisplay(number, isSelected, isAvailable) {
    const container = this.add.container(0, 0);

    let color = COLORS.TOKEN;
    if (isSelected) color = COLORS.TOKEN_SELECTED;
    if (!isAvailable && !isSelected) color = COLORS.DISABLED;

    const circle = this.add.circle(0, 0, 30, color);
    circle.setStrokeStyle(3, 0x000000);
    container.add(circle);

    const text = this.add.text(0, 0, number.toString(), {
      fontFamily: 'Arial Black',
      fontSize: 28,
      color: '#000000'
    }).setOrigin(0.5);

    container.add(text);

    return container;
  }

  createButton(x, y, text, callback) {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 200, 50, COLORS.BUTTON)
      .setInteractive()
      .on('pointerover', () => bg.setFillStyle(COLORS.BUTTON_HOVER))
      .on('pointerout', () => bg.setFillStyle(COLORS.BUTTON))
      .on('pointerdown', callback);

    const buttonText = this.add.text(0, 0, text, {
      fontFamily: 'Arial Black',
      fontSize: 20,
      color: '#ffffff'
    }).setOrigin(0.5);

    container.add([bg, buttonText]);

    return container;
  }

  async startGame() {
    try {
      await NetworkManager.startGame();
      this.statusText.setText('Game started!');
    } catch (error) {
      this.statusText.setText('Error: ' + error.message);
    }
  }

  async claimToken(tokenNumber) {
    try {
      await NetworkManager.claimToken(tokenNumber);
    } catch (error) {
      this.statusText.setText('Error: ' + error.message);
    }
  }

  async setReady() {
    try {
      await NetworkManager.setReady();
      this.readyButton.setVisible(false);
      this.statusText.setText('Waiting for other players...');
    } catch (error) {
      this.statusText.setText('Error: ' + error.message);
    }
  }
}
