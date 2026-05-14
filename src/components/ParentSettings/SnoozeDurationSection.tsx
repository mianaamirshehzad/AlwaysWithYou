import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  valueMinutes: number;
  onChange: (minutes: number) => void;
};

const OPTIONS = [5, 15, 30] as const;

export default function SnoozeDurationSection(props: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Snooze Duration</Text>
      <View style={styles.row}>
        {OPTIONS.map((m) => (
          <Pressable
            key={m}
            onPress={() => props.onChange(m)}
            accessibilityRole="button"
            accessibilityState={{ selected: props.valueMinutes === m }}
            style={[styles.chip, props.valueMinutes === m && styles.chipOn]}>
            <Text style={[styles.chipText, props.valueMinutes === m && styles.chipTextOn]}>{`${m} min`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  kicker: { color: Colors.alpha.white35, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  row: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: Colors.dashboard.accent,
    borderColor: Colors.dashboard.accentSelectedBorder,
  },
  chipText: { color: Colors.alpha.white55, fontSize: 12, fontWeight: '900' },
  chipTextOn: { color: Colors.dashboard.bg, fontSize: 12, fontWeight: '900' },
});

