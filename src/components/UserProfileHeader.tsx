import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  name: string;
  subtitle?: string;
  avatarSource?: ImageSourcePropType;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  badgeIconName?: React.ComponentProps<typeof Ionicons>['name'];
  showBadge?: boolean;
};

export default function UserProfileHeader(props: Props) {
  const size = props.size ?? 'lg';
  const dims = sizeMap[size];

  return (
    <View style={[styles.wrap, props.style]}>
      <View style={[styles.avatarWrap, { width: dims.ring, height: dims.ring, borderRadius: dims.ring / 2 }]}>
        <View style={[styles.avatarInner, { width: dims.inner, height: dims.inner, borderRadius: dims.inner / 2 }]}>
          {props.avatarSource ? <Image source={props.avatarSource} style={styles.avatarImg} /> : <View style={styles.fallback} />}
        </View>

        {props.showBadge ? (
          <View
            style={[
              styles.badge,
              {
                width: dims.badge,
                height: dims.badge,
                borderRadius: dims.badge / 2,
                borderWidth: Math.max(2, Math.round(dims.badge / 6)),
              },
            ]}>
            <Ionicons name={props.badgeIconName ?? 'checkmark'} size={Math.round(dims.badge / 1.6)} color={Colors.dashboard.bg} />
          </View>
        ) : null}
      </View>

      <Text style={styles.name}>{props.name}</Text>
      {props.subtitle ? <Text style={styles.subtitle}>{props.subtitle}</Text> : null}
    </View>
  );
}

const sizeMap = {
  sm: { ring: 64, inner: 50, badge: 18 },
  md: { ring: 84, inner: 66, badge: 20 },
  lg: { ring: 108, inner: 86, badge: 22 },
} as const;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  avatarWrap: {
    position: 'relative',
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    overflow: 'hidden',
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  avatarImg: { width: '100%', height: '100%', opacity: 0.98 },
  fallback: { flex: 1, backgroundColor: Colors.dashboard.surface },
  badge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: Colors.dashboard.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.dashboard.bg,
  },
  name: { color: Colors.dashboard.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
  subtitle: { color: Colors.alpha.white45, fontSize: 12, fontWeight: '800', textAlign: 'center' },
});

