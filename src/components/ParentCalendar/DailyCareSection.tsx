import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';
import DailyCareItem, { CareStatus } from './DailyCareItem';

type Props = {
  // Keep iconName loosely typed to avoid coupling to icon types here.
  items: Array<{ title: string; timeLabel: string; status: CareStatus; iconName: any; actionLabel?: string }>;
  onViewAll?: () => void;
};

export default function DailyCareSection(props: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Care</Text>
        <Pressable onPress={props.onViewAll} accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <Text style={styles.viewAll}>VIEW ALL</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {props.items.map((it) => (
          <DailyCareItem
            key={`${it.title}-${it.timeLabel}`}
            title={it.title}
            timeLabel={it.timeLabel}
            status={it.status}
            iconName={it.iconName}
            actionLabel={it.actionLabel}
            onPressAction={() => {}}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    padding: 14,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  viewAll: { color: Colors.dashboard.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  list: { gap: 10 },
});

