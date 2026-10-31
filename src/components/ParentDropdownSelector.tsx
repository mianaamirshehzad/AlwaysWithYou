import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
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
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function ParentDropdownSelector({
  parents,
  selectedParent,
  loading,
  onSelectParent,
  onAddNewParent,
  isOpen: controlledIsOpen,
  onOpenChange,
}: Props) {
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    const next = !isOpen;
    if (!isControlled) {
      setInternalIsOpen(next);
    }
    onOpenChange?.(next);
  };

  const handleClose = () => {
    if (!isControlled) {
      setInternalIsOpen(false);
    }
    onOpenChange?.(false);
  };

  const selectedUid = selectedParent?.profile?.uid ?? selectedParent?.relationship.parentId ?? null;
  const parentName =
    selectedParent?.profile?.name ?? (loading ? 'Loading parent...' : 'No parent connected');
  const parentPhoto = selectedParent?.profile?.photoUrl ?? null;

  return (
    <View style={styles.wrapper}>
      {/* Trigger Chip */}
      <Pressable
        onPress={handleToggle}
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

      {/* Dropdown Menu - Distinct Dark Slate/Midnight Navy theme */}
      {isOpen && (
        <View style={styles.dropdownMenu}>
          <Text style={styles.dropdownHeader}>CONNECTED PARENTS</Text>

          {parents.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No parents connected yet.</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.optionsList}
              contentContainerStyle={styles.optionsListContent}
              bounces={false}
              nestedScrollEnabled
              showsVerticalScrollIndicator={parents.length > 4}>
              {parents.map((p) => {
                const uid = p.profile?.uid ?? p.relationship.parentId;
                const name = p.profile?.name ?? 'Parent';
                const photo = p.profile?.photoUrl ?? null;
                const isSelected = uid === selectedUid;

                return (
                  <Pressable
                    key={p.relationship.id}
                    onPress={() => {
                      onSelectParent(uid);
                      handleClose();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={name}
                    style={({ pressed }) => [
                      styles.parentOption,
                      isSelected && styles.parentOptionSelected,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}>
                    <View style={[styles.optionAvatar, isSelected && styles.optionAvatarSelected]}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.avatarImg} />
                      ) : (
                        <Text
                          style={[
                            styles.optionAvatarText,
                            isSelected && styles.optionAvatarTextSelected,
                          ]}>
                          {getInitials(name)}
                        </Text>
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
                    </View>

                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={Colors.dashboard.accent}
                      />
                    ) : (
                      <Ionicons
                        name="ellipse-outline"
                        size={18}
                        color="rgba(255, 255, 255, 0.25)"
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Add New Parent Option (subtle tertiary action with muted colors) */}
          <Pressable
            onPress={() => {
              handleClose();
              onAddNewParent();
            }}
            accessibilityRole="button"
            accessibilityLabel="Add new parent"
            style={({ pressed }) => [
              styles.addNewParentBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}>
            <Ionicons name="person-add-outline" size={16} color="rgba(255, 255, 255, 0.50)" />
            <Text style={styles.addNewParentText}>+ Add New Parent</Text>
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
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    backgroundColor: '#151E2B', // Distinct Dark Slate / Midnight Navy color (diverging from app dashboard green #071F19)
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 16,
    zIndex: 1000,
  },
  dropdownHeader: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  optionsList: {
    maxHeight: 220,
  },
  optionsListContent: {
    gap: 4,
  },
  emptyWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.50)',
    fontSize: 13,
    fontWeight: '500',
  },
  parentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 12,
  },
  parentOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  optionAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#222E3F',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  optionAvatarSelected: {
    borderWidth: 1,
    borderColor: Colors.dashboard.accent,
  },
  optionAvatarText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '700',
    fontSize: 13,
  },
  optionAvatarTextSelected: {
    color: Colors.dashboard.accent,
    fontWeight: '800',
  },
  optionTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  optionName: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    fontWeight: '600',
  },
  optionNameSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
    marginHorizontal: 6,
  },
  addNewParentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
    // Very subtle, less prominent styling (no emerald background, no heavy border)
    backgroundColor: 'transparent',
  },
  addNewParentText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
