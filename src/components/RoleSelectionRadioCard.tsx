import * as React from 'react';
import { StyleProp, TextStyle, ViewStyle, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import Colors from '@/src/assets/Colors';

type RoleSelectionRadioCardProps = {
  /** Defaults to "I'm a Child" */
  title?: string;
  /** Defaults to "I want to send reminders" */
  subtitle?: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;

  /** Optional left icon bubble (matches the design). */
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
};

/**
 * Dark onboarding-style role option card with a right-side radio indicator.
 * Built to match the provided Stitch screenshot.
 */
export function RoleSelectionRadioCard({
  title = "I'm a Child",
  subtitle = 'I want to send reminders',
  selected = false,
  onPress,
  disabled = false,
  testID,
  iconName = 'heart-circle-outline',
  style,
  titleStyle,
  subtitleStyle,
}: RoleSelectionRadioCardProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.container,
        selected && styles.containerSelected,
        disabled && styles.containerDisabled,
        { opacity: disabled ? 0.5 : pressed ? 0.92 : 1 },
        style,
      ]}>
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
        <Ionicons name={iconName} size={22} color={selected ? PALETTE.accent : Colors.alpha.white78} />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, titleStyle]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
}

export default RoleSelectionRadioCard;

const PALETTE = {
  bg: Colors.auth.bg,
  chipBg: Colors.alpha.white06,
  chipBorder: Colors.alpha.white08,
  chipSelectedBg: Colors.auth.roleSelectedBg,
  chipSelectedBorder: Colors.auth.roleSelectedBorder,
  text: Colors.auth.text,
  subtle: Colors.alpha.white60,
  accent: Colors.auth.roleAccent,
  accentSoft: Colors.auth.roleAccentSoft,
} as const;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 26,
    backgroundColor: PALETTE.chipBg,
    borderWidth: 1,
    borderColor: PALETTE.chipBorder,
    minHeight: 88,
  },
  containerSelected: {
    backgroundColor: PALETTE.chipSelectedBg,
    borderColor: PALETTE.chipSelectedBorder,
  },
  containerDisabled: {
    borderColor: Colors.alpha.white06,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.alpha.white08,
  },
  iconWrapSelected: {
    backgroundColor: PALETTE.accentSoft,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: PALETTE.text,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: PALETTE.subtle,
    fontSize: 16,
    fontWeight: '500',
  },
  radioOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.alpha.white25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: PALETTE.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PALETTE.accent,
  },
});


