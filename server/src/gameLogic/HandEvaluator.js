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

    // Group tied hands and assign ranks
    // Players with identical hands get the same rank (the minimum rank in their group)
    const rankedHands = [];
    let currentRank = 1;
    let i = 0;

    while (i < evaluatedHands.length) {
      // Find all players tied with the current player
      const tiedPlayers = [evaluatedHands[i]];

      for (let j = i + 1; j < evaluatedHands.length; j++) {
        const winners = Hand.winners([evaluatedHands[i].hand, evaluatedHands[j].hand]);
        if (winners.length === 2) {
          // These hands are tied
          tiedPlayers.push(evaluatedHands[j]);
        } else {
          // No more ties
          break;
        }
      }

      // All tied players get the same rank
      for (const player of tiedPlayers) {
        rankedHands.push({
          ...player,
          rank: currentRank
        });
      }

      // Next rank is current rank + number of tied players
      currentRank += tiedPlayers.length;
      i += tiedPlayers.length;
    }

    return rankedHands;
  }

  /**
   * Check if player token assignments match actual hand rankings
   * Handles ties: players with identical hands can choose any token within the tie group's range
   * @param {Array} rankedHands - Output from rankHands()
   * @param {Object} tokenAssignments - Map of playerId -> token number
   * @returns {Object} {success: boolean, errors: Array}
   */
  static validateTokenAssignments(rankedHands, tokenAssignments) {
    const errors = [];

    // Group players by their rank (to find ties)
    const rankGroups = {};
    for (const playerHand of rankedHands) {
      const rank = playerHand.rank;
      if (!rankGroups[rank]) {
        rankGroups[rank] = [];
      }
      rankGroups[rank].push(playerHand);
    }

    // For each player, check if their token is valid
    for (const playerHand of rankedHands) {
      const playerId = playerHand.playerId;
      const actualRank = playerHand.rank;
      const assignedToken = tokenAssignments[playerId];

      // Find all players with the same rank (tied players)
      const tiedPlayers = rankGroups[actualRank];

      if (tiedPlayers.length === 1) {
        // No tie - must match exactly
        if (actualRank !== assignedToken) {
          errors.push({
            playerId,
            playerName: playerHand.playerName,
            actualRank,
            assignedToken,
            hand: playerHand.evaluation.description
          });
        }
      } else {
        // Tie - token must be within the valid range for this tie group
        // Valid range is [actualRank, actualRank + tiedPlayers.length - 1]
        const minValidToken = actualRank;
        const maxValidToken = actualRank + tiedPlayers.length - 1;

        if (assignedToken < minValidToken || assignedToken > maxValidToken) {
          errors.push({
            playerId,
            playerName: playerHand.playerName,
            actualRank,
            assignedToken,
            hand: playerHand.evaluation.description,
            validRange: `${minValidToken}-${maxValidToken}`
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }
}
