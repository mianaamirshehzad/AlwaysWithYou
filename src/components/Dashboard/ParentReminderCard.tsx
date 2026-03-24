import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';
import Images from '@/src/assets/Images';

type Props = {
  pillLabel?: string;
  title: string;
  timeLabel: string;
  fromName: string;
  onPressAction?: () => void;
  actionLabel?: string;
};

export default function ParentReminderCard(props: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.imageWrap}>
          <Image source={Images.medicine} style={styles.heroImg} resizeMode="cover" />
          <View style={styles.heroOverlay} />

          <View style={styles.pill}>
            <Ionicons name="notifications-outline" size={14} color={Colors.alpha.white85} />
            <Text style={styles.pillText}>{props.pillLabel ?? 'Time for medicine'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.title}>{props.title}</Text>
            {/* <View style={styles.squareBtn} accessibilityRole="button" accessibilityLabel="More">
              <Ionicons name="add" size={18} color={Colors.dashboard.accent} />
            </View> */}
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={Colors.alpha.white55} />
            <Text style={styles.metaText}>{props.timeLabel}</Text>
          </View>

          <View style={styles.fromRow}>
            <View style={styles.fromAvatar}>
              <Ionicons name="person" size={14} color={Colors.alpha.white55} />
            </View>
            <View style={styles.fromTextCol}>
              <Text style={styles.fromKicker}>REMINDER FROM</Text>
              <Text style={styles.fromName}>{props.fromName}</Text>
            </View>
          </View>

          <Pressable
            onPress={props.onPressAction}
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.92 : 1 }]}>
            <Text style={styles.actionText}>{props.actionLabel ?? 'I took them'}</Text>
            <View style={styles.actionIcon}>
              <Ionicons name="checkmark" size={18} color={Colors.dashboard.bg} />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 26, overflow: 'hidden' },
  hero: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  imageWrap: { position: 'relative' },
  heroImg: { width: '100%', height: 210, opacity: 1 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.auth.overlayStrong },
  pill: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  pillText: { color: Colors.alpha.white85, fontSize: 12, fontWeight: '900' },

  card: {
    marginTop: -44,
    padding: 14,
    backgroundColor: Colors.auth.overlayStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    gap: 12,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: Colors.dashboard.text, fontSize: 22, fontWeight: '900' },
  squareBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: Colors.alpha.white55, fontSize: 12, fontWeight: '900' },
  fromRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  fromAvatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fromTextCol: { gap: 2 },
  fromKicker: { color: Colors.alpha.white35, fontSize: 10, letterSpacing: 1.2, fontWeight: '900' },
  fromName: { color: Colors.dashboard.text, fontSize: 12, fontWeight: '900' },

  actionBtn: {
    width: '100%',
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: Colors.dashboard.accent,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionText: { color: Colors.dashboard.bg, fontSize: 16, fontWeight: '900' },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: Colors.alpha.white85,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

