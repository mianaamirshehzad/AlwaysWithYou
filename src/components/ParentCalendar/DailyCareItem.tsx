import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

export type CareStatus = 'completed' | 'upcoming' | 'missed' | 'scheduled';

type Props = {
  title: string;
  timeLabel: string;
  status: CareStatus;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  actionLabel?: string;
  onPressAction?: () => void;
};

export default function DailyCareItem(props: Props) {
  const theme = statusTheme(props.status);

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.bg }]}>
      <View style={[styles.iconCircle, { backgroundColor: theme.iconBg }]}>
        <Ionicons name={props.iconName} size={18} color={theme.iconFg} />
      </View>

      <View style={styles.mid}>
        <Text style={styles.title}>{props.title}</Text>
        <Text style={styles.sub}>{props.timeLabel}</Text>
      </View>

      {props.actionLabel ? (
        <Pressable
          onPress={props.onPressAction}
          accessibilityRole="button"
          style={({ pressed }) => [styles.actionPill, { opacity: pressed ? 0.9 : 1, backgroundColor: theme.pillBg, borderColor: theme.pillBorder }]}>
          <Text style={[styles.actionText, { color: theme.pillText }]}>{props.actionLabel}</Text>
        </Pressable>
      ) : (
        <Ionicons name={theme.trailingIcon} size={18} color={theme.trailingIconColor} />
      )}
    </View>
  );
}

function statusTheme(status: CareStatus) {
  switch (status) {
    case 'completed':
      return {
        bg: Colors.dashboard.surface,
        border: Colors.dashboard.border,
        iconBg: Colors.dashboard.accentIconBg,
        iconFg: Colors.dashboard.accent,
        pillBg: Colors.dashboard.accentSoftBg,
        pillBorder: Colors.dashboard.accentSoftBorder,
        pillText: Colors.dashboard.accentText,
        trailingIcon: 'checkmark-circle',
        trailingIconColor: Colors.dashboard.accent,
      } as const;
    case 'missed':
      return {
        bg: Colors.dashboard.surface,
        border: Colors.dashboard.dangerSoftBorder,
        iconBg: Colors.dashboard.dangerIconBg,
        iconFg: Colors.dashboard.danger,
        pillBg: Colors.dashboard.dangerSoftBg,
        pillBorder: Colors.dashboard.dangerSoftBorder,
        pillText: Colors.dashboard.dangerText,
        trailingIcon: 'close-circle',
        trailingIconColor: Colors.dashboard.danger,
      } as const;
    case 'upcoming':
      return {
        bg: Colors.dashboard.surface,
        border: Colors.dashboard.border,
        iconBg: Colors.dashboard.surfaceStrong,
        iconFg: Colors.alpha.white75,
        pillBg: Colors.dashboard.infoSoftBg,
        pillBorder: Colors.dashboard.infoSoftBorder,
        pillText: Colors.dashboard.infoText,
        trailingIcon: 'time',
        trailingIconColor: Colors.alpha.white45,
      } as const;
    case 'scheduled':
    default:
      return {
        bg: Colors.dashboard.surface,
        border: Colors.dashboard.border,
        iconBg: Colors.dashboard.surfaceStrong,
        iconFg: Colors.alpha.white75,
        pillBg: Colors.dashboard.surfaceStrong,
        pillBorder: Colors.alpha.white08,
        pillText: Colors.alpha.white55,
        trailingIcon: 'ellipse',
        trailingIconColor: Colors.alpha.white45,
      } as const;
  }
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1, gap: 2 },
  title: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  sub: { color: Colors.alpha.white45, fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  actionPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionText: { fontSize: 11, fontWeight: '900' },
});

