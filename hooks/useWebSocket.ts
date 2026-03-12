import { useCallback, useEffect, useRef, useState } from 'react';
import { JoinRoomData, SendMessageData, User, WebSocketMessage, websocketService } from '../services/services';

interface UseWebSocketReturn {
  // Estado de conexión
  isConnected: boolean;
  socketId: string | undefined;
  
  // Estado de la sala
  currentRoom: string | null;
  users: User[];
  messages: WebSocketMessage[];
  
  // Estado de escritura
  typingUsers: { [userId: string]: boolean };
  
  // Métodos
  joinRoom: (data: JoinRoomData) => void;
  createPrivateRoom: (userId: string, username: string) => void;
  joinByCode: (roomCode: string, userId: string, username: string) => void;
  findPlayer: (userId: string, username: string) => void;
  cancelSearch: (userId: string) => void;
  sendMessage: (data: SendMessageData) => void;
  ping: () => void;
  disconnect: () => void;
  forfeitGame: (roomId: string) => void;
  
  // Listeners
  onPlayerFound: (listener: (data: { roomId: string; message: string; opponent: { userId: string; username: string }; users: User[]; messages: WebSocketMessage[]; selectedCategory?: { id: string; name: string; emoji: string; color: string } }) => void) => void;
  onQueueUpdate: (listener: (position: number) => void) => void;
  
  // Listeners del juego
  onRoundStarted: (listener: (data: any) => void) => void;
  onRoundFinished: (listener: (data: any) => void) => void;
  onGameFinished: (listener: (data: any) => void) => void;
  onPlayerCompleted: (listener: (data: any) => void) => void;
  onTimerStarted: (listener: (data: any) => void) => void;
  onAnswerResult: (listener: (data: any) => void) => void;
  
  // WebSocket Service
  websocketService: typeof websocketService;
  socket: any;
  
  // Estado de la aplicación
  isLoading: boolean;
  error: string | null;
  connectionError: string | null;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | undefined>();
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  
  // Referencias para evitar recrear listeners
  const messageListenerRef = useRef<(message: WebSocketMessage) => void>(undefined);
  const messageExpiredListenerRef = useRef<(data: { messageId: string }) => void>(undefined);
  const userJoinedListenerRef = useRef<(data: { userId: string; username: string; message: string }) => void>(undefined);
  const userLeftListenerRef = useRef<(data: { userId: string; username: string; message: string }) => void>(undefined);
  const roomJoinedListenerRef = useRef<(data: { roomId: string; users: User[]; messages: WebSocketMessage[] }) => void>(undefined);
  const privateRoomCreatedListenerRef = useRef<(data: { roomId: string; message: string }) => void>(undefined);
  const playerFoundListenerRef = useRef<(data: { roomId: string; message: string; opponent: { userId: string; username: string }; users: User[]; messages: WebSocketMessage[]; selectedCategory?: { id: string; name: string; emoji: string; color: string } }) => void>(undefined);
  const roomCreatedListenerRef = useRef<(data: { roomId: string; users: User[]; messages: WebSocketMessage[]; reason: string }) => void>(undefined);
  const waitingForPlayerListenerRef = useRef<(data: { message: string; position: number }) => void>(undefined);
  const errorListenerRef = useRef<(error: { message: string }) => void>(undefined);
  const connectionListenerRef = useRef<(connected: boolean) => void>(undefined);
  
  // Referencias para listeners del juego
  const roundStartedListenerRef = useRef<(data: any) => void>(undefined);
  const roundFinishedListenerRef = useRef<(data: any) => void>(undefined);
  const gameFinishedListenerRef = useRef<(data: any) => void>(undefined);
  const playerCompletedListenerRef = useRef<(data: any) => void>(undefined);
  const timerStartedListenerRef = useRef<(data: any) => void>(undefined);
  const answerResultListenerRef = useRef<(data: any) => void>(undefined);

  // Limpiar listeners de typing después de un tiempo
  const clearTypingTimeout = useRef<{ [userId: string]: ReturnType<typeof setTimeout> }>({});

