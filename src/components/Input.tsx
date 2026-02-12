import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  /**
   * When provided, the icon becomes pressable (e.g. clear, toggle).
   * Otherwise it is decorative.
   */
  onIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  testID?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'editable' | 'placeholderTextColor'>;

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  iconName,
  onIconPress,
  containerStyle,
  inputStyle,
  disabled,
  testID,
  ...textInputProps
}: InputProps) {
  const IconWrap: any = onIconPress ? Pressable : View;

  return (
    <View style={containerStyle}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, disabled && styles.fieldDisabled]}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={PALETTE.placeholder}
          selectionColor={PALETTE.accent}
          style={[styles.input, inputStyle]}
          {...textInputProps}
        />
        {iconName ? (
          <IconWrap
            onPress={onIconPress}
            disabled={!onIconPress}
            accessibilityRole={onIconPress ? 'button' : undefined}
            accessibilityLabel={onIconPress ? `${label} icon` : undefined}
            style={styles.iconWrap}>
            <Ionicons name={iconName} size={18} color={PALETTE.icon} />
          </IconWrap>
        ) : null}
      </View>
    </View>
  );
}

const PALETTE = {
  label: Colors.alpha.white70,
  placeholder: Colors.alpha.white22,
  text: Colors.alpha.white70,
  icon: Colors.alpha.white30,
  fieldBg: Colors.alpha.white06,
  fieldBorder: Colors.alpha.white08,
  accent: Colors.brand.primary,
} as const;

const styles = StyleSheet.create({
  label: {
    color: PALETTE.label,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  field: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: PALETTE.fieldBg,
    borderWidth: 1,
    borderColor: PALETTE.fieldBorder,
    paddingLeft: 18,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldDisabled: {
    opacity: 0.55,
  },
  input: {
    flex: 1,
    color: PALETTE.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 14,
    paddingRight: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


