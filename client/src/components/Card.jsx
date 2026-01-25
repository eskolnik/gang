import './Card.css';
import { useSettings } from '../context/SettingsContext';

const SUIT_SYMBOLS = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠'
};

const SUIT_COLORS = {
  h: '#ff0000', // red
  d: '#ff0000', // red
  c: '#000000', // black
  s: '#000000'  // black
};

const Card = ({ card, isInBestHand = false, size = 'normal' }) => {
  const { cardFaceId } = useSettings();

  if (!card) return null;

  const sizeClass = size === 'small' ? 'card-small' : '';
  const faceClass = `card-face-${cardFaceId}`;

  return (
    <div
      className={`card ${isInBestHand ? 'card-highlighted' : ''} ${sizeClass} ${faceClass}`}
    >
      <span className="card-text" style={{ color: SUIT_COLORS[card.suit] }}>
        {card.rank}{SUIT_SYMBOLS[card.suit]}
      </span>
    </div>
  );
};

export const CardBack = ({ size = 'small' }) => {
  const sizeClass = size === 'small' ? 'card-back-small' : '';

  return (
    <div className={`card-back ${sizeClass}`} />
  );
};

export default Card;
