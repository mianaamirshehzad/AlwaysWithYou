import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  title: string;
  subtitle: string;
  timeLabel: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
};

export default function UpcomingReminderCard(props: Props) {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.left}>
        <View style={styles.iconCircle} accessibilityLabel={`${props.title} icon`}>
          <Ionicons name={props.iconName} size={18} color={Colors.alpha.white75} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>{props.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{props.subtitle}</Text>
        </View>
      </View>

      <Text style={styles.time}>{props.timeLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { gap: 2, flex: 1 },
  title: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  subtitle: { color: Colors.alpha.white45, fontSize: 11, fontWeight: '800' },
  time: { color: Colors.alpha.white55, fontSize: 12, fontWeight: '900', marginLeft: 12 },
});
