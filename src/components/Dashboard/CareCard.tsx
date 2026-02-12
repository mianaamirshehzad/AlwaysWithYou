import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

export type CareStatus = 'acknowledged' | 'done' | 'missed' | 'sent' | 'upcoming';

type Props = {
  title: string;
  time: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  status: CareStatus;
  statusLabel?: string;
};

export default function CareCard(props: Props) {
  const status = getStatusTheme(props.status);

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: status.iconBg }]}>
        <Ionicons name={props.iconName} size={18} color={status.iconFg} />
      </View>

      <View style={styles.mid}>
        <Text style={styles.title}>{props.title}</Text>
        <Text style={styles.time}>{props.time}</Text>
      </View>

      <View style={[styles.statusPill, { backgroundColor: status.pillBg, borderColor: status.pillBorder }]}>
        <Text style={[styles.statusText, { color: status.pillText }]}>{props.statusLabel ?? status.defaultLabel}</Text>
      </View>
    </View>
  );
}

function getStatusTheme(status: CareStatus) {
  switch (status) {
    case 'acknowledged':
      return {
        defaultLabel: 'Acknowledged',
        pillBg: Colors.dashboard.accentSoftBg,
        pillBorder: Colors.dashboard.accentSoftBorder,
        pillText: Colors.dashboard.accentText,
        iconBg: Colors.dashboard.accentIconBg,
        iconFg: Colors.dashboard.accentText,
      };
    case 'done':
      return {
        defaultLabel: 'Done',
        pillBg: Colors.dashboard.accentSoftBg,
        pillBorder: Colors.dashboard.accentSoftBorder,
        pillText: Colors.dashboard.accentText,
        iconBg: Colors.dashboard.purpleSoftBg,
        iconFg: Colors.dashboard.purpleIconFg,
      };
    case 'missed':
      return {
        defaultLabel: 'Missed',
        pillBg: Colors.dashboard.dangerSoftBg,
        pillBorder: Colors.dashboard.dangerSoftBorder,
        pillText: Colors.dashboard.dangerText,
        iconBg: Colors.dashboard.dangerIconBg,
        iconFg: Colors.dashboard.dangerIconFg,
      };
    case 'sent':
      return {
        defaultLabel: 'Sent',
        pillBg: Colors.dashboard.infoSoftBg,
        pillBorder: Colors.dashboard.infoSoftBorder,
        pillText: Colors.dashboard.infoText,
        iconBg: Colors.dashboard.infoIconBg,
        iconFg: Colors.dashboard.infoIconFg,
      };
    case 'upcoming':
    default:
      return {
        defaultLabel: 'Upcoming',
        pillBg: Colors.dashboard.surfaceStrong,
        pillBorder: Colors.alpha.white08,
        pillText: Colors.alpha.white55,
        iconBg: Colors.dashboard.surfaceStrong,
        iconFg: Colors.alpha.white55,
      };
  }
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1 },
  title: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  time: { marginTop: 2, color: Colors.alpha.white45, fontSize: 11, fontWeight: '800' },
  statusPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '900' },
});

