import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

// Card face options: maps identifier to display name
// Styling is handled in Card.css with classes like .card-face-white, .card-face-pale-blue, etc.
const CARD_FACE_OPTIONS = {
  white: 'White',
  pale_blue: 'Pale Blue'
};

// Card back options: maps identifier to display name and image path
const CARD_BACK_OPTIONS = {
  default: { name: 'Default', image: '/assets/card_back_1.jpg' },
  bowling_alley_carpet_1: { name: 'Bowling Alley Carpet 1', image: '/assets/card_back_bowling_alley_carpet_1.png' },
  bowling_alley_carpet_2: { name: 'Bowling Alley Carpet 2', image: '/assets/card_back_bowling_alley_carpet_2.png' },
  bunch_of_circles_1: { name: 'Bunch of Circles 1', image: '/assets/card_back_bunch_of_circles_1.png' },
  bunch_of_circles_2: { name: 'Bunch of Circles 2', image: '/assets/card_back_bunch_of_circles_2.png' },
  cyberpunk_1: { name: 'Cyberpunk 1', image: '/assets/card_back_cyberpunk_1.png' },
  cyberpunk_2: { name: 'Cyberpunk 2', image: '/assets/card_back_cyberpunk_2.png' },
  ole_west_1: { name: 'Ole West 1', image: '/assets/card_back_ole_west_1.png' },
  ole_west_2: { name: 'Ole West 2', image: '/assets/card_back_ole_west_2.png' },
  persona: { name: 'Persona', image: '/assets/card_back_persona.png' },
  persona_2: { name: 'Persona 2', image: '/assets/card_back_persona_2.png' },
  weeb_1: { name: 'Weeb 1', image: '/assets/card_back_weeb_1.png' },
  weeb_2: { name: 'Weeb 2', image: '/assets/card_back_weeb_2.png' }
};

export const SettingsProvider = ({ children }) => {
  const [cardFaceId, setCardFaceId] = useState(() => {
    const saved = localStorage.getItem('cardFace');
    return saved && CARD_FACE_OPTIONS[saved] ? saved : 'white';
  });

  const [cardBackId, setCardBackId] = useState(() => {
    const saved = localStorage.getItem('cardBack');
    return saved && CARD_BACK_OPTIONS[saved] ? saved : 'default';
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
    localStorage.setItem('cardBack', cardBackId);
  }, [cardBackId]);

  useEffect(() => {
    localStorage.setItem('useNumberedTokens', useNumberedTokens);
  }, [useNumberedTokens]);

  const value = {
    cardFaceId,
    setCardFaceId,
    CARD_FACE_OPTIONS,
    cardBackId,
    setCardBackId,
    CARD_BACK_OPTIONS,
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
