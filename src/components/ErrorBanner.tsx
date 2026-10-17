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

export type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Retry',
  onDismiss,
  style,
}: ErrorBannerProps) {
  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`Error: ${message}`}>
      <Ionicons
        name="alert-circle-outline"
        size={20}
        color={Colors.dashboard.danger}
        style={styles.icon}
      />
      <Text style={styles.message} numberOfLines={3}>
        {message}
      </Text>

      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          hitSlop={8}
          style={({ pressed }) => [
            styles.retryButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}>
          <Ionicons name="refresh" size={14} color={Colors.dashboard.dangerText} />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </Pressable>
      ) : null}

      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
          hitSlop={8}
          style={({ pressed }) => [
            styles.dismissButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}>
          <Ionicons name="close" size={18} color={Colors.dashboard.dangerText} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dashboard.dangerSoftBg,
    borderColor: Colors.dashboard.dangerSoftBorder,
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
    color: Colors.dashboard.dangerText,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  retryText: {
    color: Colors.dashboard.dangerText,
    fontSize: 12,
    fontWeight: '800',
  },
  dismissButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

