import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Colors from '@/src/assets/Colors';

export type SuccessFeedbackProps = {
  message: string;
  visible: boolean;
  onDismiss?: () => void;
  autoHideDurationMs?: number;
  style?: StyleProp<ViewStyle>;
};

export default function SuccessFeedback({
  message,
  visible,
  onDismiss,
  autoHideDurationMs = 3000,
  style,
}: SuccessFeedbackProps) {
  React.useEffect(() => {
    if (!visible || !onDismiss || autoHideDurationMs <= 0) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, autoHideDurationMs);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, autoHideDurationMs]);

  if (!visible) return null;

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Success: ${message}`}>
      <Ionicons
        name="checkmark-circle-outline"
        size={20}
        color={Colors.dashboard.accentText}
        style={styles.icon}
      />
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>

      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          hitSlop={8}
          style={({ pressed }) => [
            styles.dismissButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}>
          <Ionicons
            name="close"
            size={18}
            color={Colors.dashboard.accentText}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dashboard.accentSoftBg,
    borderColor: Colors.dashboard.accentSoftBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  icon: {
    flexShrink: 0,
  },
  message: {
    color: Colors.dashboard.accentText,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  dismissButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
