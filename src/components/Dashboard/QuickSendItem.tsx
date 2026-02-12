import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  label: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
};

export default function QuickSendItem(props: Props) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [styles.pill, { opacity: pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={props.label}>
      <View style={styles.iconWrap}>
        <Ionicons name={props.iconName} size={16} color={Colors.dashboard.icon} />
      </View>
      <Text style={styles.label}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: Colors.alpha.white75, fontSize: 12, fontWeight: '800' },
});

