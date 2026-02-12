import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  title?: string;
  subtitle?: string;
  percent: number; // 0..100
  streakLabel?: string;
  completedLabel?: string;
  missedLabel?: string;
};

export default function SummaryCard(props: Props) {
  const percent = clamp(props.percent, 0, 100);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>{props.title ?? "Today's Summary"}</Text>
          <Text style={styles.subtitle}>{props.subtitle ?? 'Completion rate'}</Text>
        </View>

        <View style={styles.streakChip}>
          <Ionicons name="flame" size={14} color={Colors.dashboard.warning} />
          <Text style={styles.streakText}>{props.streakLabel ?? '5 DAY STREAK'}</Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <Text style={styles.percentText}>{Math.round(percent)}%</Text>
        <Text style={styles.metricSuffix}>of tasks done</Text>
      </View>

      <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.bottomText}>{props.completedLabel ?? '3 completed'}</Text>
        <Text style={styles.bottomText}>{props.missedLabel ?? '1 missed'}</Text>
      </View>
    </View>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    borderRadius: 22,
    padding: 16,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  subtitle: { marginTop: 2, color: Colors.alpha.white50, fontSize: 12, fontWeight: '700' },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.warningSoftBg,
    borderWidth: 1,
    borderColor: Colors.dashboard.warningSoftBorder,
  },
  streakText: { color: Colors.dashboard.warningText, fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14 },
  percentText: { color: Colors.dashboard.text, fontSize: 36, lineHeight: 40, fontWeight: '900' },
  metricSuffix: { color: Colors.alpha.white55, fontSize: 12, fontWeight: '800', paddingBottom: 6 },
  progressTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 999,
    backgroundColor: Colors.alpha.white10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.dashboard.accent, borderRadius: 999 },
  bottomRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  bottomText: { color: Colors.alpha.white45, fontSize: 11, fontWeight: '800' },
});

