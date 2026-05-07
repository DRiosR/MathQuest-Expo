/**
 * Profile ViewModel
 * Manages user profile state and business logic
 */

import { useEffect, useState } from 'react';
import { authService } from '../../../Core/Services/AuthService';
import { HighScore, UserProfile, userService } from '../../../Core/Services/UserService';
import { Avatar } from '../../../data/Models/avatar';

export interface ProfileViewModelState {
  // User profile
  profile: UserProfile | null;
  
  // Avatar customization
  currentAvatar: Avatar;
  hasUnsavedChanges: boolean;
  
  // Statistics
  highScores: HighScore[];
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  
  // Error handling
  error: string | null;
}

export const useProfileViewModel = () => {
  const [state, setState] = useState<ProfileViewModelState>({
    profile: null,
    currentAvatar: {} as Avatar,
    hasUnsavedChanges: false,
    highScores: [],
    isLoading: true,
    isUpdating: false,
    error: null,
  });

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // TODO: Load from userService instead of authService
      const profile: UserProfile = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.avatar,
        level: currentUser.level,
        score: currentUser.score,
        gamesPlayed: currentUser.gamesPlayed,
        winRate: currentUser.winRate,
        achievements: [],
        preferences: {
          soundEnabled: true,
          hapticsEnabled: true,
          notificationsEnabled: true,
          language: 'es',
          theme: 'system',
        },
      };

      setState(prev => ({ 
        ...prev, 
        profile, 
        currentAvatar: currentUser.avatar,
        isLoading: false 
      }));

      // Load high scores
      await loadHighScores();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load profile',
        isLoading: false 
      }));
    }
  };

  const loadHighScores = async () => {
    try {
      const scores = userService.getAllHighScores();
      setState(prev => ({ ...prev, highScores: scores }));
    } catch (error) {
      console.error('Failed to load high scores:', error);
    }
  };

  const updateAvatar = async (avatar: Avatar) => {
    setState(prev => ({ 
      ...prev, 
      currentAvatar: avatar,
      hasUnsavedChanges: true,
      isUpdating: true,
      error: null 
    }));

    try {
      await userService.updateAvatar(avatar);
      
      setState(prev => ({ 
        ...prev, 
        hasUnsavedChanges: false,
        isUpdating: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update avatar',
        isUpdating: false 
      }));
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!state.profile) return;

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const updatedProfile = await userService.updateProfile(updates);
      
      setState(prev => ({ 
        ...prev, 
        profile: updatedProfile,
        isUpdating: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update profile',
        isUpdating: false 
      }));
    }
  };

  const updatePreferences = async (preferences: Partial<UserProfile['preferences']>) => {
    if (!state.profile) return;

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      await userService.updatePreferences(preferences);
      
      setState(prev => ({ 
        ...prev, 
        profile: prev.profile ? {
          ...prev.profile,
          preferences: { ...prev.profile.preferences, ...preferences }
        } : null,
        isUpdating: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update preferences',
        isUpdating: false 
      }));
    }
  };

  const unlockAchievement = async (achievementId: string) => {
    try {
      await userService.unlockAchievement(achievementId);
      
      // Reload profile to get updated achievements
      await loadUserProfile();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to unlock achievement'
      }));
    }
  };

  const updateAchievementProgress = async (achievementId: string, progress: number) => {
    try {
      await userService.updateAchievementProgress(achievementId, progress);
    } catch (error) {
      console.error('Failed to update achievement progress:', error);
    }
  };

  const addHighScore = async (mode: number, score: number, accuracy: number, questionsAnswered: number) => {
    try {
      await userService.addHighScore({
        mode,
        score,
        accuracy,
        questionsAnswered,
      });
      
      // Reload high scores
      await loadHighScores();
    } catch (error) {
      console.error('Failed to add high score:', error);
    }
  };

  const getTopScores = (mode: number, limit: number = 10): HighScore[] => {
    return state.highScores
      .filter(score => score.mode === mode)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  };

  const revertAvatarChanges = () => {
    if (state.profile) {
      setState(prev => ({ 
        ...prev, 
        currentAvatar: prev.profile?.avatar || {} as Avatar,
        hasUnsavedChanges: false 
      }));
    }
  };

  return {
    state,
    actions: {
      updateAvatar,
      updateProfile,
      updatePreferences,
      unlockAchievement,
      updateAchievementProgress,
      addHighScore,
      getTopScores,
      revertAvatarChanges,
      refreshProfile: loadUserProfile,
    },
  };
};
