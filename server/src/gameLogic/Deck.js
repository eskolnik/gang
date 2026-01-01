/**
 * Deck class - Handles card deck creation, shuffling, and dealing
 */
export class Deck {
  static SUITS = ['h', 'd', 'c', 's']; // hearts, diamonds, clubs, spades
  static RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

  // Unicode symbols for display
  static SUIT_SYMBOLS = {
    'h': '♥',
    'd': '♦',
    'c': '♣',
    's': '♠'
  };

  constructor() {
    this.cards = [];
    this.reset();
  }

  /**
   * Reset deck to full 52 cards
   */
  reset() {
    this.cards = [];
    for (const suit of Deck.SUITS) {
      for (const rank of Deck.RANKS) {
        this.cards.push({ rank, suit });
      }
    }
  }

  /**
   * Shuffle the deck using Fisher-Yates algorithm
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Deal a single card from the deck
   * @returns {Object} Card object {rank, suit}
   */
  deal() {
    if (this.cards.length === 0) {
      throw new Error('Deck is empty');
    }
    return this.cards.pop();
  }

  /**
   * Deal multiple cards
   * @param {number} count - Number of cards to deal
   * @returns {Array} Array of card objects
   */
  dealMultiple(count) {
    if (count > this.cards.length) {
      throw new Error(`Not enough cards in deck. Requested: ${count}, Available: ${this.cards.length}`);
    }
    const dealtCards = [];
    for (let i = 0; i < count; i++) {
      dealtCards.push(this.deal());
    }
    return dealtCards;
  }

  /**
   * Get remaining cards count
   * @returns {number}
   */
  remaining() {
    return this.cards.length;
  }

  /**
   * Convert card to string format for pokersolver library
   * Example: {rank: 'A', suit: 's'} => 'As'
   */
  static cardToString(card) {
    return `${card.rank}${card.suit}`;
  }

  /**
   * Convert card to display string with Unicode symbols
   * Example: {rank: 'A', suit: 's'} => 'A♠'
   */
  static cardToDisplay(card) {
    return `${card.rank}${Deck.SUIT_SYMBOLS[card.suit]}`;
  }

  /**
   * Convert multiple cards to pokersolver format
   */
  static cardsToStrings(cards) {
    return cards.map(card => Deck.cardToString(card));
  }
}