  // Configurar listeners
  useEffect(() => {
    // Listener para nuevos mensajes
    messageListenerRef.current = (message: WebSocketMessage) => {
      setMessages(prev => [...prev, message]);
    };

    // Listener para mensajes expirados
    messageExpiredListenerRef.current = (data: { messageId: string }) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
    };

    // Listener para usuarios que se unen
    userJoinedListenerRef.current = (data: { userId: string; username: string; message: string }) => {
      // Actualizar usuarios cuando alguien se une
      setUsers(prev => {
        const userExists = prev.some(user => user.id === data.userId);
        if (!userExists) {
          return [...prev, { id: data.userId, username: data.username, socketId: '', joinedAt: new Date().toISOString() }];
        }
        return prev;
      });
    };

    // Listener para usuarios que se van
    userLeftListenerRef.current = (data: { userId: string; username: string; message: string }) => {
      setUsers(prev => prev.filter(user => user.id !== data.userId));
      setTypingUsers((prev: { [userId: string]: boolean }) => {
        const newTypingUsers = { ...prev };
        delete newTypingUsers[data.userId];
        return newTypingUsers;
      });
    };


    // Listener para cuando se une a una sala
    roomJoinedListenerRef.current = (data: { roomId: string; users: User[]; messages: WebSocketMessage[]; opponent?: { userId: string; username: string } | null }) => {
      setCurrentRoom(data.roomId);
      setUsers(data.users);
      setMessages(data.messages);
      setIsLoading(false);
      setError(null);
      
      // Mostrar información del oponente si existe
      if (data.opponent) {
        console.log(`🎯 Conectado con: ${data.opponent.username}`);
      }
    };

    // Listener para cuando se crea una sala privada
    privateRoomCreatedListenerRef.current = (data: { roomId: string; message: string }) => {
      setCreatedRoomId(data.roomId);
      setIsLoading(false);
      setError(null);
    };

    // Listener para cuando se encuentra un jugador (emparejamiento automático)
    playerFoundListenerRef.current = (data: { roomId: string; message: string; opponent: { userId: string; username: string }; users: User[]; messages: WebSocketMessage[]; selectedCategory?: { id: string; name: string; emoji: string; color: string } }) => {
      console.log('🎯 playerFoundListenerRef ejecutado:', data);
      setCurrentRoom(data.roomId);
      setUsers(data.users);
      setMessages(data.messages);
      setIsLoading(false);
      setError(null);
    };

    // Listener para cuando se crea una nueva sala (cuando la original está llena)
    roomCreatedListenerRef.current = (data: { roomId: string; users: User[]; messages: WebSocketMessage[]; reason: string }) => {
      console.log('🏠 roomCreatedListenerRef ejecutado:', data);
      setCurrentRoom(data.roomId);
      setUsers(data.users);
      setMessages(data.messages);
      setIsLoading(false);
      setError(null);
    };

    // Listener para actualizaciones de posición en la cola
    waitingForPlayerListenerRef.current = (data: { message: string; position: number }) => {
      console.log('⏳ Esperando jugador, posición:', data.position);
      // Esta información se capturará a través de onQueueUpdate
    };

    // Listener para errores
    errorListenerRef.current = (error: { message: string }) => {
      // Ignorar "Ya estás en la cola" - no es un error real, solo duplicado
      if (error?.message === 'Ya estás en la cola de espera') return;
      setError(error.message);
      setIsLoading(false);
    };

    // Listener para cambios de conexión
    connectionListenerRef.current = (connected: boolean) => {
      setIsConnected(connected);
      setSocketId(websocketService.socketId);
      
      if (connected) {
        setConnectionError(null);
      } else {
        setCurrentRoom(null);
        setUsers([]);
        setMessages([]);
        setTypingUsers({});
        setConnectionError('No conectado al servidor');
      }
    };

    // Agregar listeners al servicio
    if (messageListenerRef.current) {
      websocketService.onMessage(messageListenerRef.current);
    }
    if (messageExpiredListenerRef.current) {
      websocketService.onMessageExpired(messageExpiredListenerRef.current);
    }
    if (userJoinedListenerRef.current) {
      websocketService.onUserJoined(userJoinedListenerRef.current);
    }
    if (userLeftListenerRef.current) {
      websocketService.onUserLeft(userLeftListenerRef.current);
    }
    if (roomJoinedListenerRef.current) {
      websocketService.onRoomJoined(roomJoinedListenerRef.current);
    }
    if (privateRoomCreatedListenerRef.current) {
      websocketService.onPrivateRoomCreated(privateRoomCreatedListenerRef.current);
    }
    if (playerFoundListenerRef.current) {
      websocketService.onPlayerFound(playerFoundListenerRef.current);
    }
    if (roomCreatedListenerRef.current) {
      websocketService.onRoomCreated(roomCreatedListenerRef.current);
    }
    if (waitingForPlayerListenerRef.current) {
      websocketService.onWaitingForPlayer(waitingForPlayerListenerRef.current);
    }
    if (errorListenerRef.current) {
      websocketService.onError(errorListenerRef.current);
    }
    if (connectionListenerRef.current) {
      websocketService.onConnection(connectionListenerRef.current);
    }

    // Agregar listeners del juego (no se registran inmediatamente, serán registrados por las funciones retornadas)
    // Estos serán manejados por los wrappers que se retornan

    // Conectar al WebSocket (ahora es asíncrono)
    websocketService.connect().catch((error: any) => {
      console.error('Error al conectar WebSocket:', error);
      setError('Error de conexión');
      setIsLoading(false);
    });

    // Ping periódico para mantener conexión activa
    const pingInterval = setInterval(() => {
      if (websocketService.connected) {
        websocketService.ping();
      }
    }, 30000); // Ping cada 30 segundos

    // Cleanup
    return () => {
      clearInterval(pingInterval);
      // Limpiar timeouts
      Object.values(clearTypingTimeout.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
      clearTypingTimeout.current = {};

      // Remover listeners
      if (messageListenerRef.current) {
        websocketService.removeMessageListener(messageListenerRef.current);
      }
      if (messageExpiredListenerRef.current) {
        websocketService.removeMessageExpiredListener(messageExpiredListenerRef.current);
      }
      if (userJoinedListenerRef.current) {
        websocketService.removeUserJoinedListener(userJoinedListenerRef.current);
      }
      if (userLeftListenerRef.current) {
        websocketService.removeUserLeftListener(userLeftListenerRef.current);
      }
      if (roomJoinedListenerRef.current) {
        websocketService.removeRoomJoinedListener(roomJoinedListenerRef.current);
      }
      if (privateRoomCreatedListenerRef.current) {
        websocketService.removePrivateRoomCreatedListener(privateRoomCreatedListenerRef.current);
      }
      if (playerFoundListenerRef.current) {
        websocketService.removePlayerFoundListener(playerFoundListenerRef.current);
      }
      if (roomCreatedListenerRef.current) {
        websocketService.removeRoomCreatedListener(roomCreatedListenerRef.current);
      }
      if (waitingForPlayerListenerRef.current) {
        websocketService.removeWaitingForPlayerListener(waitingForPlayerListenerRef.current);
      }
      if (errorListenerRef.current) {
        websocketService.removeErrorListener(errorListenerRef.current);
      }
      if (connectionListenerRef.current) {
        websocketService.removeConnectionListener(connectionListenerRef.current);
      }
      
      // Remover listeners del juego
      if (roundStartedListenerRef.current) {
        websocketService.removeRoundStartedListener(roundStartedListenerRef.current);
      }
      if (roundFinishedListenerRef.current) {
        websocketService.removeRoundFinishedListener(roundFinishedListenerRef.current);
      }
      if (gameFinishedListenerRef.current) {
        websocketService.removeGameFinishedListener(gameFinishedListenerRef.current);
      }
      if (playerCompletedListenerRef.current) {
        websocketService.removePlayerCompletedListener(playerCompletedListenerRef.current);
      }
      if (timerStartedListenerRef.current) {
        websocketService.removeTimerStartedListener(timerStartedListenerRef.current);
      }
      if (answerResultListenerRef.current) {
        websocketService.removeAnswerResultListener(answerResultListenerRef.current);
      }
    };
  }, []);

