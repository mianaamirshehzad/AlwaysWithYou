import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import childSettingsColors from './colors';

type Props = {
  name: string;
  roleLabel: string;
  avatarSource?: ImageSourcePropType;
  onEditProfile: () => void;
};

export default function ChildProfileCard(props: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        {props.avatarSource ? (
          <Image source={props.avatarSource} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback} />
        )}
        <Pressable
          onPress={props.onEditProfile}
          accessibilityRole="button"
          accessibilityLabel="Edit profile picture"
          hitSlop={6}
          style={({ pressed }) => [styles.editBadge, { opacity: pressed ? 0.9 : 1 }]}>
          <Ionicons name="pencil" size={12} color={childSettingsColors.white} />
        </Pressable>
      </View>

      <Text style={styles.name}>{props.name}</Text>
      <Text style={styles.roleLabel}>{props.roleLabel}</Text>

      <Pressable
        onPress={props.onEditProfile}
        accessibilityRole="button"
        accessibilityLabel="Edit Profile"
        style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.92 : 1 }]}>
        <Text style={styles.editBtnText}>Edit Profile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: childSettingsColors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: childSettingsColors.border,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
    shadowColor: childSettingsColors.black,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: childSettingsColors.white,
    backgroundColor: childSettingsColors.divider,
    shadowColor: childSettingsColors.black,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: childSettingsColors.white,
    backgroundColor: childSettingsColors.divider,
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: childSettingsColors.accent,
    borderWidth: 2.5,
    borderColor: childSettingsColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: childSettingsColors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  roleLabel: {
    color: childSettingsColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  editBtn: {
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: childSettingsColors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  editBtnText: {
    color: childSettingsColors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
