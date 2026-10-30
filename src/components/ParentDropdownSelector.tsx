import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/src/assets/Colors';
import { getInitials } from '@/src/utils/date';
import type { ParentProfile } from '@/src/context/RelationshipsContext';

type Props = {
  parents: ParentProfile[];
  selectedParent: ParentProfile | null;
  loading: boolean;
  onSelectParent: (uid: string) => void;
  onAddNewParent: () => void;
};

export default function ParentDropdownSelector({
  parents,
  selectedParent,
  loading,
  onSelectParent,
  onAddNewParent,
}: Props) {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedUid = selectedParent?.profile?.uid ?? selectedParent?.relationship.parentId ?? null;
  const parentName =
    selectedParent?.profile?.name ?? (loading ? 'Loading parent...' : 'No parent connected');
  const parentPhoto = selectedParent?.profile?.photoUrl ?? null;

  return (
    <View style={styles.wrapper}>
      {/* Trigger Chip */}
      <Pressable
        onPress={() => setIsOpen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel="Select parent"
        style={({ pressed }) => [
          styles.parentChip,
          isOpen && styles.parentChipOpen,
          { opacity: pressed ? 0.9 : 1 },
        ]}>
        <View style={styles.parentAvatar}>
          {parentPhoto ? (
            <Image source={{ uri: parentPhoto }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.parentAvatarText}>{getInitials(parentName)}</Text>
          )}
        </View>

        <View style={styles.parentChipTextCol}>
          <Text style={styles.parentKicker}>Caring for</Text>
          <Text style={styles.parentName} numberOfLines={1}>
            {parentName}
          </Text>
        </View>

        <View style={styles.chevronWrap}>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.dashboard.accent}
          />
        </View>
      </Pressable>

      {/* Dropdown Menu */}
      {isOpen && (
        <View style={styles.dropdownMenu}>
          <Text style={styles.dropdownHeader}>CONNECTED PARENTS</Text>

          {parents.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No parents connected yet.</Text>
            </View>
          ) : (
            parents.map((p) => {
              const uid = p.profile?.uid ?? p.relationship.parentId;
              const name = p.profile?.name ?? 'Parent';
              const photo = p.profile?.photoUrl ?? null;
              const isSelected = uid === selectedUid;

              return (
                <Pressable
                  key={p.relationship.id}
                  onPress={() => {
                    onSelectParent(uid);
                    setIsOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  style={({ pressed }) => [
                    styles.parentOption,
                    isSelected && styles.parentOptionSelected,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}>
                  <View style={styles.optionAvatar}>
                    {photo ? (
                      <Image source={{ uri: photo }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.optionAvatarText}>{getInitials(name)}</Text>
                    )}
                  </View>

                  <View style={styles.optionTextCol}>
                    <Text
                      style={[
                        styles.optionName,
                        isSelected && styles.optionNameSelected,
                      ]}
                      numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.optionSub}>
                      {isSelected ? 'Active Profile' : 'Tap to switch'}
                    </Text>
                  </View>

                  {isSelected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={Colors.dashboard.accent}
                    />
                  ) : (
                    <Ionicons
                      name="ellipse-outline"
                      size={20}
                      color={Colors.alpha.white30}
                    />
                  )}
                </Pressable>
              );
            })
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Add New Parent Option */}
          <Pressable
            onPress={() => {
              setIsOpen(false);
              onAddNewParent();
            }}
            accessibilityRole="button"
            accessibilityLabel="Add new parent"
            style={({ pressed }) => [
              styles.addNewParentBtn,
              { opacity: pressed ? 0.8 : 1 },
            ]}>
            <View style={styles.addIconCircle}>
              <Ionicons name="person-add-outline" size={18} color={Colors.dashboard.accent} />
            </View>
            <View style={styles.optionTextCol}>
              <Text style={styles.addNewParentText}>+ Add New Parent</Text>
              <Text style={styles.addNewParentSub}>Invite and link with a 6-digit code</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.alpha.white45} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 100,
    marginBottom: 14,
  },
  parentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dashboard.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    gap: 12,
  },
  parentChipOpen: {
    borderColor: Colors.dashboard.accentSoftBorder,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  parentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dashboard.accentIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.dashboard.accentSoftBorder,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  parentAvatarText: {
    color: Colors.dashboard.accent,
    fontWeight: '900',
    fontSize: 16,
  },
  parentChipTextCol: {
    flex: 1,
    gap: 2,
  },
  parentKicker: {
    color: Colors.dashboard.accent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  parentName: {
    color: Colors.dashboard.text,
    fontSize: 16,
    fontWeight: '900',
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dashboard.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dashboard.accentSoftBorder,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  dropdownHeader: {
    color: Colors.alpha.white45,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  emptyWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.alpha.white55,
    fontSize: 13,
    fontWeight: '600',
  },
  parentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 12,
  },
  parentOptionSelected: {
    backgroundColor: 'rgba(52, 211, 153, 0.10)',
    borderWidth: 1,
    borderColor: Colors.dashboard.accentSoftBorder,
  },
  optionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dashboard.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  optionAvatarText: {
    color: Colors.dashboard.text,
    fontWeight: '800',
    fontSize: 13,
  },
  optionTextCol: {
    flex: 1,
    gap: 1,
  },
  optionName: {
    color: Colors.dashboard.text,
    fontSize: 15,
    fontWeight: '700',
  },
  optionNameSelected: {
    color: Colors.dashboard.accent,
    fontWeight: '900',
  },
  optionSub: {
    color: Colors.alpha.white45,
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.alpha.white08,
    marginVertical: 6,
  },
  addNewParentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderWidth: 1,
    borderColor: Colors.dashboard.accentSoftBorder,
    gap: 12,
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dashboard.accentIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewParentText: {
    color: Colors.dashboard.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  addNewParentSub: {
    color: Colors.alpha.white55,
    fontSize: 11,
    fontWeight: '500',
  },
});

