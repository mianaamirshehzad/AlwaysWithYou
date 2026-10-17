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

export type EmptyStateProps = {
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export default function EmptyState({
  iconName = 'file-tray-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
  compact = false,
}: EmptyStateProps) {
  return (
    <View
      style={[styles.container, compact && styles.containerCompact, style]}
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${description || ''}`}>
      <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
        <Ionicons
          name={iconName}
          size={compact ? 24 : 32}
          color={Colors.dashboard.accent}
        />
      </View>

      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>

      {description ? (
        <Text style={[styles.description, compact && styles.descriptionCompact]}>
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [
            styles.actionButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: Colors.dashboard.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    gap: 8,
  },
  containerCompact: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 18,
    gap: 6,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dashboard.accentIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconWrapCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 2,
  },
  title: {
    color: Colors.dashboard.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 15,
  },
  description: {
    color: Colors.alpha.white55,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  descriptionCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionButton: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.dashboard.accentSoftBg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.dashboard.accentSoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: Colors.dashboard.accentText,
    fontSize: 13,
    fontWeight: '800',
  },
});

