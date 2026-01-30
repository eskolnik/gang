import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

// Card face options: maps identifier to display name
// Styling is handled in Card.css with classes like .card-face-white, .card-face-pale-blue, etc.
const CARD_FACE_OPTIONS = {
  white: 'White',
  pale_blue: 'Pale Blue'
};

export const SettingsProvider = ({ children }) => {
  const [cardFaceId, setCardFaceId] = useState(() => {
    const saved = localStorage.getItem('cardFace');
    return saved && CARD_FACE_OPTIONS[saved] ? saved : 'white';
  });

  const [useNumberedTokens, setUseNumberedTokens] = useState(() => {
    const saved = localStorage.getItem('useNumberedTokens');
    // Migrate from old setting name
    if (saved === null) {
      const oldSaved = localStorage.getItem('useStarTokens');
      if (oldSaved !== null) {
        // Invert the old setting: if they had stars enabled, numbered should be disabled
        return oldSaved === 'false';
      }
    }
    return saved === 'true'; // Default is false (stars are default)
  });

  useEffect(() => {
    localStorage.setItem('cardFace', cardFaceId);
  }, [cardFaceId]);

  useEffect(() => {
    localStorage.setItem('useNumberedTokens', useNumberedTokens);
  }, [useNumberedTokens]);

  const value = {
    cardFaceId,
    setCardFaceId,
    CARD_FACE_OPTIONS,
    useNumberedTokens,
    setUseNumberedTokens
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
