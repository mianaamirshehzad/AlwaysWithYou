import * as React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  name: string;
  headline: string;
  avatarSource?: ImageSourcePropType;
};

export default function ProfileGreeting(props: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.avatarWrap}>
        {props.avatarSource ? (
          <Image source={props.avatarSource} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{getInitials(props.name)}</Text>
          </View>
        )}
        <View style={styles.statusDot} />
      </View>

      <View style={styles.textCol}>
        <Text style={styles.kicker}>Welcome back, {props.name}</Text>
        <Text style={styles.headline}>{props.headline}</Text>
      </View>
    </View>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 999 },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  avatarInitials: { color: Colors.alpha.white90, fontWeight: '800', fontSize: 16 },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
    borderWidth: 2,
    borderColor: Colors.dashboard.bg,
  },
  textCol: { flex: 1 },
  kicker: { color: Colors.alpha.white55, fontSize: 12, fontWeight: '700' },
  headline: { marginTop: 2, color: Colors.dashboard.text, fontSize: 20, lineHeight: 26, fontWeight: '900' },
});

