import './Card.css';
import { useSettings } from '../context/SettingsContext';

const SUIT_SYMBOLS = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠'
};

const Card = ({ card, isInBestHand = false, size = 'normal' }) => {
  const { getCardImages, useWhiteText } = useSettings();

  if (!card) return null;

  const { faceImage } = getCardImages();
  const needsWhiteText = useWhiteText();
  const sizeClass = size === 'small' ? 'card-small' : '';

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
      className={`card ${isInBestHand ? 'card-highlighted' : ''} ${sizeClass}`}
      style={{
        backgroundImage: `url(${faceImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <span className="card-text" style={{ color: getSuitColor(card.suit) }}>
        {card.rank}{SUIT_SYMBOLS[card.suit]}
      </span>
    </div>
  );
};

export const CardBack = ({ size = 'small' }) => {
  const { getCardImages } = useSettings();
  const sizeClass = size === 'small' ? 'card-back-small' : '';
  const { backImage } = getCardImages();

  return (
    <div
      className={`card-back ${sizeClass}`}
      style={{ backgroundImage: `url(${backImage})` }}
    />
  );
};

export default Card;
