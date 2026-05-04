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
    description: 'Vamos a conocer las funciones clave de MathQuest para que domines el juego.',
    icon: 'hand-paper',
    color: '#8A56FE',
    area: 'middle',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: null
  },
  {
    id: 'play_tab',
    title: 'PANTALLA DE 1vs1',
    description: 'Este es el acceso principal. Púlsalo en cualquier momento para volver a la zona de duelos competitivos.',
    icon: 'gamepad',
    color: '#FF3D3D',
    area: 'middle',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: { x: width * 0.25, y: height - 85, w: width * 0.25, h: 85, radius: 0 }
  },
  {
    id: 'my_rank',
    title: 'SISTEMA DE LIGAS',
    description: 'Toca tu medalla para conocer todas las divisiones y ver cuánto te falta para subir de nivel.',
    icon: 'medal',
    color: '#FFD45E',
    area: 'middle',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: { x: 20, y: 150, w: 220, h: 60, radius: 25 }
  },
  {
    id: 'global_ranking',
    title: 'TABLA DE POSICIONES',
    description: 'Presiona la sección de Ranking para ver el Top 100 mundial y comparar tus puntos ELO.',
    icon: 'trophy',
    color: '#FFD61E',
    area: 'top',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: { x: width - 140, y: height - 100, w: 120, h: 50, radius: 25 }
  },
  {
    id: 'competitive',
    title: 'MODO COMPETITIVO',
    description: 'Entra aquí para buscar un oponente en tiempo real y demostrar tu agilidad mental.',
    icon: 'fire',
    color: '#FF3D3D',
    area: 'top',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: { x: 20, y: height * 0.45, w: width - 40, h: 100, radius: 30 }
  },
  {
    id: 'how_to_play',
    title: 'REGLAS Y MECÁNICAS',
    description: 'Si tienes dudas, consulta este apartado para aprender cómo funcionan las rondas.',
    icon: 'question-circle',
    color: '#AD1DEB',
    area: 'top',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: { x: 20, y: height * 0.45 + 120, w: width - 40, h: 50, radius: 15 }
  },
  {
    id: 'extras',
    title: 'PRÁCTICA Y DESAFÍOS',
    description: 'Explora modos de juego adicionales diseñados para mejorar tu velocidad mental.',
    icon: 'plus-circle',
    color: '#31C45A',
    area: 'middle',
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: { x: 0, y: height - 85, w: width * 0.25, h: 85, radius: 0 }
  },
  {
    id: 'infinite_streak',
    title: 'TU RACHA DIARIA',
    description: 'Juega una partida aquí cada día para aumentar tu racha. ¡No dejes que se apague el fuego!',
    icon: 'fire',
    color: '#FF7A00',
    area: 'middle',
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: { x: width - 80, y: 50, w: 70, h: 50, radius: 15 }
  },
  {
    id: 'infinite_30s',
    title: 'DESAFÍO DE 30 SEGUNDOS',
    description: 'Resuelve operaciones variadas lo más rápido posible antes de que se agote el tiempo.',
    icon: 'clock',
    color: '#C44569',
    area: 'middle',
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: { x: 20, y: 300, w: width - 40, h: 80, radius: 20 }
  },
  {
    id: 'store',
    title: 'TIENDA DE OBJETOS',
    description: 'Visita la tienda para canjear tus monedas por nuevos avatares y efectos exclusivos.',
    icon: 'shopping-cart',
    color: '#FFD45E',
    area: 'middle',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: { x: width * 0.5, y: height - 85, w: width * 0.25, h: 85, radius: 0 }
  },
  {
    id: 'profile',
    title: 'GESTIÓN DE PERFIL',
    description: 'Accede a tu cuenta para personalizar tu nombre y configurar tu identidad.',
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
      setTimeout(() => {
        setIsVisible(true);
        setCurrentStepIndex(0);
        router.push(TUTORIAL_STEPS[0].targetScreen as any);
      }, 3000);
      return;
    }

    const hasSeen = await AsyncStorage.getItem('hasSeenGuidedTour_v18');
    if (hasSeen === null) {
      setTimeout(() => {
        setIsVisible(true);
        router.push(TUTORIAL_STEPS[0].targetScreen as any);
      }, 3000);
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
      const currentStepData = TUTORIAL_STEPS[currentStepIndex];
      const nextStepData = TUTORIAL_STEPS[nextIndex];
      
      if (nextStepData.targetScreen !== currentStepData.targetScreen) {
        // Navegar y esperar a que cargue la nueva pantalla antes de subir el index
        router.push(nextStepData.targetScreen as any);
        setTimeout(() => {
          setCurrentStepIndex(nextIndex);
        }, 800);
      } else {
        setCurrentStepIndex(nextIndex);
      }
    } else {
      finish();
    }
  };

  const skipTutorial = () => {
    finish();
  };

  const finish = async () => {
    await AsyncStorage.setItem('hasSeenGuidedTour_v18', 'true');
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
