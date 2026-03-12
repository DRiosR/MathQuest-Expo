import { io, Socket } from 'socket.io-client';
import { getAutoServerURL } from '../config/auto-discovery';

// Tipos para los eventos de WebSocket
export interface WebSocketMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  messageType: 'text' | 'image' | 'file';
  timestamp: string;
  roomId: string;
}

export interface User {
  id: string;
  username: string;
  socketId: string;
  joinedAt: string;
}

export interface Room {
  id: string;
  users: User[];
  messages: WebSocketMessage[];
  createdAt: string;
  isPrivate?: boolean;
}

export interface JoinRoomData {
  roomId: string;
  userId: string;
  username: string;
}

export interface SendMessageData {
  roomId: string;
  userId?: string;
  username?: string;
  message: string;
  messageType?: 'text' | 'image' | 'file' | 'game';
  type?: string;
}

export interface TypingData {
  roomId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

// Configuración del servidor WebSocket (se detectará automáticamente)
let WEBSOCKET_URL = '';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 999; // Reconexión infinita
  private reconnectDelay = 2000; // Delay inicial más largo
  private reconnectInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isManualDisconnect = false;
  private lastActivity = Date.now();
  private isReconnecting = false;

  // Event listeners
  private messageListeners: ((message: WebSocketMessage) => void)[] = [];
  private messageExpiredListeners: ((data: { messageId: string }) => void)[] = [];
  private userJoinedListeners: ((data: { userId: string; username: string; message: string }) => void)[] = [];
  private userLeftListeners: ((data: { userId: string; username: string; message: string }) => void)[] = [];
  private typingListeners: ((data: { userId: string; username: string; isTyping: boolean }) => void)[] = [];
  private roomJoinedListeners: ((data: { roomId: string; users: User[]; messages: WebSocketMessage[]; opponent?: { userId: string; username: string } | null }) => void)[] = [];
  private privateRoomCreatedListeners: ((data: { roomId: string; message: string }) => void)[] = [];
  private waitingForPlayerListeners: ((data: { message: string; position: number }) => void)[] = [];
  private playerFoundListeners: ((data: { roomId: string; message: string; opponent: { userId: string; username: string }; users: User[]; messages: WebSocketMessage[] }) => void)[] = [];
  private roomCreatedListeners: ((data: { roomId: string; users: User[]; messages: WebSocketMessage[]; reason: string }) => void)[] = [];
  private searchCancelledListeners: ((data: { message: string }) => void)[] = [];
  private errorListeners: ((error: { message: string }) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  
  // Listeners del juego
  private roundStartedListeners: ((data: any) => void)[] = [];
  private roundFinishedListeners: ((data: any) => void)[] = [];
  private gameFinishedListeners: ((data: any) => void)[] = [];
  private playerCompletedListeners: ((data: any) => void)[] = [];
  private timerStartedListeners: ((data: any) => void)[] = [];
  private answerResultListeners: ((data: any) => void)[] = [];

  constructor() {
    // No inicializar automáticamente, solo cuando se llame connect()
    console.log('🔧 WebSocketService inicializado - Listo para conectar');
  }

  private async initializeSocket() {
    // Detectar automáticamente el servidor
    if (!WEBSOCKET_URL) {
      console.log('🔍 Detectando servidor automáticamente...');
      try {
        WEBSOCKET_URL = await getAutoServerURL();
        console.log('✅ Servidor detectado:', WEBSOCKET_URL);
      } catch (error) {
        console.log('⚠️ Error detectando servidor, usando Render como fallback...');
        WEBSOCKET_URL = 'https://server-x7b4.onrender.com'; // Servidor de Render como fallback
        console.log('✅ Usando servidor fallback (Render):', WEBSOCKET_URL);
      }
    }
    
    console.log('🔧 Inicializando WebSocket con URL:', WEBSOCKET_URL);
    
    this.socket = io(WEBSOCKET_URL, {
      timeout: 30000,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      transports: ['polling', 'websocket'],
      withCredentials: false,
      multiplex: false,
      forceNew: true,
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: false
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Eventos de conexión
    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor WebSocket');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.isManualDisconnect = false;
      this.isReconnecting = false;
      this.lastActivity = Date.now();
      
      // Notificar a todos los listeners
      this.connectionListeners.forEach(listener => {
        try {
          listener(true);
        } catch (error) {
          console.error('Error en connection listener:', error);
        }
      });
      
      // Iniciar heartbeat optimizado
      this.startOptimizedHeartbeat();
    });

    this.socket.on('connected', (data) => {
      console.log('🎯 Confirmación de conexión del servidor:', data);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconectado al servidor (intento ${attemptNumber})`);
      this.isConnected = true;
      this.connectionListeners.forEach(listener => listener(true));
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Intento de reconexión ${attemptNumber}`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Error de reconexión:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Falló la reconexión después de todos los intentos');
      this.isConnected = false;
      this.connectionListeners.forEach(listener => listener(false));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado del servidor WebSocket:', reason);
      this.isConnected = false;
      
      // Notificar a todos los listeners
      this.connectionListeners.forEach(listener => {
        try {
          listener(false);
        } catch (error) {
          console.error('Error en connection listener:', error);
        }
      });
      
      // Detener heartbeat
      this.stopHeartbeat();
      
      // Intentar reconectar si no fue una desconexión intencional
      if (!this.isManualDisconnect && reason !== 'io client disconnect' && !this.isReconnecting) {
        console.log('🔄 Iniciando reconexión inteligente...');
        this.startSmartReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      console.error('❌ Detalles del error:', {
        message: error.message,
        description: (error as any).description,
        context: (error as any).context,
        type: (error as any).type
      });
      this.isConnected = false;
      this.connectionListeners.forEach(listener => listener(false));
      this.errorListeners.forEach(listener => listener(error));
      
      // Intentar reconectar después de un delay inteligente
      if (!this.isManualDisconnect && !this.isReconnecting) {
        const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts), 30000); // Backoff exponencial, máximo 30 segundos
        console.log(`🔄 Intentando reconectar en ${delay/1000} segundos... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        setTimeout(() => {
          this.attemptReconnect();
        }, delay);
      }
    });

    // Eventos de chat (actualizar actividad)
    this.socket.on('new-message', (message: WebSocketMessage) => {
      this.lastActivity = Date.now();
      console.log('📨 Nuevo mensaje recibido:', message);
      this.messageListeners.forEach(listener => listener(message));
    });

    this.socket.on('message-expired', (data: { messageId: string }) => {
      this.lastActivity = Date.now();
      console.log('⏰ Mensaje expirado:', data.messageId);
      
      // Notificar a los listeners que un mensaje expiró
      this.messageExpiredListeners.forEach(listener => listener(data));
    });

    this.socket.on('user-joined', (data: { userId: string; username: string; message: string }) => {
      this.lastActivity = Date.now();
      console.log('👤 Usuario se unió:', data);
      this.userJoinedListeners.forEach(listener => listener(data));
    });

    this.socket.on('user-left', (data: { userId: string; username: string; message: string }) => {
      this.lastActivity = Date.now();
      console.log('👋 Usuario se fue:', data);
      this.userLeftListeners.forEach(listener => listener(data));
    });

    this.socket.on('user-typing', (data: { userId: string; username: string; isTyping: boolean }) => {
      this.lastActivity = Date.now();
      this.typingListeners.forEach(listener => listener(data));
    });

    this.socket.on('room-joined', (data: { roomId: string; users: User[]; messages: WebSocketMessage[] }) => {
      this.lastActivity = Date.now();
      console.log('🏠 Unido a sala:', data);
      this.roomJoinedListeners.forEach(listener => listener(data));
    });

    this.socket.on('private-room-created', (data: { roomId: string; message: string }) => {
      this.lastActivity = Date.now();
      console.log('🔒 Sala privada creada:', data);
      this.privateRoomCreatedListeners.forEach(listener => listener(data));
    });

    this.socket.on('waiting-for-player', (data: { message: string; position: number }) => {
      this.lastActivity = Date.now();
      console.log('⏳ Esperando jugador:', data);
      this.waitingForPlayerListeners.forEach(listener => listener(data));
    });

    this.socket.on('player-found', (data: { roomId: string; message: string; opponent: { userId: string; username: string }; users: User[]; messages: WebSocketMessage[]; selectedCategory?: { id: string; name: string; emoji: string; color: string } }) => {
      this.lastActivity = Date.now();
      console.log('🎯 Jugador encontrado:', data);
      this.playerFoundListeners.forEach(listener => listener(data));
    });

      this.socket.on('search-cancelled', (data: { message: string }) => {
        this.lastActivity = Date.now();
        console.log('❌ Búsqueda cancelada:', data);
        this.searchCancelledListeners.forEach(listener => listener(data));
        
        // Asegurar que la conexión se mantenga activa
        if (this.socket && this.isConnected) {
          console.log('✅ Conexión mantenida después de cancelar búsqueda');
        }
      });

      // Eventos del juego
      this.socket.on('round-started', (data: any) => {
        this.lastActivity = Date.now();
        console.log('🎯 WebSocketService recibió round-started:', data);
        console.log('🎯 Número de listeners registrados:', this.roundStartedListeners.length);
        this.roundStartedListeners.forEach((listener, index) => {
          console.log(`🎯 Ejecutando listener ${index + 1}...`);
          listener(data);
        });
      });

      this.socket.on('round-finished', (data: any) => {
        this.lastActivity = Date.now();
        console.log('🏆 Ronda terminada:', data);
        this.roundFinishedListeners.forEach(listener => listener(data));
      });

      this.socket.on('game-finished', (data: any) => {
        this.lastActivity = Date.now();
        console.log('🎮 Juego terminado:', data);
        this.gameFinishedListeners.forEach(listener => listener(data));
      });

      this.socket.on('player-completed', (data: any) => {
        this.lastActivity = Date.now();
        console.log('🏁 Jugador completó:', data);
        this.playerCompletedListeners.forEach(listener => listener(data));
      });

      this.socket.on('timer-started', (data: any) => {
        this.lastActivity = Date.now();
        console.log('⏰ Temporizador iniciado:', data);
        this.timerStartedListeners.forEach(listener => listener(data));
      });

      this.socket.on('answer-result', (data: any) => {
        this.lastActivity = Date.now();
        console.log('✅ Resultado de respuesta:', data);
        this.answerResultListeners.forEach(listener => listener(data));
      });

    this.socket.on('room-created', (data: { roomId: string; users: User[]; messages: WebSocketMessage[]; reason: string }) => {
      this.lastActivity = Date.now();
      console.log('🏠 Nueva sala creada:', data);
      this.roomCreatedListeners.forEach(listener => listener(data));
    });

    // Evento para confirmar que la conexión se mantiene
    this.socket.on('connection-maintained', (data: { message: string; timestamp: string }) => {
      this.lastActivity = Date.now();
      console.log('✅ Conexión mantenida:', data);
      
      // Confirmar que la conexión está activa
      if (this.socket && this.isConnected) {
        console.log('🔗 WebSocket sigue conectado y funcionando');
      }
    });

    this.socket.on('error', (error: { message: string }) => {
      if (error?.message === 'Ya estás en la cola de espera') {
        return; // No es error real, solo duplicado de findPlayer
      }
      console.error('❌ Error del servidor:', error);
      this.errorListeners.forEach(listener => listener(error));
    });

    // Ping/Pong para mantener conexión (sin log para reducir ruido)
    this.socket.on('pong', (data) => {
      this.lastActivity = Date.now();
      // console.log('🏓 Pong recibido:', data); // Comentado para reducir logs
    });

    // Server ping para mantener conexión activa (sin log para reducir ruido)
    this.socket.on('server-ping', (data) => {
      this.lastActivity = Date.now();
      // console.log('💓 Server heartbeat recibido:', data); // Comentado para reducir logs
      // Responder al server ping
      if (this.socket && this.isConnected) {
        this.socket.emit('server-pong', { 
          timestamp: new Date().toISOString(),
          clientTime: Date.now(),
          message: 'Client is alive'
        });
      }
    });
  }

  private attemptReconnect() {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    console.log(`🔄 Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    if (this.socket && !this.isConnected && !this.isManualDisconnect) {
      this.socket.connect();
    }
    
    // Resetear flag después de un tiempo
    setTimeout(() => {
      this.isReconnecting = false;
    }, 5000);
  }

  private startSmartReconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
    
    this.reconnectInterval = setInterval(() => {
      if (!this.isConnected && !this.isManualDisconnect && !this.isReconnecting) {
        console.log('🔄 Reconexión inteligente en curso...');
        this.attemptReconnect();
      } else if (this.isConnected) {
        // Si ya está conectado, limpiar el intervalo
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      }
    }, 10000); // Intentar cada 10 segundos (menos frecuente)
  }

  private startOptimizedHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        // Solo hacer ping si no ha habido actividad reciente
        const timeSinceLastActivity = Date.now() - this.lastActivity;
        if (timeSinceLastActivity > 60000) { // Solo si no hay actividad en 1 minuto
          this.ping();
        }
      }
    }, 60000); // Ping cada 60 segundos (menos frecuente)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Métodos públicos para conectar/desconectar
  async connect() {
    this.isManualDisconnect = false;
    console.log('🔗 Intentando conectar al WebSocket...');
    
    if (!this.socket) {
      console.log('🔧 Inicializando nueva conexión WebSocket...');
      await this.initializeSocket();
    } else if (!this.isConnected) {
      console.log('🔄 Reconectando WebSocket existente...');
      this.socket.connect();
    } else {
      console.log('✅ WebSocket ya está conectado');
      // Notificar que ya está conectado
      this.connectionListeners.forEach(listener => {
        try {
          listener(true);
        } catch (error) {
          console.error('Error en connection listener:', error);
        }
      });
    }
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Método para enviar ping y mantener conexión
  ping() {
    if (this.socket && this.isConnected) {
      this.socket.emit('ping');
    }
  }

  // Métodos para unirse a salas
  joinRoom(data: JoinRoomData) {
    if (this.socket && this.isConnected) {
      console.log('🚪 Uniéndose a sala:', data);
      this.socket.emit('join-room', data);
    } else {
      console.error('❌ No se puede unir a la sala: WebSocket no conectado');
    }
  }

  createPrivateRoom(userId: string, username: string) {
    if (this.socket && this.isConnected) {
      console.log('🔒 Creando sala privada para:', username);
      this.socket.emit('create-private-room', { userId, username });
    } else {
      console.error('❌ No se puede crear sala privada: WebSocket no conectado');
    }
  }

  joinByCode(roomCode: string, userId: string, username: string) {
    if (this.socket && this.isConnected) {
      console.log('🔑 Uniéndose por código:', roomCode);
      this.socket.emit('join-by-code', { roomCode, userId, username });
    } else {
      console.error('❌ No se puede unir por código: WebSocket no conectado');
    }
  }

  findPlayer(userId: string, username: string) {
    if (this.socket && this.isConnected) {
      console.log('🔍 Buscando jugador para:', username);
      this.socket.emit('find-player', { userId, username });
    } else {
      console.error('❌ No se puede buscar jugador: WebSocket no conectado');
    }
  }

  cancelSearch(userId: string) {
    if (this.socket && this.isConnected) {
      console.log('❌ Cancelando búsqueda para:', userId);
      this.socket.emit('cancel-search', { userId });
      // Actualizar actividad para mantener conexión activa
      this.lastActivity = Date.now();
    } else {
      // Si no está conectado, no había búsqueda activa en el servidor - cancelar solo localmente
      console.log('ℹ️ Cancelación local (WebSocket aún conectando o no conectado)');
    }
  }

  // Métodos para enviar mensajes
  sendMessage(data: SendMessageData) {
    if (this.socket && this.isConnected) {
      console.log('📤 Enviando mensaje:', data);
      this.socket.emit('send-message', data);
    } else {
      console.error('❌ No se puede enviar mensaje: WebSocket no conectado');
    }
  }

  sendTyping(data: TypingData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', data);
    }
  }

