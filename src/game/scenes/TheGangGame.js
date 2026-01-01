import { Scene } from 'phaser';
import NetworkManager from '../core/NetworkManager.js';
import { COLORS, SCENES, GAME_PHASES, ROUND_COLORS } from '../utils/constants.js';
import { HandEvaluator } from '../utils/handEvaluator.js';

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

    // Round tracker
    this.roundTrackerContainer = this.add.container(width - 20, 20);
    this.roundTrackerContainer.setPosition(width - 150, 30);

    // Player circle will be drawn here
    this.playerCircleContainer = this.add.container(width / 2, height / 2);

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

    // Hand evaluation display
    this.handEvalText = this.add.text(width / 2, height - 120, '', {
      fontFamily: 'Arial Black',
      fontSize: 20,
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

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

    // Update room code and round tracker
    this.roomCodeText.setText(`Room: ${NetworkManager.roomId}`);
    this.updateRoundTracker();

    // Update player circle
    this.updatePlayerCircle();

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

    // Get current best hand for highlighting
    const evaluation = this.gameState.myPocketCards ? HandEvaluator.evaluateHand(
      this.gameState.myPocketCards,
      this.gameState.communityCards
    ) : null;

    const spacing = 90;
    const startX = -(this.gameState.communityCards.length - 1) * spacing / 2;

    this.gameState.communityCards.forEach((card, i) => {
      const isInBestHand = evaluation && HandEvaluator.isCardInBestHand(card, evaluation.cards);
      const cardObj = this.createCardDisplay(card, isInBestHand);
      cardObj.setPosition(startX + i * spacing, 0);
      this.communityCardsContainer.add(cardObj);
    });
  }

  updatePocketCards() {
    this.pocketCardsContainer.removeAll(true);

    if (!this.gameState.myPocketCards || this.gameState.myPocketCards.length === 0) {
      this.handEvalText.setText('');
      return;
    }

    // Evaluate best hand
    const evaluation = HandEvaluator.evaluateHand(
      this.gameState.myPocketCards,
      this.gameState.communityCards || []
    );

    if (evaluation) {
      this.handEvalText.setText(evaluation.description);
      this.currentBestHand = evaluation.cards;
    }

    const spacing = 90;
    const startX = -(this.gameState.myPocketCards.length - 1) * spacing / 2;

    this.gameState.myPocketCards.forEach((card, i) => {
      const isInBestHand = evaluation && HandEvaluator.isCardInBestHand(card, evaluation.cards);
      const cardObj = this.createCardDisplay(card, isInBestHand);
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

      const tokenObj = this.createTokenDisplay(tokenNum, isMyToken, isAvailable, this.gameState.phase);
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

  updateRoundTracker() {
    this.roundTrackerContainer.removeAll(true);

    // Determine current round (1-4)
    let currentRound = 0;
    if (this.gameState.phase === GAME_PHASES.BETTING_1) currentRound = 1;
    else if (this.gameState.phase === GAME_PHASES.BETTING_2) currentRound = 2;
    else if (this.gameState.phase === GAME_PHASES.BETTING_3) currentRound = 3;
    else if (this.gameState.phase === GAME_PHASES.BETTING_4) currentRound = 4;

    if (currentRound > 0) {
      // Round text (e.g., "2/4")
      const roundText = this.add.text(0, 0, `${currentRound}/4`, {
        fontFamily: 'Arial Black',
        fontSize: 24,
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      this.roundTrackerContainer.add(roundText);

      // Four colored circles
      const circleSpacing = 25;
      const startX = 80;
      for (let i = 1; i <= 4; i++) {
        const color = [0xffffff, 0xffff00, 0xff9900, 0xff0000][i - 1];
        const circle = this.add.circle(startX + (i - 1) * circleSpacing, 0, 8, color);
        circle.setStrokeStyle(2, i === currentRound ? 0xffffff : 0x666666);
        if (i === currentRound) {
          circle.setScale(1.3);
        }
        this.roundTrackerContainer.add(circle);
      }
    }
  }

  updatePlayerCircle() {
    this.playerCircleContainer.removeAll(true);

    if (!this.gameState || !this.gameState.players) return;

    const players = this.gameState.players;
    const playerCount = players.length;
    const radius = 200;

    players.forEach((player, i) => {
      const angle = (i / playerCount) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Player name
      const nameText = this.add.text(x, y - 40, player.name, {
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5);

      this.playerCircleContainer.add(nameText);

      // Current token (if assigned)
      const currentToken = this.gameState.tokenAssignments[player.id];
      if (currentToken !== undefined) {
        const tokenObj = this.createTokenDisplay(currentToken, false, false, this.gameState.phase);
        tokenObj.setPosition(x, y);
        this.playerCircleContainer.add(tokenObj);
      }

      // Ready indicator
      if (player.ready && this.gameState.phase.includes('betting')) {
        const readyText = this.add.text(x, y + 40, '✓', {
          fontFamily: 'Arial',
          fontSize: 24,
          color: '#00ff00'
        }).setOrigin(0.5);
        this.playerCircleContainer.add(readyText);
      }

      // Turn arrow
      if (this.gameState.currentTurn === player.id && this.gameState.phase.includes('betting')) {
        const arrow = this.add.triangle(x, y - 60, 0, 20, 10, 0, -10, 0, 0xffff00);
        this.playerCircleContainer.add(arrow);
      }
    });

    // Token history at bottom
    if (this.gameState.bettingRoundHistory && this.gameState.bettingRoundHistory.length > 0) {
      const historyY = 280;
      this.gameState.bettingRoundHistory.forEach((round, roundIdx) => {
        const roundLabel = this.add.text(-150, historyY + roundIdx * 30, `R${roundIdx + 1}:`, {
          fontFamily: 'Arial',
          fontSize: 14,
          color: '#cccccc'
        }).setOrigin(1, 0.5);
        this.playerCircleContainer.add(roundLabel);

        players.forEach((player, playerIdx) => {
          const token = round.tokenAssignments[player.id];
          if (token !== undefined) {
            const x = -100 + playerIdx * 50;
            const y = historyY + roundIdx * 30;
            const miniToken = this.add.circle(x, y, 12, ROUND_COLORS[round.phase] || 0xcccccc);
            miniToken.setStrokeStyle(1, 0x000000);
            this.playerCircleContainer.add(miniToken);

            const tokenText = this.add.text(x, y, token.toString(), {
              fontFamily: 'Arial',
              fontSize: 12,
              color: '#000000'
            }).setOrigin(0.5);
            this.playerCircleContainer.add(tokenText);
          }
        });
      });
    }
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

  createCardDisplay(card, isInBestHand = false) {
    const container = this.add.container(0, 0);

    // Card background with highlight if in best hand
    const bgColor = isInBestHand ? 0xffffcc : COLORS.CARD_FRONT;
    const bg = this.add.rectangle(0, 0, 80, 112, bgColor);
    bg.setStrokeStyle(isInBestHand ? 4 : 2, isInBestHand ? 0xffaa00 : 0x000000);
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

  createTokenDisplay(number, isSelected, isAvailable, round = null) {
    const container = this.add.container(0, 0);

    // Determine color based on round
    let color = COLORS.TOKEN;
    if (round && ROUND_COLORS[round]) {
      color = ROUND_COLORS[round];
    }
    if (isSelected) {
      // Brighten selected tokens slightly
      color = Phaser.Display.Color.GetColor(
        Math.min(255, Phaser.Display.Color.IntegerToRGB(color).r + 40),
        Math.min(255, Phaser.Display.Color.IntegerToRGB(color).g + 40),
        Math.min(255, Phaser.Display.Color.IntegerToRGB(color).b + 40)
      );
    }
    if (!isAvailable && !isSelected) {
      color = COLORS.DISABLED;
    }

    const circle = this.add.circle(0, 0, 30, color);
    circle.setStrokeStyle(isSelected ? 5 : 3, isSelected ? 0x000000 : 0x333333);
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
