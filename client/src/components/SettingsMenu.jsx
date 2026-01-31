import { useState } from "react";
import { useSettings } from "../context/SettingsContext";
import "./SettingsMenu.css";

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
    setUseNumberedTokens,
    useWhiteText,
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
        <i className="fas fa-gear" />
      </button>

      {isOpen && (
        <div className="settings-dropdown">
          <div className="settings-header">
            <h3>Settings</h3>
            <button className="close-button" onClick={toggleMenu}>
              ✕
            </button>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <h4>Card Style: {CARD_STYLE_OPTIONS[cardStyleId]?.name}</h4>
              <CardStylePreviews
                backImage={getCardImages().backImage}
                faceImage={getCardImages().faceImage}
                shouldUseWhiteText={useWhiteText()}
              />
            </div>
            <div className="card-style-options">
              {Object.entries(CARD_STYLE_OPTIONS).map(
                ([id, { name, image1, image2 }]) => (
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
                      style={{
                        backgroundImage: `url(${
                          swapFrontBack ? image2 || image1 : image1
                        })`,
                      }}
                    />
                  </label>
                )
              )}
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

const CardStylePreviews = ({
  backImage,
  faceImage,
  shouldUseWhiteText = false,
}) => {
  const { getCardImages } = useSettings();
  const { faceColor } = getCardImages();

  const previewTextClass =
    "preview-card-text" +
    (shouldUseWhiteText ? " preview-card-text__dark-face" : "");

  // Determine face styling - use image if available, otherwise use color
  const faceStyle = {};
  if (faceImage) {
    faceStyle.backgroundImage = `url(${faceImage})`;
  } else if (faceColor) {
    if (faceColor.startsWith('radial-gradient') || faceColor.startsWith('linear-gradient')) {
      faceStyle.background = faceColor;
    } else {
      faceStyle.backgroundColor = faceColor;
    }
  }

  return (
    <div className="card-style-previews">
      <div
        className="card-style-preview-large"
        style={{ backgroundImage: `url(${backImage})` }}
        title="Card Back"
      />
      <div
        className="card-style-preview-large"
        style={faceStyle}
        title="Card Face"
      >
        <span className={previewTextClass}>A♠</span>
      </div>
    </div>
  );
};

export default SettingsMenu;
