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
    title: '¡HOLA!',
    description: 'Te enseñaremos lo básico para que puedas empezar a jugar y mejorar tus habilidades matemáticas.',
    icon: 'hand-paper',
    color: '#8A56FE',
    area: 'middle',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: null
  },
  {
    id: 'play_tab',
    title: 'DUELOS 1vs1',
    description: 'Aquí encontrarás el acceso principal a los duelos competitivos contra otros jugadores.',
    icon: 'gamepad',
    color: '#FF3D3D',
    area: 'middle',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: { x: width * 0.25, y: height - 85, w: width * 0.25, h: 85, radius: 0 }
  },
  {
    id: 'competitive',
    title: 'MODO COMPETITIVO',
    description: 'Busca un oponente en tiempo real y resuelve operaciones rápidamente para ganar puntos.',
    icon: 'fire',
    color: '#FF3D3D',
    area: 'top',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: null
  },
  {
    id: 'my_rank',
    title: 'TU LIGA',
    description: 'Consulta tu división actual y los puntos que necesitas para subir al siguiente nivel.',
    icon: 'medal',
    color: '#FFD45E',
    area: 'bottom',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: null
  },
  {
    id: 'global_ranking',
    title: 'RANKING GLOBAL',
    description: 'Mira quiénes son los mejores jugadores del mundo y compara tu posición en la tabla.',
    icon: 'trophy',
    color: '#FFD61E',
    area: 'top',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: null
  },
  {
    id: 'how_to_play',
    title: 'CÓMO JUGAR',
    description: 'Si tienes dudas sobre las reglas o mecánicas de los duelos, consulta esta sección.',
    icon: 'question-circle',
    color: '#AD1DEB',
    area: 'top',
    targetScreen: '/(tabs)/play',
    defaultSpotlight: null
  },

  // --- SECCIÓN 2: MODO INFINITO (Pestaña Extras) ---
  {
    id: 'extras',
    title: 'ENTRENAMIENTO',
    description: 'Practica sin presión para mejorar tu velocidad antes de entrar a un duelo real.',
    icon: 'dumbbell',
    color: '#31C45A',
    area: 'middle',
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: { x: 0, y: height - 85, w: width * 0.25, h: 85, radius: 0 }
  },
  {
    id: 'infinite_operation',
    title: 'OPERACIÓN',
    description: 'Elige el tipo de operación que quieres practicar: suma, resta, multiplicación o división.',
    icon: 'magic',
    color: '#8A56FE',
    area: 'bottom', 
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: null
  },
  {
    id: 'infinite_time',
    title: 'TIEMPO',
    description: 'Selecciona la duración de tu sesión de práctica. Tienes 3 vidas por cada intento.',
    icon: 'hourglass-start',
    color: '#FFD45E',
    area: 'top',
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: null
  },
  {
    id: 'infinite_difficulty',
    title: 'DIFICULTAD',
    description: 'Elige entre nivel Principiante o Experto para ajustar el rango de los números.',
    icon: 'medal',
    color: '#F97316',
    area: 'top',
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: null
  },
  {
    id: 'infinite_start',
    title: 'INICIAR',
    description: 'Cuando estés listo, presiona el botón para empezar tu práctica.',
    icon: 'rocket',
    color: '#22C55E',
    area: 'top', 
    targetScreen: '/(tabs)/extras',
    defaultSpotlight: null
  },

  // --- SECCIÓN 3: TIENDA (Pestaña Store) ---
  {
    id: 'store',
    title: 'TIENDA',
    description: 'Usa las monedas que ganes en tus partidas para personalizar tu avatar.',
    icon: 'shopping-cart',
    color: '#FFD45E',
    area: 'middle',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: { x: width * 0.5, y: height - 85, w: width * 0.25, h: 85, radius: 0 }
  },
  {
    id: 'store_coins',
    title: 'MONEDAS',
    description: 'Aquí aparece tu saldo actual. Ganarás monedas al completar partidas y desafíos.',
    icon: 'coins',
    color: '#FFD45E',
    area: 'bottom', // Coins are top, card should be bottom
    targetScreen: '/(tabs)/store',
    defaultSpotlight: null
  },
  {
    id: 'store_skin',
    title: 'COLOR DE PIEL',
    description: 'Cambia el tono de piel de tu avatar seleccionando entre las opciones disponibles.',
    icon: 'user',
    color: '#EBDDFF',
    area: 'top', // Categories are bottom, card should be top
    targetScreen: '/(tabs)/store',
    defaultSpotlight: null
  },
  {
    id: 'store_hair',
    title: 'CABELLO',
    description: 'Personaliza el estilo y color de cabello de tu personaje.',
    icon: 'cut',
    color: '#EBDDFF',
    area: 'top',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: null
  },
  {
    id: 'store_eyes',
    title: 'OJOS',
    description: 'Cambia la forma y el color de los ojos para darle más personalidad a tu avatar.',
    icon: 'eye',
    color: '#EBDDFF',
    area: 'top',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: null
  },
  {
    id: 'store_mouth',
    title: 'EXPRESIÓN',
    description: 'Elige diferentes expresiones faciales para tu personaje.',
    icon: 'smile',
    color: '#EBDDFF',
    area: 'top',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: null
  },
  {
    id: 'store_clothes',
    title: 'VESTIMENTA',
    description: 'Equipa a tu avatar con diferentes camisas y accesorios de la tienda.',
    icon: 'tshirt',
    color: '#EBDDFF',
    area: 'top',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: null
  },
  {
    id: 'store_items',
    title: 'COSMÉTICOS',
    description: 'Aquí puedes ver los artículos disponibles. Toca uno para ver cómo le queda a tu avatar antes de comprarlo.',
    icon: 'th',
    color: '#EBDDFF',
    area: 'top',
    targetScreen: '/(tabs)/store',
    defaultSpotlight: null
  },

  // --- SECCIÓN 4: PERFIL (Pestaña User) ---
  {
    id: 'profile',
    title: 'TU PERFIL',
    description: 'Aquí puedes ver tus estadísticas, racha y cambiar tu configuración personal.',
    icon: 'user-cog',
    color: '#FF46A5',
    area: 'middle',
    targetScreen: '/(tabs)/user',
    defaultSpotlight: { x: width * 0.75, y: height - 85, w: width * 0.25, h: 85, radius: 0 }
  },
  {
    id: 'profile_settings',
    title: 'AJUSTES',
    description: 'Cambia tu nombre de usuario o actualiza tu contraseña desde este menú.',
    icon: 'cog',
    color: '#A855F7',
    area: 'bottom',
    targetScreen: '/(tabs)/user',
    defaultSpotlight: null
  },
  {
    id: 'profile_avatar',
    title: 'PERSONALIZAR',
    description: 'Toca tu foto para volver a la tienda y cambiar el aspecto de tu avatar.',
    icon: 'user-circle',
    color: '#A855F7',
    area: 'bottom',
    targetScreen: '/(tabs)/user',
    defaultSpotlight: null
  },
  {
    id: 'profile_streak',
    title: 'RACHA DIARIA',
    description: 'Lleva la cuenta de cuántos días seguidos has practicado matemáticas.',
    icon: 'fire',
    color: '#FF9500',
    area: 'bottom',
    targetScreen: '/(tabs)/user',
    defaultSpotlight: null
  },
  {
    id: 'profile_matches',
    title: 'HISTORIAL',
    description: 'Revisa los resultados de tus partidas más recientes y tu progreso.',
    icon: 'history',
    color: '#A855F7',
    area: 'top',
    targetScreen: '/(tabs)/user',
    defaultSpotlight: null
  }
];

