// contexts/FontContext.tsx
import { useFonts } from 'expo-font';
import React, { createContext, useContext, useEffect } from 'react';

const FontContext = createContext({ fontsLoaded: false });


export function FontProvider({ children }: { children: React.ReactNode }) {
  const [fontsLoaded] = useFonts({
    Digitalt: require('@/assets/fonts/Digitalt.otf'),
    'Gilroy-Black': require('@/assets/fonts/Gilroy-Black.ttf'),
    'Gilroy-SemiBold': require('@/assets/fonts/Gilroy-SemiBold.ttf'),
  });

  useEffect(() => {
    // Fonts are loaded, the root layout will handle splash screen hiding
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <FontContext.Provider value={{ fontsLoaded }}>
      {children}
    </FontContext.Provider>
  );
}

export const useFontContext = () => useContext(FontContext);
