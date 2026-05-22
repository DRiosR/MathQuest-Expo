import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function GamesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: Platform.OS === 'web' ? 'card' : 'fullScreenModal',
        animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
      }}
    />
  );
}