export type TutorialSection = 'initial' | '1vs1' | 'infinite' | 'store' | 'profile';

interface TutorialContextType {
  isVisible: boolean;
  currentStepIndex: number;
  firstStepIndex: number;
  lastStepIndex: number; 
  dynamicSpotlights: Record<string, SpotlightPos>;
  setDynamicSpotlight: (id: string, pos: SpotlightPos) => void;
  startTutorial: (section?: TutorialSection) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [firstStepIndex, setFirstStepIndex] = useState(0);
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

    // Clear ALL dynamic spotlights on start to prevent stale positions from previous runs
    setDynamicSpotlights({});
    
    setCurrentStepIndex(start);
    setFirstStepIndex(start);
    setLastStepIndex(end);
    setIsVisible(true);
    router.push(TUTORIAL_STEPS[start].targetScreen as any);
  };

  const nextStep = () => {
    if (currentStepIndex < lastStepIndex && currentStepIndex < TUTORIAL_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const nextStepId = TUTORIAL_STEPS[nextIndex].id;
      const currentStepData = TUTORIAL_STEPS[currentStepIndex];
      const nextStepData = TUTORIAL_STEPS[nextIndex];
      
      // Clear the dynamic spotlight for the next step to ensure a fresh measurement
      setDynamicSpotlights(prev => {
        const next = { ...prev };
        delete next[nextStepId];
        return next;
      });
      
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

  const prevStep = () => {
    if (currentStepIndex > firstStepIndex && currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      const currentStepData = TUTORIAL_STEPS[currentStepIndex];
      const prevStepData = TUTORIAL_STEPS[prevIndex];

      if (prevStepData && prevStepData.targetScreen !== currentStepData.targetScreen) {
        router.push(prevStepData.targetScreen as any);
        setTimeout(() => {
          setCurrentStepIndex(prevIndex);
        }, 800);
      } else {
        setCurrentStepIndex(prevIndex);
      }
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
      firstStepIndex,
      lastStepIndex,
      dynamicSpotlights, 
      setDynamicSpotlight,
      startTutorial, 
      nextStep, 
      prevStep,
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
