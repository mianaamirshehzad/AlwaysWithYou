import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  percent: number; // 0..100
  completedLabel: string;
  hint: string;
};

export default function ProgressCard(props: Props) {
  const p = clamp(props.percent, 0, 100);

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.kicker}>Today&apos;s Progress</Text>
        <Text style={styles.big}>{`${Math.round(p)}% Complete`}</Text>
        <Text style={styles.hint}>{props.hint}</Text>
      </View>

      <View style={styles.ringWrap} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: p }}>
        <View style={styles.ringOuter}>
          <View style={[styles.ringFill, { opacity: 1 }]} />
          <View style={styles.ringInner}>
            <Text style={styles.ringText}>{`${Math.round(p / 10)}/${10}`}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  left: { flex: 1, gap: 6 },
  kicker: { color: Colors.alpha.white45, fontSize: 11, fontWeight: '900' },
  big: { color: Colors.dashboard.text, fontSize: 18, fontWeight: '900' },
  hint: { color: Colors.alpha.white45, fontSize: 11, fontWeight: '800' },

  ringWrap: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  ringOuter: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 2,
    borderColor: Colors.dashboard.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: Colors.dashboard.accent,
    opacity: 0.25,
  },
  ringInner: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.bg,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: { color: Colors.alpha.white75, fontSize: 11, fontWeight: '900' },
});

