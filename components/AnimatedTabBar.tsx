import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  MapTrifoldIcon,
  PuzzlePieceIcon,
  ShoppingCartSimpleIcon,
  SwordIcon,
  UserIcon
} from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const TAB_BAR_HEIGHT = 75;

// Map your route names to icon components
const TAB_ICONS: Record<string, any> = {
  index: MapTrifoldIcon,
  extras: PuzzlePieceIcon,
  play: SwordIcon,
  store: ShoppingCartSimpleIcon,
  user: UserIcon,
};

function AnimatedTab({
  route,
  isFocused,
  onPress,
  label,
}: {
  route: any;
  isFocused: boolean;
  onPress: () => void;
  label: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.6)).current;
  const labelOpacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.6)).current;
  const labelTranslateYAnim = useRef(new Animated.Value(isFocused ? 0 : 5)).current;

  useEffect(() => {
    if (isFocused) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          useNativeDriver: true,
          friction: 5,
          tension: 100,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
          tension: 100,
        }),
      ]).start();

      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.timing(labelOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.spring(labelTranslateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 6,
        tension: 100,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }).start();

      Animated.timing(opacityAnim, {
        toValue: 0.6,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.timing(labelOpacityAnim, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: true,
      }).start();

      Animated.spring(labelTranslateYAnim, {
        toValue: 5,
        useNativeDriver: true,
        friction: 6,
        tension: 100,
      }).start();
    }
  }, [isFocused]);

  const IconComponent = TAB_ICONS[route.name];
  const weight = isFocused ? 'fill' : 'bold'; // outline vs filled effect

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabButton}
      activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}>
        {IconComponent && <IconComponent size={28} weight={weight} color="#FFFFFF" />}
      </Animated.View>
      <Animated.View
        style={{
          opacity: labelOpacityAnim,
          transform: [{ translateY: labelTranslateYAnim }],
        }}>
        <Text style={styles.label}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View style={styles.tabBar}>
      {state.routes
        .filter((route) => {
          const href = (descriptors[route.key] as any)?.options?.href;
          // Hide tabs when expo-router sets href: null (e.g., Quest)
          if (href === null) return false;
          // Also explicitly hide the "index" route (Quest) from the tab bar
          if (route.name === 'index') return false;
          return true;
        })
        .map((route) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;
          const isFocused = state.routes[state.index]?.name === route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <AnimatedTab
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              label={label}
            />
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#8A56FE',
    height: TAB_BAR_HEIGHT,
    paddingBottom: 8,
    paddingTop: 8,
    borderTopWidth: 0,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: 'Digitalt',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
