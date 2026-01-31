import './Card.css';
import { useSettings } from '../context/SettingsContext';

const SUIT_SYMBOLS = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠'
};

const Card = ({ card, isInBestHand = false, size = 'normal' }) => {
  const { cardStyleId, swapFrontBack, useWhiteText } = useSettings();

  if (!card) return null;

  const needsWhiteText = useWhiteText();
  const sizeClass = size === 'small' ? 'card-small' : '';

  // Build CSS class names for card style
  const faceClass = `card-face-${cardStyleId}`;
  const textClass = `card-text-${cardStyleId}`;
  const swapClass = swapFrontBack ? 'card-swapped' : '';

  // Determine suit color based on card face background
  const getSuitColor = (suit) => {
    if (suit === 'h' || suit === 'd') {
      return '#ff0000'; // red suits always red
    }
    // Black suits: white on dark backgrounds, black on light backgrounds
    return needsWhiteText ? '#ffffff' : '#000000';
  };

  return (
    <div
      className={`card ${isInBestHand ? 'card-highlighted' : ''} ${sizeClass} ${faceClass} ${swapClass}`}
    >
      <span
        className={`card-text ${textClass}`}
        style={{ color: getSuitColor(card.suit) }}
      >
        {card.rank}{SUIT_SYMBOLS[card.suit]}
      </span>
    </div>
  );
};

export const CardBack = ({ size = 'small' }) => {
  const { cardStyleId, swapFrontBack } = useSettings();
  const sizeClass = size === 'small' ? 'card-back-small' : '';
  const backClass = `card-back-${cardStyleId}`;
  const swapClass = swapFrontBack ? 'card-swapped' : '';

  return (
    <div className={`card-back ${sizeClass} ${backClass} ${swapClass}`} />
  );
};

export default Card;