  // Métodos para agregar listeners
  onMessage(listener: (message: WebSocketMessage) => void) {
    this.messageListeners.push(listener);
  }

  onMessageExpired(listener: (data: { messageId: string }) => void) {
    this.messageExpiredListeners.push(listener);
  }

  onUserJoined(listener: (data: { userId: string; username: string; message: string }) => void) {
    this.userJoinedListeners.push(listener);
  }

  onUserLeft(listener: (data: { userId: string; username: string; message: string }) => void) {
    this.userLeftListeners.push(listener);
  }

  onTyping(listener: (data: { userId: string; username: string; isTyping: boolean }) => void) {
    this.typingListeners.push(listener);
  }

  onRoomJoined(listener: (data: { roomId: string; users: User[]; messages: WebSocketMessage[] }) => void) {
    this.roomJoinedListeners.push(listener);
  }

  onPrivateRoomCreated(listener: (data: { roomId: string; message: string }) => void) {
    this.privateRoomCreatedListeners.push(listener);
  }

  onWaitingForPlayer(listener: (data: { message: string; position: number }) => void) {
    this.waitingForPlayerListeners.push(listener);
  }

  onPlayerFound(listener: (data: { roomId: string; message: string; opponent: { userId: string; username: string }; users: User[]; messages: WebSocketMessage[] }) => void) {
    this.playerFoundListeners.push(listener);
  }

