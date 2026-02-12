import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  label: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  selected?: boolean;
  onPress?: () => void;
};

export default function ReminderForCard(props: Props) {
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!props.selected }}
      style={({ pressed }) => [
        styles.base,
        props.selected ? styles.selected : null,
        { opacity: pressed ? 0.9 : 1 },
      ]}>
      <View style={[styles.iconCircle, props.selected ? styles.iconCircleOn : null]}>
        <Ionicons
          name={props.iconName}
          size={16}
          color={props.selected ? Colors.brand.onPrimary : Colors.alpha.white82}
        />
      </View>
      <Text style={[styles.label, props.selected ? styles.labelOn : null]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  selected: {
    backgroundColor: Colors.dashboard.accentSelectedBg,
    borderColor: Colors.dashboard.accentSelectedBorder,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dashboard.surfaceStrong,
  },
  iconCircleOn: {
    backgroundColor: Colors.dashboard.accent,
  },
  label: { color: Colors.alpha.white75, fontSize: 12, fontWeight: '900' },
  labelOn: { color: Colors.dashboard.text },
});

