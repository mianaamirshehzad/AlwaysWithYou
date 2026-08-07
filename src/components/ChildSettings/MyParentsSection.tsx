import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import childSettingsColors from './colors';

export type ParentEntry = {
  id: string;
  name: string;
  lastActive: string;
  avatarSource?: ImageSourcePropType;
  onPress?: () => void;
};

type Props = {
  parents: ParentEntry[];
  onAddParent: () => void;
};

export default function MyParentsSection(props: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>My Parents</Text>

      <View style={styles.card}>
        {props.parents.map((parent, index) => (
          <React.Fragment key={parent.id}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              onPress={parent.onPress}
              accessibilityRole="button"
              accessibilityLabel={parent.name}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
              <View style={styles.avatarWrap}>
                {parent.avatarSource ? (
                  <Image source={parent.avatarSource} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback} />
                )}
              </View>
              <View style={styles.textCol}>
                <Text style={styles.name}>{parent.name}</Text>
                <Text style={styles.lastActive}>{parent.lastActive}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={childSettingsColors.textMuted} />
            </Pressable>
          </React.Fragment>
        ))}

        <View style={styles.divider} />

        <Pressable
          onPress={props.onAddParent}
          accessibilityRole="button"
          accessibilityLabel="Add New Parent"
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
          <View style={styles.addCircle}>
            <Ionicons name="person-add-outline" size={20} color={childSettingsColors.accent} />
          </View>
          <Text style={styles.addText}>Add New Parent</Text>
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
    gap: 12,
    minHeight: 64,
    paddingVertical: 8,
  },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: childSettingsColors.divider,
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, backgroundColor: childSettingsColors.divider },
  textCol: { flex: 1, gap: 2 },
  name: { color: childSettingsColors.text, fontSize: 14, fontWeight: '800' },
  lastActive: { color: childSettingsColors.textSecondary, fontSize: 12, fontWeight: '500' },
  addCircle: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: childSettingsColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: childSettingsColors.accent, fontSize: 14, fontWeight: '800' },
  divider: { height: 1, backgroundColor: childSettingsColors.divider },
});
