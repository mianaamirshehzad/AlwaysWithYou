import * as React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type ButtonProps = {
  onPress: () => void;
  /**
   * Label text shown inside the button.
   * Defaults to "Continue" to match the Stitch design.
   */
  label?: string;
  /**
   * Show a right-side arrow icon.
   * Defaults to false so the button can also match CTAs like "Link Account".
   */
  showArrow?: boolean;
  /**
   * Icon used when `showArrow` is true.
   */
  arrowIconName?: React.ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function Button({
  onPress,
  label = 'Continue',
  showArrow = false,
  arrowIconName = 'arrow-forward',
  disabled,
  testID,
  accessibilityLabel,
  style,
  labelStyle,
}: ButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        disabled ? styles.disabled : null,
        { opacity: disabled ? 0.45 : pressed ? 0.92 : 1 },
        style,
      ]}>
      <View style={styles.inner}>
        <Text style={[styles.label, labelStyle]} numberOfLines={1}>
          {label}
        </Text>
        {showArrow ? <Ionicons name={arrowIconName} size={20} color={styles.label.color} /> : null}
      </View>
    </Pressable>
  );
}

export default Button;

const styles = StyleSheet.create({
  base: {
    width: '100%',
    minHeight: 60,
    borderRadius: 999,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.primary,
    ...(Platform.select({
      ios: {
        shadowColor: Colors.dark.background,
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 10 },
      default: {},
    }) as object),
  },
  disabled: {
    backgroundColor: Colors.brand.primary,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    color: Colors.brand.onPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
