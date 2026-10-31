import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/src/assets/Colors';
import type { TaskType } from '@/src/models';

type Props = {
  visible: boolean;
  type: TaskType;
  title: string;
  parentName: string;
  isSending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const TASK_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  water: 'water-outline',
  medicine: 'medical-outline',
  call: 'call-outline',
  walk: 'walk-outline',
  exercise: 'fitness-outline',
  custom: 'notifications-outline',
};

export default function QuickSendConfirmModal({
  visible,
  type,
  title,
  parentName,
  isSending,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const iconName = TASK_ICONS[type] ?? 'notifications-outline';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isSending ? () => {} : onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon Badge */}
          <View style={styles.iconCircle}>
            <Ionicons name={iconName} size={36} color={Colors.dashboard.accent} />
          </View>

          {/* Titles */}
          <Text style={styles.title}>Send Quick Reminder</Text>
          <Text style={styles.message}>
            Are you sure you want to send a <Text style={styles.highlightText}>&quot;{title}&quot;</Text>{' '}
            reminder to <Text style={styles.highlightText}>{parentName}</Text>?
          </Text>

          {/* Error Message if any */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action State: Sending vs Idle */}
          {isSending ? (
            <View style={styles.sendingContainer}>
              <ActivityIndicator size="small" color={Colors.dashboard.accent} />
              <Text style={styles.sendingText}>
                Sending reminder to {parentName}... Please wait.
              </Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <Pressable
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel reminder"
                style={({ pressed }) => [
                  styles.cancelBtn,
                  { opacity: pressed ? 0.8 : 1 },
                ]}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={onConfirm}
                accessibilityRole="button"
                accessibilityLabel="Confirm send reminder"
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { opacity: pressed ? 0.85 : 1 },
                ]}>
                <Ionicons name="send" size={16} color={Colors.dashboard.bg} />
                <Text style={styles.confirmBtnText}>Send Reminder</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dashboard.accentIconBg,
    borderWidth: 1.5,
    borderColor: Colors.dashboard.accentSoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: Colors.dashboard.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: Colors.alpha.white70,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    textAlign: 'center',
  },
  highlightText: {
    color: Colors.dashboard.accent,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  sendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    width: '100%',
  },
  sendingText: {
    color: Colors.dashboard.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: Colors.alpha.white70,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: Colors.dashboard.accent,
    borderWidth: 1,
    borderColor: Colors.dashboard.accent,
  },
  confirmBtnText: {
    color: Colors.dashboard.bg,
    fontSize: 14,
    fontWeight: '900',
  },
});

