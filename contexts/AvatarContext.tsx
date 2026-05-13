import { defaultAvatar } from '@/constants/avatarAssets';
import { Avatar } from '@/types/avatar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react';
import { getCurrentUserAvatar, upsertCurrentUserAvatar } from '@/services/SupabaseService';
import { useAuth } from '@/contexts/AuthContext';

interface AvatarContextType {
  avatar: Avatar;
  updateAvatar: (newAvatar: Avatar) => Promise<void>;
  isLoading: boolean;
  refreshAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

const AVATAR_STORAGE_KEY_PREFIX = '@mathquest_user_avatar_';
const getAvatarStorageKey = (userId: string) => `${AVATAR_STORAGE_KEY_PREFIX}${userId}`;

interface AvatarProviderProps {
  children: ReactNode;
}

export const AvatarProvider: React.FC<AvatarProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [avatar, setAvatar] = useState<Avatar>(defaultAvatar);
  const [isLoading, setIsLoading] = useState(true);

  const loadAvatar = useCallback(async () => {
    if (!user?.id) {
      setAvatar(defaultAvatar);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const storageKey = getAvatarStorageKey(user.id);
      
      // Prefer server avatar; fallback to cached storage or default
      const serverAvatar = await getCurrentUserAvatar();
      
      if (serverAvatar) {
        setAvatar(serverAvatar);
        // keep a local cache
        await AsyncStorage.setItem(storageKey, JSON.stringify(serverAvatar));
      } else {
        const storedAvatar = await AsyncStorage.getItem(storageKey);
        if (storedAvatar) {
          const parsedAvatar = JSON.parse(storedAvatar);
          setAvatar(parsedAvatar);
        } else {
          setAvatar(defaultAvatar);
        }
      }
    } catch (error) {
      console.error('Failed to load avatar:', error);
      setAvatar(defaultAvatar);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load avatar when user changes
  useEffect(() => {
    loadAvatar();
  }, [loadAvatar]);

  const updateAvatar = async (newAvatar: Avatar) => {
    if (!user?.id) return;
    
    try {
      const storageKey = getAvatarStorageKey(user.id);
      // Persist to server first
      await upsertCurrentUserAvatar(newAvatar);
      // Cache locally and update state
      await AsyncStorage.setItem(storageKey, JSON.stringify(newAvatar));
      setAvatar(newAvatar);
    } catch (error) {
      console.error('Failed to save avatar:', error);
    }
  };

  const value: AvatarContextType = {
    avatar,
    updateAvatar,
    isLoading,
    refreshAvatar: loadAvatar
  };

  return (
    <AvatarContext.Provider value={value}>
      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatar = (): AvatarContextType => {
  const context = useContext(AvatarContext);
  if (context === undefined) {
    throw new Error('useAvatar must be used within an AvatarProvider');
  }
  return context;
};

