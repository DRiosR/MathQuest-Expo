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
  // --- SECCIÓN 1: 1vs1 (Pestaña Play) ---
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
    id: 'my_rank',
    title: 'SISTEMA DE LIGAS',
    description: 'Toca tu medalla para conocer todas las divisiones y ver cuánto te falta para subir de nivel.',
    icon: 'medal',
    color: '#FFD45E',
    area: 'bottom',
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
    id: 'how_to_play',
    title: 'REGLAS Y MECÁNICAS',
    description: 'Si tienes dudas, consulta este apartado para aprender cómo funcionan las rondas.',
    icon: 'question-circle',
    color: '#AD1DEB',
    area: 'top',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: { x: 20, y: height * 0.45 + 120, w: width - 40, h: 50, radius: 15 }
  },

  // --- SECCIÓN 2: MODO INFINITO (Pestaña Extras) ---
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
    id: 'infinite_operation',
    title: '1. ELIGE LA OPERACIÓN',
    description: 'Primero selecciona qué tipo de ejercicios quieres practicar: sumas, restas, multiplicación, división o “todo en uno”.',
    icon: 'calculator',
    color: '#FF6B9D',
    area: 'top', // Changed to top as header is smaller now
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: { x: 20, y: 180, w: width - 40, h: 190, radius: 24 }
  },
  {
    id: 'infinite_time',
    title: '2. SELECCIONA EL TIEMPO',
    description: 'Ahora elige cuánto durará la partida. El juego termina cuando se acaba el tiempo o cometes 3 errores.',
    icon: 'stopwatch',
    color: '#FF6B9D',
    area: 'top',
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: null
  },
  {
    id: 'infinite_difficulty',
    title: '3. AJUSTA LA DIFICULTAD',
    description: 'Escoge el nivel: fácil, medio o difícil. En difícil podrás usar números negativos.',
    icon: 'signal',
    color: '#FF6B9D',
    area: 'top',
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: null
  },
  {
    id: 'infinite_start',
    title: '¡INICIA EL DESAFÍO!',
    description: 'Cuando tengas todo listo, pulsa “EMPEZAR”. Recuerda: tienes 3 vidas y gana quien más acierte antes de que termine el tiempo.',
    icon: 'play',
    color: '#FF6B9D',
    area: 'middle', // Changed from top to middle/center for better positioning
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: null
  },

  // --- SECCIÓN 3: TIENDA (Pestaña Store) ---
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
    id: 'store_coins',
    title: 'TUS MONEDAS',
    description: 'Aquí puedes ver tu saldo actual de MathCoins. ¡Gana partidas para conseguir más!',
    icon: 'coins',
    color: '#FFD45E',
    area: 'bottom',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: { x: width - 100, y: 50, w: 80, h: 40, radius: 20 }
  },
  {
    id: 'store_skin',
    title: 'COLOR DE PIEL',
    description: 'Toca este icono para elegir entre diferentes tonos y colores de piel para tu avatar.',
    icon: 'user',
    color: '#EBDDFF',
    area: 'bottom',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: { x: 20, y: 350, w: 50, h: 50, radius: 25 }
  },
  {
    id: 'store_hair',
    title: 'CORTES DE PELO',
    description: 'Aquí puedes probarte diferentes peinados y estilos de cabello.',
    icon: 'cut',
    color: '#EBDDFF',
    area: 'bottom',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: { x: 80, y: 350, w: 50, h: 50, radius: 25 }
  },
  {
    id: 'store_eyes',
    title: 'ESTILO DE OJOS',
    description: 'Cambia la mirada de tu personaje seleccionando diferentes tipos de ojos.',
    icon: 'eye',
    color: '#EBDDFF',
    area: 'bottom',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: { x: 140, y: 350, w: 50, h: 50, radius: 25 }
  },
  {
    id: 'store_mouth',
    title: 'EXPRESIÓN DE BOCA',
    description: 'Personaliza la sonrisa o la expresión facial de tu avatar desde aquí.',
    icon: 'smile',
    color: '#EBDDFF',
    area: 'bottom',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: { x: 200, y: 350, w: 50, h: 50, radius: 25 }
  },
  {
    id: 'store_clothes',
    title: 'ROPA Y CAMISAS',
    description: '¡Viste a tu avatar con las mejores camisas y atuendos de la tienda!',
    icon: 'tshirt',
    color: '#EBDDFF',
    area: 'bottom',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: { x: 260, y: 350, w: 50, h: 50, radius: 25 }
  },

  // --- SECCIÓN 4: PERFIL (Pestaña User) ---
  {
    id: 'profile',
    title: 'GESTIÓN DE PERFIL',
    description: 'Accede a tu cuenta para personalizar tu nombre y configurar tu identidad.',
    icon: 'user-cog',
    color: '#FF46A5',
    area: 'middle',
    targetScreen: '/(tabs)/user',
    defaultSpotlight: { x: width * 0.75, y: height - 85, w: width * 0.25, h: 85, radius: 0 }
  },
  {
    id: 'profile_settings',
    title: 'CONFIGURACIÓN',
    description: 'En este menú podrás cambiar tu nombre de usuario y actualizar tu contraseña de forma segura.',
    icon: 'cog',
    color: '#A855F7',
    area: 'bottom',
    targetScreen: '/(tabs)/user',
    defaultSpotlight: { x: width - 60, y: 30, w: 50, h: 50, radius: 25 }
  },
  {
    id: 'profile_avatar',
    title: 'TU AVATAR',
    description: 'Toca tu foto de perfil para volver a la pantalla de edición y cambiar tu look cuando quieras.',
    icon: 'user-circle',
    color: '#A855F7',
    area: 'bottom',
    targetScreen: '/(tabs)/user',
    defaultSpotlight: { x: width / 2 - 60, y: 150, w: 120, h: 120, radius: 60 }
  },
  {
    id: 'profile_streak',
    title: 'RACHA DIARIA',
    description: '¡Mantén vivo el fuego! Al jugar una partida se activa tu racha. Tienes que jugar a diario para mantenerla y que no se apague.',
    icon: 'fire',
    color: '#FF9500',
    area: 'bottom',
    targetScreen: '/(tabs)/user',
    defaultSpotlight: null
  },
  {
    id: 'profile_matches',
    title: 'PARTIDAS RECIENTES',
    description: 'Consulta aquí el historial de tus últimos duelos, tus victorias y tus derrotas contra otros jugadores.',
    icon: 'history',
    color: '#A855F7',
    area: 'top',
    targetScreen: '/(tabs)/user',
    defaultSpotlight: { x: 20, y: 400, w: width - 40, h: 100, radius: 20 }
  }
];

