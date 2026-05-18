import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: Platform.OS === 'web' ? 'card' : 'modal',
        animation: Platform.OS === 'web' ? 'fade' : 'slide_from_bottom',
      }}
    />
  );
}

