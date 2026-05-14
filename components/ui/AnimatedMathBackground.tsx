import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const SYMBOLS = ['+', '-', '×', '÷', '='];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type FloatingItemProps = {
  char: string;
  size: number;
  left: number;
  top: number;
  baseRotate: number;
  direction: 1 | -1;
  durationMs: number;
  opacityStart: number;
  opacityEnd: number;
  blurIntensity: number;
};

// 🔹 Each symbol component manages its own animation hooks
const FloatingSymbol: React.FC<FloatingItemProps> = (it) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(it.baseRotate);
  const opacity = useSharedValue(it.opacityStart);

  React.useEffect(() => {
    // Floating motion
    translateY.value = withRepeat(
      withSequence(
        withTiming(-randomInt(10, 40), { duration: it.durationMs }),
        withTiming(randomInt(10, 40), { duration: it.durationMs })
      ),
      -1,
      true
    );

    translateX.value = withRepeat(
      withSequence(
        withTiming(it.direction * randomInt(10, 30), { duration: it.durationMs }),
        withTiming(0, { duration: it.durationMs })
      ),
      -1,
      true
    );

    // Opacity breathing
    opacity.value = withRepeat(
      withSequence(
        withTiming(it.opacityEnd, { duration: randomInt(3000, 6000) }),
        withTiming(it.opacityStart, { duration: randomInt(3000, 6000) })
      ),
      -1,
      true
    );

    // Slow rotation drift
    rotate.value = withRepeat(
      withSequence(
        withTiming(it.baseRotate + randomInt(5, 15), { duration: it.durationMs * 1.2 }),
        withTiming(it.baseRotate - randomInt(5, 15), { duration: it.durationMs * 1.2 })
      ),
      -1,
      true
    );

    // Subtle scaling (breathing zoom)
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: randomInt(4000, 8000) }),
        withTiming(0.95, { duration: randomInt(4000, 8000) })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  // Optional blur overlay that reacts to fading
  const blurStyle = useAnimatedStyle(() => ({
    opacity: 1 - opacity.value, // Blur increases as text fades
  }));

  return (
    <View style={{ position: 'absolute', left: it.left, top: it.top }}>
      <Animated.Text
        style={[
          {
            fontSize: it.size,
            color: 'rgba(255,255,255,0.3)',
            textShadowColor: 'rgba(0,0,0,0.2)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 3,
            fontFamily: 'Gilroy-Black',
          },
          style,
        ]}
      >
        {it.char}
      </Animated.Text>
    </View>
  );
};

export const AnimatedMathBackground: React.FC = () => {
  const items = useMemo(() => {
    return Array.from({ length: 22 }).map(() => ({
      char: Math.random() < 0.6
        ? SYMBOLS[randomInt(0, SYMBOLS.length - 1)]
        : String(randomInt(1, 100)),
      size: randomInt(50, 110),
      left: Math.random() * (width - 100),
      top: Math.random() * (height - 200) + 40,
      baseRotate: randomInt(-25, 25),
      direction: Math.random() > 0.5 ? 1 : -1 as 1 | -1,
      durationMs: randomInt(8000, 18000),
      opacityStart: Math.random() * 0.15 + 0.15,
      opacityEnd: Math.random() * 0.3 + 0.4,
      blurIntensity: randomInt(3, 12),
    }));
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((it, idx) => (
        <FloatingSymbol key={idx} {...it} />
      ))}
    </View>
  );
};

export default AnimatedMathBackground;
