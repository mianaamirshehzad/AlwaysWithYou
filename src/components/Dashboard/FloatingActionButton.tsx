
import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';

type Props = {
  onPress?: () => void;
  accessibilityLabel?: string;
  tabBarHeight?: number;
  offset?: number;
  style?: StyleProp<ViewStyle>;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  iconSize?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function FloatingActionButton(props: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = props.tabBarHeight ?? 72;
  const offset = props.offset ?? 16;
  const iconName = props.iconName ?? 'add';
  const iconSize = props.iconSize ?? 35;

  const pulse = useSharedValue(1);
  const pressScale = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.07, {
          duration: 900,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 900,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    return () => {
      pulse.value = 1;
    };
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulse.value * pressScale.value },
    ],
  }));

  const handlePressIn = React.useCallback(() => {
    pressScale.value = withSpring(0.92, {
      damping: 12,
      stiffness: 300,
    });
  }, [pressScale]);

  const handlePressOut = React.useCallback(() => {
    pressScale.value = withSpring(1, {
      damping: 10,
      stiffness: 250,
    });
  }, [pressScale]);

  return (
    <AnimatedPressable
      onPress={props.onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? 'Add'}
      style={[
        styles.fab,
        {
          bottom: Math.max(offset, insets.bottom) + tabBarHeight,
        },
        props.style,
        animatedStyle,
      ]}>
      <Ionicons
        name={iconName}
        size={iconSize}
        color={Colors.dashboard.bg}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.dark.background,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
