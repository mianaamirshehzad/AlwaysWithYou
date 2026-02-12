import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';

type Props = {
  onPress?: () => void;
  accessibilityLabel?: string;
  tabBarHeight?: number;
  offset?: number;
  style?: StyleProp<ViewStyle>;
};

export default function FloatingActionButton(props: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = props.tabBarHeight ?? 72;
  const offset = props.offset ?? 16;

  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? 'Add'}
      style={[
        styles.fab,
        {
          bottom: Math.max(offset, insets.bottom) + tabBarHeight,
        },
        props.style,
      ]}>
      <Ionicons name="add" size={35} color={Colors.dashboard.bg} />
    </Pressable>
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

