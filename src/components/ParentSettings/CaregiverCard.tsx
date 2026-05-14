import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/src/assets/Colors';

type Props = {
  name: string;
  relation?: string;
  avatarSource?: ImageSourcePropType;
  onCall?: () => void;
};

export default function CaregiverCard(props: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>My Caregiver</Text>

      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.avatarWrap}>
            {props.avatarSource ? <Image source={props.avatarSource} style={styles.avatar} /> : <View style={styles.avatarFallback} />}
          </View>
          <View style={styles.textCol}>
            <Text style={styles.name}>{props.name}</Text>
            <Text style={styles.sub}>{props.relation ?? 'Caregiver'}</Text>
          </View>
        </View>

        <Pressable
          onPress={props.onCall}
          accessibilityRole="button"
          accessibilityLabel="Call caregiver"
          style={({ pressed }) => [styles.callBtn, { opacity: pressed ? 0.9 : 1 }]}>
          <Ionicons name="call" size={18} color={Colors.dashboard.bg} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    borderRadius: 24,
    padding: 14,
    gap: 12,
  },
  title: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  avatar: { width: '100%', height: '100%', opacity: 0.98 },
  avatarFallback: { flex: 1, backgroundColor: Colors.dashboard.surfaceStrong },
  textCol: { gap: 2, flex: 1 },
  name: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  sub: { color: Colors.alpha.white45, fontSize: 11, fontWeight: '800' },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

