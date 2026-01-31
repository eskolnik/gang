import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

const DEFAULT_CARD_STYLE = 'ole_west'

// Card style options: pairs face and back images
// image1 is used for back by default, image2 is used for face by default
// When swapped: image2 is back, image1 is face
const CARD_STYLE_OPTIONS = {
  bowling_alley_carpet: {
    name: 'Bowling Alley Carpet',
    image1: '/assets/card_back_bowling_alley_carpet_1.png',
    image2: '/assets/card_back_bowling_alley_carpet_2.png'
  },
  bunch_of_circles: {
    name: 'Bunch of Circles',
    image1: '/assets/card_back_bunch_of_circles_1.png',
    image2: '/assets/card_back_bunch_of_circles_2.png'
  },
  cyberpunk: {
    name: 'Cyberpunk',
    image1: '/assets/card_back_cyberpunk_1.png',
    image2: '/assets/card_back_cyberpunk_2.png'
  },
  ole_west: {
    name: 'Ole West',
    image1: '/assets/card_back_ole_west_2.png',
    image2: '/assets/card_back_ole_west_1.png'
  },
  persona: {
    name: 'Persona',
    image1: '/assets/card_back_persona.png',
    image2: '/assets/card_back_persona_2.png'
  },
  weeb: {
    name: 'Weeb',
    image1: '/assets/card_back_weeb_1.png',
    image2: '/assets/card_back_weeb_2.png'
  }
};

// Images that require white text for spades/clubs when used as card face
const DARK_FACE_IMAGES = [
  '/assets/card_back_persona.png', // Persona 1
  '/assets/card_back_ole_west_2.png', // Ole West 2
  '/assets/card_back_bunch_of_circles_1.png',
  '/assets/card_back_bunch_of_circles_2.png',
  '/assets/card_back_bowling_alley_carpet_1.png',
  '/assets/card_back_bowling_alley_carpet_2.png',
  '/assets/card_back_weeb_1.png',
  '/assets/card_back_weeb_2.png',
  '/assets/card_back_cyberpunk_1.png', // Cyberpunk 1
  '/assets/card_back_cyberpunk_2.png'  // Cyberpunk 2
];

export const SettingsProvider = ({ children }) => {
  const [cardStyleId, setCardStyleId] = useState(() => {
    const saved = localStorage.getItem('cardStyle');
    // Migrate from old cardFace setting
    if (!saved) {
      const oldFace = localStorage.getItem('cardFace');
      // Migrate white/pale_blue to standard
      if (oldFace === 'white' || oldFace === 'pale_blue') {
        return DEFAULT_CARD_STYLE;
      }
      if (oldFace && CARD_STYLE_OPTIONS[oldFace]) {
        return oldFace;
      }
    }
    // Migrate white to standard if somehow saved
    if (saved === 'white' || saved === 'pale_blue') {
      return DEFAULT_CARD_STYLE;
    }
    return saved && CARD_STYLE_OPTIONS[saved] ? saved : DEFAULT_CARD_STYLE;
  });

  const [swapFrontBack, setSwapFrontBack] = useState(() => {
    const saved = localStorage.getItem('swapFrontBack');
    return saved === 'true';
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
    localStorage.setItem('cardStyle', cardStyleId);
  }, [cardStyleId]);

  useEffect(() => {
    localStorage.setItem('swapFrontBack', swapFrontBack);
  }, [swapFrontBack]);

  useEffect(() => {
    localStorage.setItem('useNumberedTokens', useNumberedTokens);
  }, [useNumberedTokens]);

  // Helper to get the current face/back images based on style and swap state
  const getCardImages = () => {
    const style = CARD_STYLE_OPTIONS[cardStyleId];
    if (!style) return { faceImage: null, backImage: null };

    const faceImage = swapFrontBack ? style.image1 : style.image2;
    const backImage = swapFrontBack ? style.image2 : style.image1;

    return { faceImage, backImage };
  };

  // Helper to check if current face needs white text for spades/clubs
  const useWhiteText = () => {
    const { faceImage } = getCardImages();
    return faceImage && DARK_FACE_IMAGES.includes(faceImage);
  };

  const value = {
    cardStyleId,
    setCardStyleId,
    swapFrontBack,
    setSwapFrontBack,
    CARD_STYLE_OPTIONS,
    getCardImages,
    useWhiteText,
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
