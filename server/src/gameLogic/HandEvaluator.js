import pkg from 'pokersolver';
const { Hand } = pkg;
import { Deck } from './Deck.js';

/**
 * HandEvaluator - Wrapper around pokersolver library
 * Evaluates poker hands and determines rankings
 */
export class HandEvaluator {
  /**
   * Evaluate a player's best 5-card hand from pocket cards + community cards
   * @param {Array} pocketCards - Player's 2 pocket cards [{rank, suit}, ...]
   * @param {Array} communityCards - 5 community cards [{rank, suit}, ...]
   * @returns {Object} Hand result with rank and description
   */
  static evaluateHand(pocketCards, communityCards) {
    const allCards = [...pocketCards, ...communityCards];
    const cardStrings = Deck.cardsToStrings(allCards);

    // pokersolver automatically finds the best 5-card hand
    const hand = Hand.solve(cardStrings);

    return {
      hand: hand,
      name: hand.name,
      description: hand.descr,
      cards: hand.cards,
      rank: hand.rank
    };
  }

  /**
   * Compare multiple player hands and return them sorted from weakest to strongest
   * @param {Array} playerHands - Array of {playerId, pocketCards, communityCards}
   * @returns {Array} Sorted array of player results with rankings
   */
  static rankHands(playerHands, communityCards) {
    // Evaluate each player's hand
    const evaluatedHands = playerHands.map(player => {
      const evaluation = HandEvaluator.evaluateHand(player.pocketCards, communityCards);
      return {
        playerId: player.playerId,
        playerName: player.playerName,
        pocketCards: player.pocketCards,
        evaluation: evaluation,
        hand: evaluation.hand
      };
    });

    // Sort from weakest to strongest
    // pokersolver's Hand objects can be compared directly
    evaluatedHands.sort((a, b) => {
      const winners = Hand.winners([a.hand, b.hand]);
      if (winners.length === 2) return 0; // Tie
      if (winners[0] === a.hand) return 1; // a is stronger
      return -1; // b is stronger
    });

    // Add rank numbers (1 = weakest)
    return evaluatedHands.map((player, index) => ({
      ...player,
      rank: index + 1
    }));
  }

  /**
   * Check if player token assignments match actual hand rankings
   * @param {Array} rankedHands - Output from rankHands()
   * @param {Object} tokenAssignments - Map of playerId -> token number
   * @returns {Object} {success: boolean, errors: Array}
   */
  static validateTokenAssignments(rankedHands, tokenAssignments) {
    const errors = [];

    for (const playerHand of rankedHands) {
      const playerId = playerHand.playerId;
      const actualRank = playerHand.rank;
      const assignedToken = tokenAssignments[playerId];

      if (actualRank !== assignedToken) {
        errors.push({
          playerId,
          playerName: playerHand.playerName,
          actualRank,
          assignedToken,
          hand: playerHand.evaluation.description
        });
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }
}
