import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import './SettingsMenu.css';

const SettingsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    cardStyleId,
    setCardStyleId,
    swapFrontBack,
    setSwapFrontBack,
    CARD_STYLE_OPTIONS,
    getCardImages,
    useNumberedTokens,
    setUseNumberedTokens
  } = useSettings();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleCardStyleChange = (optionId) => {
    setCardStyleId(optionId);
  };

  const handleSwapFrontBack = () => {
    setSwapFrontBack(!swapFrontBack);
  };

  const handleNumberedTokensChange = () => {
    setUseNumberedTokens(!useNumberedTokens);
  };

  return (
    <div className="settings-menu">
      <button className="settings-button" onClick={toggleMenu}>
        <i className='fas fa-gear'/>
      </button>

      {isOpen && (
        <div className="settings-dropdown">
          <div className="settings-header">
            <h3>Settings</h3>
            <button className="close-button" onClick={toggleMenu}>✕</button>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <h4>Card Style: {CARD_STYLE_OPTIONS[cardStyleId]?.name}</h4>
              <div className="card-style-previews">
                <div
                  className="card-back-large-preview"
                  style={{ backgroundImage: `url(${getCardImages().backImage})` }}
                  title="Card Back"
                />
                <div
                  className="card-face-large-preview"
                  style={{
                    backgroundImage: getCardImages().faceImage ? `url(${getCardImages().faceImage})` : 'none',
                    background: getCardImages().faceColor || '#ffffff'
                  }}
                  title="Card Face"
                >
                  <span className="preview-card-text">A♠</span>
                </div>
              </div>
            </div>
            <div className="card-style-options">
              {Object.entries(CARD_STYLE_OPTIONS).map(([id, { name, image1, image2 }]) => (
                <label key={id} className="card-style-option">
                  <input
                    type="radio"
                    name="cardStyle"
                    value={id}
                    checked={cardStyleId === id}
                    onChange={() => handleCardStyleChange(id)}
                  />
                  <div
                    className="card-style-preview"
                    style={{ backgroundImage: `url(${swapFrontBack ? (image2 || image1) : image1})` }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <label className="settings-checkbox-option">
              <input
                type="checkbox"
                checked={swapFrontBack}
                onChange={handleSwapFrontBack}
                disabled={CARD_STYLE_OPTIONS[cardStyleId]?.disableSwap}
              />
              <span>Swap card front and back</span>
            </label>
          </div>

          <div className="settings-section">
            <label className="settings-checkbox-option">
              <input
                type="checkbox"
                checked={useNumberedTokens}
                onChange={handleNumberedTokensChange}
              />
              <span>Use numbered tokens</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
