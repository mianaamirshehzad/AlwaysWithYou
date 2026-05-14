import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

export type WeekDay = { date: Date; dow: string; day: number };

type Props = {
  days: WeekDay[];
  selectedDate: Date;
  onSelect: (date: Date) => void;
};

export default function WeekStrip(props: Props) {
  return (
    <View style={styles.wrap}>
      {props.days.map((d) => {
        const on = isSameDay(d.date, props.selectedDate);
        return (
          <Pressable
            key={d.date.toISOString()}
            onPress={() => props.onSelect(d.date)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.cell, on && styles.cellOn]}>
            <Text style={[styles.dow, on && styles.dowOn]}>{d.dow}</Text>
            <Text style={[styles.day, on && styles.dayOn]}>{d.day}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cell: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cellOn: {
    backgroundColor: Colors.dashboard.accent,
    borderColor: Colors.dashboard.accentSelectedBorder,
  },
  dow: { color: Colors.alpha.white45, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  dowOn: { color: Colors.dashboard.bg },
  day: { color: Colors.alpha.white75, fontSize: 14, fontWeight: '900' },
  dayOn: { color: Colors.dashboard.bg },
});