export type TutorialSection = 'initial' | '1vs1' | 'infinite' | 'store' | 'profile';

interface TutorialContextType {
  isVisible: boolean;
  currentStepIndex: number;
  lastStepIndex: number; // Added to help UI logic
  dynamicSpotlights: Record<string, SpotlightPos>;
  setDynamicSpotlight: (id: string, pos: SpotlightPos) => void;
  startTutorial: (section?: TutorialSection) => void;
  nextStep: () => void;
  skipTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lastStepIndex, setLastStepIndex] = useState(TUTORIAL_STEPS.length - 1);
  const [dynamicSpotlights, setDynamicSpotlights] = useState<Record<string, SpotlightPos>>({});
  const { user } = useAuth();

  useEffect(() => {
    checkFirstTime();
  }, [user?.email]);

  const checkFirstTime = async () => {
    if (!user?.id) return;

    // Vinculamos la marca al ID del usuario para que sea por cuenta
    const storageKey = `hasSeenInitialTour_v32_${user.id}`;
    const hasSeen = await AsyncStorage.getItem(storageKey);
    
    if (hasSeen === null) {
      console.log(`[Tutorial] Iniciando bienvenida para usuario nuevo: ${user.id}`);
      setTimeout(() => {
        startTutorial('initial');
      }, 2000);
    }
  };

  const setDynamicSpotlight = (id: string, pos: SpotlightPos) => {
    setDynamicSpotlights(prev => ({ ...prev, [id]: pos }));
  };

  const startTutorial = (section: TutorialSection = '1vs1') => {
    let start = 0;
    let end = TUTORIAL_STEPS.length - 1;

    switch (section) {
      case 'initial':
        start = 0;
        end = 10; // 1vs1 + Infinite
        break;
      case '1vs1':
        start = 0;
        end = 5;
        break;
      case 'infinite':
        start = 6;
        end = 10;
        break;
      case 'store':
        start = 11;
        end = 17;
        break;
      case 'profile':
        start = 18;
        end = 22;
        break;
    }

    setCurrentStepIndex(start);
    setLastStepIndex(end);
    setIsVisible(true);
    router.push(TUTORIAL_STEPS[start].targetScreen as any);
  };

  const nextStep = () => {
    if (currentStepIndex < lastStepIndex && currentStepIndex < TUTORIAL_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const currentStepData = TUTORIAL_STEPS[currentStepIndex];
      const nextStepData = TUTORIAL_STEPS[nextIndex];
      
      if (nextStepData && nextStepData.targetScreen !== currentStepData.targetScreen) {
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
    if (user?.id) {
      const storageKey = `hasSeenInitialTour_v32_${user.id}`;
      await AsyncStorage.setItem(storageKey, 'true');
    }
    setIsVisible(false);
  };

  return (
    <TutorialContext.Provider value={{ 
      isVisible, 
      currentStepIndex, 
      lastStepIndex,
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
