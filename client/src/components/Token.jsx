import './Token.css';

const ROUND_COLORS = {
  'betting_1': '#ffffff',  // White (pre-flop)
  'betting_2': '#ffff00',  // Yellow (flop)
  'betting_3': '#ff9900',  // Orange (turn)
  'betting_4': '#ff0000'   // Red (river)
};

const Token = ({ number, isSelected = false, phase = null, onClick = null, size = 'normal' }) => {
  // Determine color based on round
  let color = '#ffd700'; // Default gold
  if (phase && ROUND_COLORS[phase]) {
    color = ROUND_COLORS[phase];
  }

  // Brighten selected tokens slightly
  if (isSelected) {
    // Simple brightness boost
    color = adjustBrightness(color, 40);
  }

  const isClickable = onClick !== null;
  const sizeClass = size === 'small' ? 'token-small' : '';

  return (
    <div
      className={`token ${isSelected ? 'token-selected' : ''} ${isClickable ? 'token-clickable' : ''} ${sizeClass}`}
      onClick={onClick}
      style={{
        backgroundColor: color,
        borderColor: isSelected ? '#000000' : '#333333',
        borderWidth: isSelected ? '5px' : '3px'
      }}
    >
      <span className="token-number">{number}</span>
    </div>
  );
};

// Helper function to adjust brightness
function adjustBrightness(color, amount) {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Adjust
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount);
  b = Math.min(255, b + amount);

  // Convert back to hex
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default Token;
