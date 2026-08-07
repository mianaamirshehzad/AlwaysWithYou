import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import childSettingsColors from './colors';

type Props = {
  pushNotifications: boolean;
  onTogglePushNotifications: (value: boolean) => void;
  dailySummaryEmail: boolean;
  onToggleDailySummaryEmail: (value: boolean) => void;
  reminderSoundLabel: string;
  onPressReminderSounds: () => void;
};

export default function PreferencesSection(props: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferences</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, styles.iconCircleOrange]}>
            <Ionicons name="notifications-outline" size={18} color={childSettingsColors.accent} />
          </View>
          <Text style={styles.label}>Push Notifications</Text>
          <Switch
            value={props.pushNotifications}
            onValueChange={props.onTogglePushNotifications}
            trackColor={{ false: childSettingsColors.switchTrackOff, true: childSettingsColors.accent }}
            thumbColor={childSettingsColors.white}
            ios_backgroundColor={childSettingsColors.switchTrackOff}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={[styles.iconCircle, styles.iconCirclePurple]}>
            <Ionicons name="mail-outline" size={18} color={childSettingsColors.purple} />
          </View>
          <Text style={styles.label}>Daily Summary Email</Text>
          <Switch
            value={props.dailySummaryEmail}
            onValueChange={props.onToggleDailySummaryEmail}
            trackColor={{ false: childSettingsColors.switchTrackOff, true: childSettingsColors.accent }}
            thumbColor={childSettingsColors.white}
            ios_backgroundColor={childSettingsColors.switchTrackOff}
          />
        </View>

        <View style={styles.divider} />

        <Pressable
          onPress={props.onPressReminderSounds}
          accessibilityRole="button"
          accessibilityLabel="Reminder Sounds"
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
          <View style={[styles.iconCircle, styles.iconCircleGreen]}>
            <Ionicons name="volume-medium-outline" size={18} color={childSettingsColors.green} />
          </View>
          <Text style={styles.label}>Reminder Sounds</Text>
          <Text style={styles.valueText}>{props.reminderSoundLabel}</Text>
          <Ionicons name="chevron-forward" size={18} color={childSettingsColors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: childSettingsColors.sectionTitle,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: childSettingsColors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: childSettingsColors.border,
    paddingHorizontal: 14,
    shadowColor: childSettingsColors.black,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 62,
    paddingVertical: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleOrange: { backgroundColor: childSettingsColors.accentSoft },
  iconCirclePurple: { backgroundColor: childSettingsColors.purpleSoft },
  iconCircleGreen: { backgroundColor: childSettingsColors.greenSoft },
  label: { flex: 1, color: childSettingsColors.text, fontSize: 14, fontWeight: '800' },
  valueText: { color: childSettingsColors.textMuted, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: childSettingsColors.divider },
});
