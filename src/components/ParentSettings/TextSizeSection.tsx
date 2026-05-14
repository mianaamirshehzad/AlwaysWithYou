import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  value: number; // 0..1
  onChange: (v: number) => void;
};

export default function TextSizeSection(props: Props) {
  const v = clamp(props.value, 0, 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Text Size</Text>
      <View style={styles.sliderRow}>
        <Text style={styles.aSmall}>A-</Text>

        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Text size"
          onPress={(e) => {
            const x = e.nativeEvent.locationX;
            const next = clamp(x / TRACK_WIDTH, 0, 1);
            props.onChange(next);
          }}
          style={styles.trackWrap}>
          <View style={styles.track} />
          <View style={[styles.knob, { left: v * TRACK_WIDTH - KNOB / 2 }]} />
        </Pressable>

        <Text style={styles.aLarge}>A+</Text>
      </View>
    </View>
  );
}

const TRACK_WIDTH = 170;
const KNOB = 18;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    borderRadius: 24,
    padding: 14,
    gap: 14,
  },
  title: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aSmall: { color: Colors.alpha.white45, fontSize: 12, fontWeight: '900' },
  aLarge: { color: Colors.alpha.white75, fontSize: 14, fontWeight: '900' },
  trackWrap: { width: TRACK_WIDTH, height: 26, justifyContent: 'center' },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: Colors.dashboard.accent,
  },
});

