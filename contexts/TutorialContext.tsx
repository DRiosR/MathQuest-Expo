import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAuth } from './AuthContext';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export type SpotlightPos = {
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
};

type TutorialStep = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  area: 'top' | 'middle' | 'bottom' | 'tabs';
  targetScreen: string;
  defaultSpotlight: SpotlightPos | null;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '¡BIENVENIDO!',
    description: 'He activado el sistema de "Auto-Calibración" para que el foco sea perfecto.',
    icon: 'hand-paper',
    color: '#8A56FE',
    area: 'middle',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: null
  },
  {
    id: 'my_rank',
    title: 'TU RANGO',
    description: 'Aquí ves tu liga. ¡Sube de nivel para desbloquear nuevos desafíos!',
    icon: 'medal',
    color: '#FFD45E',
    area: 'middle',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: { x: 20, y: 150, w: 220, h: 60, radius: 25 }
  },
  {
    id: 'global_ranking',
    title: 'RANKING GLOBAL',
    description: 'Mira quiénes lideran el mundo. ¡El botón amarillo te lleva al Top!',
    icon: 'trophy',
    color: '#FFD61E',
    area: 'top',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: { x: width - 140, y: height - 100, w: 120, h: 50, radius: 25 }
  },
  {
    id: 'competitive',
    title: 'DUELOS 1vs1',
    description: '¡El gran botón rojo! Aquí es donde empieza la acción de verdad.',
    icon: 'fire',
    color: '#FF3D3D',
    area: 'top',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: { x: 20, y: height * 0.45, w: width - 40, h: 100, radius: 30 }
  },
  {
    id: 'how_to_play',
    title: '¿CÓMO JUGAR?',
    description: 'El botón morado te explica todo lo que necesitas saber antes de empezar.',
    icon: 'question-circle',
    color: '#AD1DEB',
    area: 'top',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: { x: 20, y: height * 0.45 + 120, w: width - 40, h: 50, radius: 15 }
  },
  {
    id: 'extras',
    title: 'EXTRAS',
    description: 'Modos adicionales para practicar tus habilidades.',
    icon: 'plus-circle',
    color: '#31C45A',
    area: 'middle',
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: { x: 0, y: height - 85, w: width * 0.25, h: 85, radius: 0 }
  },
  {
    id: 'store',
    title: 'TIENDA',
    description: 'Personaliza tu avatar con los objetos de la tienda.',
    icon: 'shopping-cart',
    color: '#FFD45E',
    area: 'middle',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: { x: width * 0.5, y: height - 85, w: width * 0.25, h: 85, radius: 0 }
  },
  {
    id: 'profile',
    title: 'PERFIL',
    description: 'Toda tu información de jugador en un solo lugar.',
    icon: 'user-cog',
    color: '#FF46A5',
    area: 'middle',
    targetScreen: '/(tabs)/user',
    defaultSpotlight: { x: width * 0.75, y: height - 85, w: width * 0.25, h: 85, radius: 0 }
  }
];

interface TutorialContextType {
  isVisible: boolean;
  currentStepIndex: number;
  dynamicSpotlights: Record<string, SpotlightPos>;
  setDynamicSpotlight: (id: string, pos: SpotlightPos) => void;
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dynamicSpotlights, setDynamicSpotlights] = useState<Record<string, SpotlightPos>>({});
  const { user } = useAuth();

  useEffect(() => {
    checkFirstTime();
  }, [user?.email]);

  const checkFirstTime = async () => {
    if (!user?.email) return;

    if (user.email.toLowerCase() === 'daniel.ext1@gmail.com') {
      setIsVisible(true);
      setCurrentStepIndex(0);
      router.push(TUTORIAL_STEPS[0].targetScreen as any);
      return;
    }

    const hasSeen = await AsyncStorage.getItem('hasSeenGuidedTour_v11');
    if (hasSeen === null) {
      setTimeout(() => {
        setIsVisible(true);
        router.push(TUTORIAL_STEPS[0].targetScreen as any);
      }, 1500);
    }
  };

  const setDynamicSpotlight = (id: string, pos: SpotlightPos) => {
    setDynamicSpotlights(prev => ({ ...prev, [id]: pos }));
  };

  const startTutorial = () => {
    setCurrentStepIndex(0);
    setIsVisible(true);
    router.push('/(tabs)/play');
  };

  const nextStep = () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const nextStepData = TUTORIAL_STEPS[nextIndex];
      
      if (nextStepData.targetScreen !== TUTORIAL_STEPS[currentStepIndex].targetScreen) {
        router.push(nextStepData.targetScreen as any);
      }
      
      setCurrentStepIndex(nextIndex);
    } else {
      finish();
    }
  };

  const skipTutorial = () => {
    finish();
  };

  const finish = async () => {
    await AsyncStorage.setItem('hasSeenGuidedTour_v11', 'true');
    setIsVisible(false);
  };

  return (
    <TutorialContext.Provider value={{ 
      isVisible, 
      currentStepIndex, 
      dynamicSpotlights, 
      setDynamicSpotlight,
      startTutorial, 
      nextStep, 
      skipTutorial 
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) throw new Error('useTutorial must be used within a TutorialProvider');
  return context;
}
