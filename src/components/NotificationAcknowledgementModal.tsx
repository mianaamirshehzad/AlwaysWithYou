import Ionicons from '@expo/vector-icons/Ionicons';
import * as Notifications from 'expo-notifications';
import * as React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import Images from '@/src/assets/Images';
import { usePreferences } from '@/src/context/PreferencesContext';
import { getImageForTaskType, getIconForTaskType } from '@/src/utils/reminders';
import type { TaskType } from '@/src/models';

type Props = {
  visible: boolean;
  onClose: () => void;
  fromName?: string;
  note?: string;
  type?: TaskType | string;
  timeLabel?: string;
  title?: string;
  message?: string;
  imageSource?: ImageSourcePropType;
  snoozeMinutes?: number;
  soundEnabled?: boolean;
  vibrateEnabled?: boolean;
  onAcknowledge?: () => void;
  onSnooze?: () => void;
};

export default function NotificationAcknowledgementModal(props: Props) {
  const { preferences } = usePreferences();
  const soundEnabled = props.soundEnabled ?? preferences?.soundEnabled ?? true;
  const vibrateEnabled = props.vibrateEnabled ?? preferences?.vibrateEnabled ?? false;

  const fromName = props.fromName ?? 'Sarah';
  const displayFrom = fromName;
  const timeLabel = props.timeLabel ?? 'NOW';
  const title = props.title ?? 'Care Reminder';
  const defaultMsg = props.note?.trim()
    ? `"${props.note.trim()}"`
    : '"Hi Dad, a gentle\nreminder to take care\nright now!"';
  const message = props.message ?? defaultMsg;
  const snoozeMinutes = props.snoozeMinutes ?? 15;

  const inferredType = React.useMemo(() => {
    if (props.type) return props.type;
    const t = (props.title ?? '').toLowerCase();
    if (t.includes('med') || t.includes('pill')) return 'medicine';
    if (t.includes('water') || t.includes('drink')) return 'water';
    if (t.includes('walk')) return 'walk';
    if (t.includes('exercise') || t.includes('fitness')) return 'exercise';
    if (t.includes('call')) return 'call';
    return 'custom';
  }, [props.type, props.title]);

  const imageSource = props.imageSource ?? getImageForTaskType(inferredType);
  const iconName = getIconForTaskType(inferredType);

  React.useEffect(() => {
    if (!props.visible) {
      try {
        Vibration.cancel();
      } catch {}
      return;
    }

    // Trigger vibration based on parent's profile setting
    if (vibrateEnabled) {
      try {
        Vibration.vibrate([0, 500, 250, 500]);
      } catch (err) {
        console.warn('Vibration error:', err);
      }
    }

    // Trigger alert sound based on parent's profile setting
    if (soundEnabled && Platform.OS !== 'web') {
      Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: defaultMsg,
          sound: 'default',
        },
        trigger: null,
      }).catch(() => {});
    }

    return () => {
      try {
        Vibration.cancel();
      } catch {}
    };
  }, [props.visible, vibrateEnabled, soundEnabled, title, defaultMsg]);

  const handleClose = () => {
    try {
      Vibration.cancel();
    } catch {}
    props.onClose();
  };

  const handleAcknowledge = () => {
    try {
      Vibration.cancel();
    } catch {}
    props.onAcknowledge?.();
    props.onClose();
  };

  const handleSnooze = () => {
    try {
      Vibration.cancel();
    } catch {}
    props.onSnooze?.();
  };

  return (
    <Modal visible={props.visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topRow}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="close" size={20} color={Colors.alpha.white85} />
          </Pressable>
          <Text style={styles.nowText}>{timeLabel}</Text>
        </View>

        <View style={styles.center}>
          <View style={styles.profileWrap}>
            <View style={styles.avatarHalo}>
              <View style={styles.avatarRing}>
                <View style={styles.avatarInner}>
                  <Image source={Images.hands} style={styles.avatarImg} />
                </View>
              </View>
            </View>

            <View style={styles.fromChip}>
              <Ionicons name="heart" size={12} color={Colors.dashboard.accent} />
              <Text style={styles.fromChipText} numberOfLines={1}>From {displayFrom}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.media}>
              <Image source={imageSource} style={styles.mediaImg} resizeMode="cover" />
              <View style={styles.mediaOverlay} />
              <View style={styles.mediaOverlayBottom} />
              <View style={styles.dropCircle}>
                <Ionicons name={iconName} size={26} color={Colors.dashboard.accent} />
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottom}>
          <Pressable
            onPress={handleAcknowledge}
            accessibilityRole="button"
            accessibilityLabel="Acknowledged"
            style={({ pressed }) => [styles.ackBtn, { opacity: pressed ? 0.92 : 1 }]}>
            <View style={styles.ackIcon}>
              <Ionicons name="checkmark" size={18} color={Colors.dashboard.bg} />
            </View>
            <View style={styles.ackTextCol}>
              <Text style={styles.ackTitle}>Acknowledged</Text>
              <Text style={styles.ackSub}>TAP TO CONFIRM</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleSnooze}
            accessibilityRole="button"
            accessibilityLabel={`Remind me in ${snoozeMinutes} minutes`}
            style={({ pressed }) => [styles.snoozeRow, { opacity: pressed ? 0.9 : 1 }]}>
            <Ionicons name="time-outline" size={16} color={Colors.alpha.white45} />
            <Text style={styles.snoozeText}>{`Remind me in ${snoozeMinutes} minutes`}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },

  topRow: {
    paddingHorizontal: 18,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowText: { color: Colors.alpha.white35, fontSize: 12, fontWeight: '900', letterSpacing: 1.6 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: -100, gap: 18 },

  profileWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative', paddingBottom: 14 },
  avatarHalo: {
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accentSoftBg,
    borderWidth: 1,
    borderColor: Colors.dashboard.accentSoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 6,
    borderColor: Colors.dashboard.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 110,
    height: 110,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    backgroundColor: Colors.alpha.white10,
  },
  avatarImg: { width: '100%', height: '100%', opacity: 0.95 },

  fromChip: {
    position: 'absolute',
    bottom: 0,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  fromChipText: { color: Colors.alpha.white75, fontSize: 12, fontWeight: '900' },

  card: {
    width: '100%',
    borderRadius: 30,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    padding: 10,
    gap: 14,
  },
  media: {
    height: 190,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: Colors.dashboard.surfaceStrong,
  },
  mediaImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  mediaOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.alpha.black80, opacity: 0.12 },
  mediaOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: Colors.alpha.black80,
    opacity: 0.28,
  },
  dropCircle: {
    position: 'absolute',
    alignSelf: 'center',
    top: 60,
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { paddingHorizontal: 10, paddingBottom: 6, alignItems: 'center', gap: 12 },
  title: { color: Colors.dashboard.text, fontSize: 32, lineHeight: 36, fontWeight: '900' },
  message: {
    color: Colors.alpha.white55,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },

  bottom: { paddingHorizontal: 18, paddingBottom: 18, gap: 14 },
  ackBtn: {
    width: '100%',
    minHeight: 62,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  ackIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: Colors.alpha.white85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackTextCol: { alignItems: 'flex-start' },
  ackTitle: { color: Colors.dashboard.bg, fontSize: 18, fontWeight: '900' },
  ackSub: { marginTop: 2, color: Colors.dashboard.bg, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, opacity: 0.75 },

  snoozeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  snoozeText: { color: Colors.alpha.white45, fontSize: 13, fontWeight: '900' },
});

