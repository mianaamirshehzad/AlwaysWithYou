import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import { getInitials } from '@/src/utils/date';
import type { ParentProfile } from '@/src/context/RelationshipsContext';

type Props = {
  visible: boolean;
  parents: ParentProfile[];
  selectedUid: string | null;
  onSelect: (uid: string) => void;
  onClose: () => void;
};

export default function ParentSwitcherModal(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.overlay} onPress={props.onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Select Parent</Text>

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {props.parents.length === 0 ? (
              <Text style={styles.emptyText}>No parents connected yet.</Text>
            ) : (
              props.parents.map((p) => {
                const uid = p.profile?.uid ?? p.relationship.parentId;
                const name = p.profile?.name ?? 'Parent';
                const selected = uid === props.selectedUid;
                return (
                  <Pressable
                    key={p.relationship.id}
                    onPress={() => {
                      props.onSelect(uid);
                      props.onClose();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={name}
                    style={({ pressed }) => [styles.row, selected && styles.rowSelected, { opacity: pressed ? 0.8 : 1 }]}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(name)}</Text>
                    </View>
                    <Text style={styles.rowName}>{name}</Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.dashboard.accent} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color={Colors.alpha.white30} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Pressable
            onPress={props.onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: Colors.alpha.white22,
    marginBottom: 8,
  },
  title: { color: Colors.dashboard.text, fontSize: 16, fontWeight: '900', marginBottom: 8 },
  emptyText: { color: Colors.alpha.white45, fontSize: 14, fontWeight: '700', paddingVertical: 24, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginBottom: 8,
  },
  rowSelected: {
    backgroundColor: Colors.dashboard.accentSelectedBg,
    borderWidth: 1,
    borderColor: Colors.dashboard.accentSelectedBorder,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accentIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.dashboard.accent, fontWeight: '900', fontSize: 15 },
  rowName: { flex: 1, color: Colors.dashboard.text, fontSize: 15, fontWeight: '900' },
  closeBtn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: Colors.alpha.white70, fontSize: 14, fontWeight: '900' },
});
