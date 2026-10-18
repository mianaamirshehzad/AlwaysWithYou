import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import childSettingsColors from './colors';
import { getInitials } from '@/src/utils/date';

type Props = {
  name: string;
  email?: string;
  phone?: string | null;
  roleLabel: string;
  avatarSource?: ImageSourcePropType;
  photoUrl?: string | null;
  onEditProfile: () => void;
  onEditPhoto?: () => void;
};

export default function ChildProfileCard(props: Props) {
  const displayPhone = props.phone && props.phone.trim() ? props.phone : 'Not set';

  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        {props.photoUrl ? (
          <Image source={{ uri: props.photoUrl }} style={styles.avatar} />
        ) : props.avatarSource ? (
          <Image source={props.avatarSource} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.fallbackInitials}>{getInitials(props.name || 'You')}</Text>
          </View>
        )}
        <Pressable
          onPress={props.onEditPhoto || props.onEditProfile}
          accessibilityRole="button"
          accessibilityLabel="Edit profile picture"
          hitSlop={6}
          style={({ pressed }) => [styles.editBadge, { opacity: pressed ? 0.9 : 1 }]}>
          <Ionicons name="camera" size={13} color={childSettingsColors.white} />
        </Pressable>
      </View>

      <Text style={styles.name}>{props.name}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleLabel}>{props.roleLabel}</Text>
      </View>

      {/* Profile Details above Edit Profile button */}
      <View style={styles.detailsBox}>
        <View style={styles.detailRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={15} color={childSettingsColors.accent} />
          </View>
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
              {props.email || '—'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="call-outline" size={15} color={childSettingsColors.accent} />
          </View>
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>{displayPhone}</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={props.onEditProfile}
        accessibilityRole="button"
        accessibilityLabel="Edit Profile"
        style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.92 : 1 }]}>
        <Ionicons name="pencil" size={15} color={childSettingsColors.white} />
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
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 8,
    shadowColor: childSettingsColors.black,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
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
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: childSettingsColors.white,
    backgroundColor: childSettingsColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackInitials: {
    color: childSettingsColors.accent,
    fontSize: 28,
    fontWeight: '900',
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
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
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: childSettingsColors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  roleLabel: {
    color: childSettingsColors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: childSettingsColors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: childSettingsColors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: childSettingsColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrap: {
    flex: 1,
    gap: 1,
  },
  detailLabel: {
    color: childSettingsColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: childSettingsColors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: childSettingsColors.border,
  },
  editBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: childSettingsColors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
  },
  editBtnText: {
    color: childSettingsColors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
