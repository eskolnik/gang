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

    // Title area (top left)
    this.roomCodeText = this.add.text(20, 20, '', {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#ffffff'
    });

    // Round tracker (top right)
    this.roundTrackerContainer = this.add.container(width - 200, 30);

    // Table circle (visual representation of the poker table)
    const tableRadius = 240;
    const tableY = 380;
    this.tableCircle = this.add.circle(width / 2, tableY, tableRadius, 0x2a5a3a);
    this.tableCircle.setStrokeStyle(4, 0x1a472a);

    // Community cards area (center of table)
    this.communityCardsContainer = this.add.container(width / 2, tableY - 80);

    // Token pool area (center of table, below community cards)
    this.tokensContainer = this.add.container(width / 2, tableY + 20);

    // Player circle (around the table edge)
    this.playerCircleContainer = this.add.container(width / 2, tableY);

    // Action buttons
    this.startButton = this.createButton(width / 2, height - 40, 'Start Game', () => {
      this.startGame();
    });

    this.readyButton = this.createButton(width / 2, height - 40, 'Ready', () => {
      this.setReady();
    });
    this.readyButton.setVisible(false);

    // Status text
    this.statusText = this.add.text(width / 2, height - 10, '', {
      fontFamily: 'Arial',
      fontSize: 14,
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

    const { width, height } = this.cameras.main;

    // Show results
    let message = result.success ? '🎊 YOU WIN!' : '❌ YOU LOSE';

    this.add.rectangle(width / 2, height / 2, 600, 500, 0x000000, 0.9);

    this.add.text(width / 2, height / 2 - 150, message, {
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

    this.add.text(width / 2, height / 2 - 40, rankingsText, {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#ffffff',
      align: 'left'
    }).setOrigin(0.5);

    // Restart button
    this.createButton(width / 2 - 110, height / 2 + 150, 'Play Again', async () => {
      try {
        await NetworkManager.restartGame();
        // UI will update when we receive the gameStateUpdate event
      } catch (error) {
        console.error('Failed to restart game:', error);
        alert('Failed to restart game: ' + error.message);
      }
    });

    // Return to lobby button
    this.createButton(width / 2 + 110, height / 2 + 150, 'Lobby', () => {
      this.scene.start(SCENES.LOBBY);
    });
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

    console.log('updatePocketCards - myPocketCards:', this.gameState?.myPocketCards);

    if (!this.gameState.myPocketCards || this.gameState.myPocketCards.length === 0) {
      console.log('No pocket cards to display!');
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

    // Only show unclaimed tokens in the center pool
    const unclaimedTokens = [...this.gameState.tokenPool].sort((a, b) => a - b);

    if (unclaimedTokens.length === 0) {
      // No tokens in pool - all claimed
      return;
    }

    const spacing = 60;
    const startX = -(unclaimedTokens.length - 1) * spacing / 2;

    const isMyTurn = this.gameState.currentTurn === NetworkManager.playerId;

    unclaimedTokens.forEach((tokenNum, i) => {
      const tokenObj = this.createTokenDisplay(tokenNum, false, true, this.gameState.phase);
      tokenObj.setPosition(startX + i * spacing, 0);
      tokenObj.setScale(0.9); // Slightly smaller tokens in pool

      // Make interactive if it's my turn
      if (isMyTurn) {
        console.log(`Making pool token ${tokenNum} interactive`);
        tokenObj.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);
        tokenObj.on('pointerdown', () => {
          console.log(`Pool token ${tokenNum} clicked!`);
          this.claimToken(tokenNum);
        });
      }

      this.tokensContainer.add(tokenObj);
    });
  }

  updateRoundTracker() {
    this.roundTrackerContainer.removeAll(true);

    // Determine current round (1-4) and phase name
    let currentRound = 0;
    let phaseName = '';
    if (this.gameState.phase === GAME_PHASES.BETTING_1) {
      currentRound = 1;
      phaseName = 'Pre-flop';
    } else if (this.gameState.phase === GAME_PHASES.BETTING_2) {
      currentRound = 2;
      phaseName = 'Flop';
    } else if (this.gameState.phase === GAME_PHASES.BETTING_3) {
      currentRound = 3;
      phaseName = 'Turn';
    } else if (this.gameState.phase === GAME_PHASES.BETTING_4) {
      currentRound = 4;
      phaseName = 'River';
    }

    if (currentRound > 0) {
      // Four colored circles
      const circleSpacing = 25;
      const startX = 0;
      for (let i = 1; i <= 4; i++) {
        const color = [0xffffff, 0xffff00, 0xff9900, 0xff0000][i - 1];
        const circle = this.add.circle(startX + (i - 1) * circleSpacing, 0, 8, color);
        circle.setStrokeStyle(2, i === currentRound ? 0xffffff : 0x666666);
        if (i === currentRound) {
          circle.setScale(1.3);
        }
        this.roundTrackerContainer.add(circle);
      }

      // Phase name text below circles with color matching current round
      const roundColors = ['#ffffff', '#ffff00', '#ff9900', '#ff0000'];
      const centerX = startX + (3 * circleSpacing) / 2; // Center of the 4 circles
      const roundText = this.add.text(centerX, 20, phaseName, {
        fontFamily: 'Arial Black',
        fontSize: 16,
        color: roundColors[currentRound - 1]
      }).setOrigin(0.5, 0);
      this.roundTrackerContainer.add(roundText);
    }
  }

  updatePlayerCircle() {
    this.playerCircleContainer.removeAll(true);

    if (!this.gameState || !this.gameState.players) return;

    const players = [...this.gameState.players];
    const playerCount = players.length;
    const radius = 240; // Radius to position players around table edge

    // Reorder players so current player is always first (will be at bottom)
    const myIndex = players.findIndex(p => p.id === NetworkManager.playerId);
    if (myIndex > 0) {
      const reordered = [...players.slice(myIndex), ...players.slice(0, myIndex)];
      players.splice(0, players.length, ...reordered);
    }

    const isMyTurn = this.gameState.currentTurn === NetworkManager.playerId;

    players.forEach((player, i) => {
      // Start at bottom (Math.PI / 2) and go counter-clockwise
      const angle = Math.PI / 2 + (i / playerCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const isMe = player.id === NetworkManager.playerId;
      const playerCard = this.createPlayerCard(player, isMe);
      playerCard.setPosition(x, y);

      this.playerCircleContainer.add(playerCard);
    });
  }

  createPlayerCard(player, isMe) {
    const container = this.add.container(0, 0);

    // My card is larger to fit actual pocket cards
    const cardWidth = isMe ? 200 : 90;
    const cardHeight = isMe ? 180 : 120;
    const dividerY = cardHeight * 0.7 - cardHeight / 2; // 70% from top

    // Background rounded rectangle
    const bg = this.add.graphics();
    bg.fillStyle(isMe ? 0x3a6a4a : 0x2a5a3a);
    bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 8);

    // Border (yellow for active player, dark grey for others)
    const isActivePlayer = this.gameState.currentTurn === player.id;
    bg.lineStyle(2, isActivePlayer ? 0xffff00 : 0x666666);
    bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 8);
    container.add(bg);

    // Divider line
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x1a472a);
    divider.lineBetween(-cardWidth / 2 + 4, dividerY, cardWidth / 2 - 4, dividerY);
    container.add(divider);

    // Top section: Cards (actual cards for me, card backs for others)
    const hasPocketCards = this.gameState.phase !== GAME_PHASES.WAITING;
    if (hasPocketCards) {
      if (isMe && this.gameState.myPocketCards && this.gameState.myPocketCards.length > 0) {
        // Show actual pocket cards for me (centered)
        const pocketCardWidth = 80;
        const pocketCardHeight = 112;
        const cardSpacing = 10;
        const cardsY = -cardHeight / 2 + 50;

        // Center the two cards: card centers at -(cardWidth + spacing)/2 and +(cardWidth + spacing)/2
        const card1X = -(pocketCardWidth + cardSpacing) / 2;
        const card2X = (pocketCardWidth + cardSpacing) / 2;

        // Get hand evaluation for highlighting
        const evaluation = HandEvaluator.evaluateHand(
          this.gameState.myPocketCards,
          this.gameState.communityCards || []
        );

        this.gameState.myPocketCards.forEach((card, i) => {
          const cardX = i === 0 ? card1X : card2X;
          const isInBestHand = evaluation && HandEvaluator.isCardInBestHand(card, evaluation.cards);
          const cardObj = this.createCardDisplay(card, isInBestHand);
          cardObj.setPosition(cardX, cardsY);
          container.add(cardObj);
        });
      } else {
        // Show card backs for other players (centered)
        const cardBackWidth = 18;
        const cardBackHeight = 27;
        const cardSpacing = 4;
        const cardsY = -cardHeight / 2 + 28;

        // Center the two card backs
        const card1X = -(cardBackWidth + cardSpacing) / 2;
        const card2X = (cardBackWidth + cardSpacing) / 2;

        for (let i = 0; i < 2; i++) {
          const cardX = i === 0 ? card1X : card2X;

          // Card back rectangle
          const cardBg = this.add.rectangle(cardX, cardsY, cardBackWidth, cardBackHeight, 0x4a7a5a);
          cardBg.setStrokeStyle(1, 0x1a472a);
          container.add(cardBg);

          // Card back pattern (simple diagonal lines)
          const pattern = this.add.graphics();
          pattern.lineStyle(1, 0x2a5a3a, 0.5);
          for (let j = -cardBackHeight / 2; j < cardBackHeight / 2; j += 4) {
            pattern.lineBetween(
              cardX - cardBackWidth / 2,
              cardsY + j,
              cardX + cardBackWidth / 2,
              cardsY + j - cardBackWidth
            );
          }
          container.add(pattern);
        }
      }
    }

    // Current token (outside box for me, inside for others)
    const currentToken = this.gameState.tokenAssignments[player.id];
    if (currentToken !== undefined) {
      const isMyToken = player.id === NetworkManager.playerId;

      // Position token outside my card, inside others' cards
      let tokenY;
      if (isMe) {
        tokenY = -cardHeight / 2 - 40; // Outside, above my card
      } else {
        tokenY = hasPocketCards ? -cardHeight / 2 + 65 : -cardHeight / 2 + 38; // Inside other cards
      }

      const tokenObj = this.createTokenDisplay(currentToken, isMyToken, false, this.gameState.phase);
      tokenObj.setPosition(0, tokenY);

      if (!isMe) {
        tokenObj.setScale(0.8); // Slightly smaller token for other players' compact cards
      }

      // Make token clickable if it's my turn and not my token
      if (this.gameState.currentTurn === NetworkManager.playerId && !isMyToken && this.gameState.phase.includes('betting')) {
        tokenObj.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);
        tokenObj.on('pointerdown', () => {
          this.claimToken(currentToken);
        });
      }

      container.add(tokenObj);
    }

    // Turn arrow above card
    if (this.gameState.currentTurn === player.id && this.gameState.phase.includes('betting')) {
      const arrow = this.add.triangle(0, -cardHeight / 2 - 12, 0, 8, 6, -5, -6, -5, 0xffff00);
      container.add(arrow);
    }

    // Bottom section: Name on left
    const nameY = dividerY + (isMe ? 16 : 12);
    const nameFontSize = isMe ? 14 : 10;
    const nameText = this.add.text(-cardWidth / 2 + (isMe ? 8 : 6), nameY, player.name, {
      fontFamily: 'Arial',
      fontSize: nameFontSize,
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    container.add(nameText);

    // Ready indicator
    if (player.ready && this.gameState.phase.includes('betting')) {
      const readyText = this.add.text(cardWidth / 2 - (isMe ? 8 : 6), nameY, '✓', {
        fontFamily: 'Arial',
        fontSize: isMe ? 18 : 12,
        color: '#00ff00'
      }).setOrigin(1, 0.5);
      container.add(readyText);
    }

    // Token history (small icons on bottom)
    if (this.gameState.bettingRoundHistory && this.gameState.bettingRoundHistory.length > 0) {
      const historyY = dividerY + (isMe ? 36 : 24);
      const historyStartX = -cardWidth / 2 + (isMe ? 8 : 6);
      const historySpacing = isMe ? 30 : 20;
      const historySize = isMe ? 15 : 12; // Half the radius of current tokens (30)
      const historyFontSize = isMe ? 12 : 10;

      this.gameState.bettingRoundHistory.forEach((round, roundIdx) => {
        const token = round.tokenAssignments[player.id];
        if (token !== undefined) {
          const x = historyStartX + roundIdx * historySpacing;
          const miniToken = this.add.circle(x, historyY, historySize, ROUND_COLORS[round.phase] || 0xcccccc);
          miniToken.setStrokeStyle(1, 0x000000);
          container.add(miniToken);

          const tokenText = this.add.text(x, historyY, token.toString(), {
            fontFamily: 'Arial',
            fontSize: historyFontSize,
            color: '#000000'
          }).setOrigin(0.5);
          container.add(tokenText);
        }
      });
    }

    return container;
  }

  updateButtons() {
    if (this.gameState.phase === GAME_PHASES.WAITING) {
      this.startButton.setVisible(true);
      this.readyButton.setVisible(false);
    } else if (this.gameState.phase.includes('betting')) {
      this.startButton.setVisible(false);
      // Only show ready button if all players have tokens
      const canReady = this.gameState.allPlayersHaveTokens;
      this.readyButton.setVisible(canReady);
    } else {
      this.startButton.setVisible(false);
      this.readyButton.setVisible(false);
    }

    // Update status
    if (this.gameState.currentTurn === NetworkManager.playerId) {
      this.statusText.setText('Your turn to select a token');
    } else if (this.gameState.phase.includes('betting')) {
      const currentPlayer = this.gameState.players.find(p => p.id === this.gameState.currentTurn);
      if (!this.gameState.allPlayersHaveTokens) {
        this.statusText.setText(`Waiting for all players to select tokens...`);
      } else {
        this.statusText.setText(`Waiting for ${currentPlayer?.name || 'player'}...`);
      }
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

    // Determine color based on round - tokens in current round use round color
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
    // Note: Removed the grey color for unavailable tokens - they keep round color

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
