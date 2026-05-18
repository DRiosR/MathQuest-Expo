import React, { useEffect, useRef } from 'react';
import { Animated, ViewProps, Platform } from 'react-native';

interface FadeInViewProps extends ViewProps {
  delay?: number;
  duration?: number;
  distance?: number;
  from?: 'none' | 'left' | 'right' | 'top' | 'bottom';
  children: React.ReactNode;
}

export function FadeInView({
  delay = 0,
  duration = 600,
  distance = 20,
  from = 'none',
  children,
  style,
  ...props
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Set initial offset based on direction
    switch (from) {
      case 'left':
        translateX.setValue(-distance);
        translateY.setValue(0);
        break;
      case 'right':
        translateX.setValue(distance);
        translateY.setValue(0);
        break;
      case 'top':
        translateY.setValue(-distance);
        translateX.setValue(0);
        break;
      case 'bottom':
        translateY.setValue(distance);
        translateX.setValue(0);
        break;
      case 'none':
      default:
        translateX.setValue(0);
        translateY.setValue(0);
        break;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [delay, duration, distance, from]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
      {...props}>
      {children}
    </Animated.View>
  );
}
