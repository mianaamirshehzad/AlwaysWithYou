import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  title: string;
  subtitle: string;
  onPrev?: () => void;
  onNext?: () => void;
};

export default function ParentCalendarHeader(props: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons name="settings-outline" size={16} color={Colors.alpha.white45} />
        <Text style={styles.title}>{props.title}</Text>
      </View>
      <View style={styles.subRow}>
        <Text style={styles.subtitle}>{props.subtitle}</Text>
        <View style={styles.nav}>
          <Pressable
            onPress={props.onPrev}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="chevron-back" size={16} color={Colors.alpha.white75} />
          </Pressable>
          <Pressable
            onPress={props.onNext}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="chevron-forward" size={16} color={Colors.alpha.white75} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { color: Colors.alpha.white55, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subtitle: { color: Colors.dashboard.text, fontSize: 16, fontWeight: '900' },
  nav: { flexDirection: 'row', gap: 10 },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

