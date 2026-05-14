import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  playSound: boolean;
  onTogglePlaySound: (v: boolean) => void;
  vibrate: boolean;
  onToggleVibrate: (v: boolean) => void;
};

export default function SoundAlertsSection(props: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Sound &amp; Alerts</Text>

      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.iconCircle}>
            <Ionicons name="volume-medium-outline" size={16} color={Colors.alpha.white75} />
          </View>
          <Text style={styles.label}>Play Sound</Text>
        </View>
        <Switch
          value={props.playSound}
          onValueChange={props.onTogglePlaySound}
          trackColor={{ false: Colors.dashboard.surfaceStrong, true: Colors.dashboard.accentSoftBg }}
          thumbColor={props.playSound ? Colors.dashboard.accent : Colors.alpha.white55}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.iconCircle}>
            <Ionicons name="phone-portrait-outline" size={16} color={Colors.alpha.white75} />
          </View>
          <Text style={styles.label}>Vibrate</Text>
        </View>
        <Switch
          value={props.vibrate}
          onValueChange={props.onToggleVibrate}
          trackColor={{ false: Colors.dashboard.surfaceStrong, true: Colors.dashboard.accentSoftBg }}
          thumbColor={props.vibrate ? Colors.dashboard.accent : Colors.alpha.white55}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    borderRadius: 24,
    padding: 14,
    gap: 10,
  },
  title: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: Colors.alpha.white75, fontSize: 13, fontWeight: '900' },
  divider: { height: 1, backgroundColor: Colors.dashboard.border },
});

