import { Hand } from 'pokersolver';

/**
 * Client-side hand evaluator
 */
export class HandEvaluator {
  /**
   * Evaluate best 5-card hand from pocket + community cards
   * @param {Array} pocketCards - [{rank, suit}, ...]
   * @param {Array} communityCards - [{rank, suit}, ...]
   * @returns {Object} {hand, name, description, cards}
   */
  static evaluateHand(pocketCards, communityCards) {
    if (!pocketCards || pocketCards.length === 0) {
      return null;
    }

    if (!communityCards || communityCards.length === 0) {
      // Pre-flop: just show high card
      const cardStrings = pocketCards.map(c => `${c.rank}${c.suit}`);
      const hand = Hand.solve(cardStrings);
      return {
        hand,
        name: hand.name,
        description: hand.descr,
        cards: hand.cards.map(c => c.value)
      };
    }

    const allCards = [...pocketCards, ...communityCards];
    const cardStrings = allCards.map(c => `${c.rank}${c.suit}`);

    const hand = Hand.solve(cardStrings);

    return {
      hand,
      name: hand.name,
      description: hand.descr,
      cards: hand.cards.map(c => c.value) // e.g., ["Ah", "Kh", ...]
    };
  }

  /**
   * Check if a card is in the best hand
   */
  static isCardInBestHand(card, bestHandCards) {
    if (!bestHandCards) return false;
    const cardStr = `${card.rank}${card.suit}`;
    return bestHandCards.includes(cardStr);
  }
}
