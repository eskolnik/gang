import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import './SettingsMenu.css';

const SettingsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { cardFaceId, setCardFaceId, CARD_FACE_OPTIONS, useStarTokens, setUseStarTokens } = useSettings();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleCardFaceChange = (optionId) => {
    setCardFaceId(optionId);
  };

  const handleStarTokensChange = () => {
    setUseStarTokens(!useStarTokens);
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
            <label className="settings-checkbox-option">
              <input
                type="checkbox"
                checked={useStarTokens}
                onChange={handleStarTokensChange}
              />
              <span>Use stars on tokens</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
