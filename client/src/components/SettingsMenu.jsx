import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import './SettingsMenu.css';

const SettingsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    cardFaceId,
    setCardFaceId,
    CARD_FACE_OPTIONS,
    cardBackId,
    setCardBackId,
    CARD_BACK_OPTIONS,
    useNumberedTokens,
    setUseNumberedTokens
  } = useSettings();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleCardFaceChange = (optionId) => {
    setCardFaceId(optionId);
  };

  const handleCardBackChange = (optionId) => {
    setCardBackId(optionId);
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
            <h4>Card Style: {CARD_FACE_OPTIONS[cardFaceId]}</h4>
            <div className="settings-options">
              {Object.entries(CARD_FACE_OPTIONS).map(([id, displayName]) => (
                <label key={id} className="settings-option">
                  <input
                    type="radio"
                    name="cardFace"
                    className={`card-face-preview card-face-preview-${id}`}
                    value={id}
                    checked={cardFaceId === id}
                    onChange={() => handleCardFaceChange(id)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <h4>Card Back: {CARD_BACK_OPTIONS[cardBackId]?.name}</h4>
              <div
                className="card-back-large-preview"
                style={{ backgroundImage: `url(${CARD_BACK_OPTIONS[cardBackId]?.image})` }}
              />
            </div>
            <div className="card-back-options">
              {Object.entries(CARD_BACK_OPTIONS).map(([id, { name, image }]) => (
                <label key={id} className="card-back-option">
                  <input
                    type="radio"
                    name="cardBack"
                    value={id}
                    checked={cardBackId === id}
                    onChange={() => handleCardBackChange(id)}
                  />
                  <div
                    className="card-back-preview"
                    style={{ backgroundImage: `url(${image})` }}
                  />
                </label>
              ))}
            </div>
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