  // Métodos para interactuar con WebSocket
  const joinRoom = useCallback((data: JoinRoomData) => {
    setIsLoading(true);
    setError(null);
    websocketService.joinRoom(data);
  }, []);

  const createPrivateRoom = useCallback((userId: string, username: string) => {
    setIsLoading(true);
    setError(null);
    websocketService.createPrivateRoom(userId, username);
  }, []);

  const joinByCode = useCallback((roomCode: string, userId: string, username: string) => {
    setIsLoading(true);
    setError(null);
    websocketService.joinByCode(roomCode, userId, username);
  }, []);

  const findPlayer = useCallback((userId: string, username: string) => {
    setIsLoading(true);
    setError(null);
    websocketService.findPlayer(userId, username);
  }, []);

  const cancelSearch = useCallback((userId: string) => {
    console.log('🔄 Cancelando búsqueda para usuario:', userId);
    websocketService.cancelSearch(userId);
    setIsLoading(false);
    setError(null);
  }, []);

  const sendMessage = useCallback((data: SendMessageData) => {
    websocketService.sendMessage(data);
  }, []);


  const ping = useCallback(() => {
    websocketService.ping();
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const forfeitGame = useCallback((roomId: string) => {
    if (roomId) {
      websocketService.emit('forfeit-game', { roomId });
    }
  }, []);

  // Wrapper para onQueueUpdate que convierte la firma
  const onQueueUpdateWrapper = useCallback((listener: (position: number) => void) => {
    const wrappedListener = (data: { message: string; position: number }) => {
      listener(data.position);
    };
    websocketService.onWaitingForPlayer(wrappedListener);
  }, []);

  // Wrapper para onPlayerFound para mantener estabilidad
  const onPlayerFoundWrapper = useCallback((listener: (data: { roomId: string; message: string; opponent: { userId: string; username: string }; users: User[]; messages: WebSocketMessage[]; selectedCategory?: { id: string; name: string; emoji: string; color: string } }) => void) => {
    websocketService.onPlayerFound(listener);
  }, []);

  // Wrappers para listeners del juego
  const onRoundStartedWrapper = useCallback((listener: (data: any) => void) => {
    roundStartedListenerRef.current = listener;
    websocketService.onRoundStarted(listener);
  }, []);

  const onRoundFinishedWrapper = useCallback((listener: (data: any) => void) => {
    roundFinishedListenerRef.current = listener;
    websocketService.onRoundFinished(listener);
  }, []);

  const onGameFinishedWrapper = useCallback((listener: (data: any) => void) => {
    gameFinishedListenerRef.current = listener;
    websocketService.onGameFinished(listener);
  }, []);

  const onPlayerCompletedWrapper = useCallback((listener: (data: any) => void) => {
    playerCompletedListenerRef.current = listener;
    websocketService.onPlayerCompleted(listener);
  }, []);

  const onTimerStartedWrapper = useCallback((listener: (data: any) => void) => {
    timerStartedListenerRef.current = listener;
    websocketService.onTimerStarted(listener);
  }, []);

  const onAnswerResultWrapper = useCallback((listener: (data: any) => void) => {
    answerResultListenerRef.current = listener;
    websocketService.onAnswerResult(listener);
  }, []);

  return {
    // Estado de conexión
    isConnected,
    socketId,
    
    // Estado de la sala
    currentRoom,
    users,
    messages,
    
    // Estado de escritura
    typingUsers,
    
    // Métodos
    joinRoom,
    createPrivateRoom,
    joinByCode,
    findPlayer,
    cancelSearch,
    sendMessage,
    ping,
    disconnect,
    forfeitGame,
    
    // Listeners
    onPlayerFound: onPlayerFoundWrapper,
    onQueueUpdate: onQueueUpdateWrapper,
    
    // Listeners del juego
    onRoundStarted: onRoundStartedWrapper,
    onRoundFinished: onRoundFinishedWrapper,
    onGameFinished: onGameFinishedWrapper,
    onPlayerCompleted: onPlayerCompletedWrapper,
    onTimerStarted: onTimerStartedWrapper,
    onAnswerResult: onAnswerResultWrapper,
    
    // WebSocket Service
    websocketService,
    socket: null, // Acceso directo removido por privacidad
    
    // Estado de la aplicación
    isLoading,
    error,
    connectionError,
  };
};
