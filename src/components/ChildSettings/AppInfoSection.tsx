import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import childSettingsColors from './colors';

type Props = {
  onHelpPress: () => void;
  onPrivacyPress: () => void;
  onTermsPress: () => void;
};

export default function AppInfoSection(props: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>App Info</Text>

      <View style={styles.card}>
        <Pressable
          onPress={props.onHelpPress}
          accessibilityRole="button"
          accessibilityLabel="Help and Support"
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.label}>Help &amp; Support</Text>
          <Ionicons name="open-outline" size={18} color={childSettingsColors.textSecondary} />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={props.onPrivacyPress}
          accessibilityRole="button"
          accessibilityLabel="Privacy Policy"
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.label}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={18} color={childSettingsColors.textSecondary} />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={props.onTermsPress}
          accessibilityRole="button"
          accessibilityLabel="Terms of Service"
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.label}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={18} color={childSettingsColors.textSecondary} />
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
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
  },
  label: { color: childSettingsColors.text, fontSize: 14, fontWeight: '800' },
  divider: { height: 1, backgroundColor: childSettingsColors.divider },
});