  onSearchCancelled(listener: (data: { message: string }) => void) {
    this.searchCancelledListeners.push(listener);
  }

  onError(listener: (error: { message: string }) => void) {
    this.errorListeners.push(listener);
  }

  onConnection(listener: (connected: boolean) => void) {
    this.connectionListeners.push(listener);
  }

  // Métodos para eventos del juego
  onRoundStarted(listener: (data: any) => void) {
    this.roundStartedListeners.push(listener);
  }

  onRoundFinished(listener: (data: any) => void) {
    this.roundFinishedListeners.push(listener);
  }

  onGameFinished(listener: (data: any) => void) {
    this.gameFinishedListeners.push(listener);
  }

  onPlayerCompleted(listener: (data: any) => void) {
    this.playerCompletedListeners.push(listener);
  }

  onTimerStarted(listener: (data: any) => void) {
    this.timerStartedListeners.push(listener);
  }

  onAnswerResult(listener: (data: any) => void) {
    this.answerResultListeners.push(listener);
  }

  // Método público para emitir eventos
  emit(event: string, data: any) {
    console.log('🎮 Intentando emitir evento:', event, 'Socket disponible:', !!this.socket, 'Conectado:', this.isConnected);
    
    if (this.socket && this.isConnected) {
      console.log('✅ Emitiendo evento:', event, 'con datos:', data);
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ socket o método on no están disponibles aún');
      console.error('❌ No se puede emitir evento: WebSocket no conectado');
      console.log('🔍 Estado del socket:', {
        socket: !!this.socket,
        connected: this.isConnected,
        socketId: this.socket?.id
      });
    }
  }

