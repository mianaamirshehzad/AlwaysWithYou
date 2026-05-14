import * as React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';
import Images from '@/src/assets/Images';

export default function CalendarPromoCard() {
  return (
    <View style={styles.card}>
      <View style={styles.media}>
        <Image source={Images.hands} style={styles.img} resizeMode="cover" />
        <View style={styles.overlay} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>New care goal?</Text>
        <Text style={styles.sub}>Stay on track with personalized reminders</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  media: { height: 120 },
  img: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.95 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.auth.overlayStrong },
  body: { padding: 14, gap: 4 },
  title: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  sub: { color: Colors.alpha.white45, fontSize: 11, fontWeight: '800' },
});