  // Método público para obtener el socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Método público para obtener el socket
  getSocket(): Socket | null {
    return this.socket;
  }

  // Métodos para remover listeners
  removeMessageListener(listener: (message: WebSocketMessage) => void) {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }

  removeMessageExpiredListener(listener: (data: { messageId: string }) => void) {
    this.messageExpiredListeners = this.messageExpiredListeners.filter(l => l !== listener);
  }

  removeUserJoinedListener(listener: (data: { userId: string; username: string; message: string }) => void) {
    this.userJoinedListeners = this.userJoinedListeners.filter(l => l !== listener);
  }

  removeUserLeftListener(listener: (data: { userId: string; username: string; message: string }) => void) {
    this.userLeftListeners = this.userLeftListeners.filter(l => l !== listener);
  }

  removeTypingListener(listener: (data: { userId: string; username: string; isTyping: boolean }) => void) {
    this.typingListeners = this.typingListeners.filter(l => l !== listener);
  }

  removeRoomJoinedListener(listener: (data: { roomId: string; users: User[]; messages: WebSocketMessage[] }) => void) {
    this.roomJoinedListeners = this.roomJoinedListeners.filter(l => l !== listener);
  }

  removePrivateRoomCreatedListener(listener: (data: { roomId: string; message: string }) => void) {
    this.privateRoomCreatedListeners = this.privateRoomCreatedListeners.filter(l => l !== listener);
  }

  removeWaitingForPlayerListener(listener: (data: { message: string; position: number }) => void) {
    this.waitingForPlayerListeners = this.waitingForPlayerListeners.filter(l => l !== listener);
  }

  removePlayerFoundListener(listener: (data: { roomId: string; message: string; opponent: { userId: string; username: string }; users: User[]; messages: WebSocketMessage[] }) => void) {
    this.playerFoundListeners = this.playerFoundListeners.filter(l => l !== listener);
  }

  onRoomCreated(listener: (data: { roomId: string; users: User[]; messages: WebSocketMessage[]; reason: string }) => void) {
    this.roomCreatedListeners.push(listener);
  }

  removeRoomCreatedListener(listener: (data: { roomId: string; users: User[]; messages: WebSocketMessage[]; reason: string }) => void) {
    this.roomCreatedListeners = this.roomCreatedListeners.filter(l => l !== listener);
  }

  removeSearchCancelledListener(listener: (data: { message: string }) => void) {
    this.searchCancelledListeners = this.searchCancelledListeners.filter(l => l !== listener);
  }

  removeErrorListener(listener: (error: { message: string }) => void) {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  removeConnectionListener(listener: (connected: boolean) => void) {
    this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
  }

  // Métodos para remover listeners del juego
  removeRoundStartedListener(listener: (data: any) => void) {
    this.roundStartedListeners = this.roundStartedListeners.filter(l => l !== listener);
  }

  removeRoundFinishedListener(listener: (data: any) => void) {
    this.roundFinishedListeners = this.roundFinishedListeners.filter(l => l !== listener);
  }

  removeGameFinishedListener(listener: (data: any) => void) {
    this.gameFinishedListeners = this.gameFinishedListeners.filter(l => l !== listener);
  }

  removePlayerCompletedListener(listener: (data: any) => void) {
    this.playerCompletedListeners = this.playerCompletedListeners.filter(l => l !== listener);
  }

  removeTimerStartedListener(listener: (data: any) => void) {
    this.timerStartedListeners = this.timerStartedListeners.filter(l => l !== listener);
  }

  removeAnswerResultListener(listener: (data: any) => void) {
    this.answerResultListeners = this.answerResultListeners.filter(l => l !== listener);
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

// Instancia singleton
export const websocketService = new WebSocketService();
export default websocketService;