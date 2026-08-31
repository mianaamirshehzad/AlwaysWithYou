import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import { useAuth } from '@/src/context/AuthContext';
import { getUserProfile, updateUserProfile } from '@/src/services/firestore/users';
import { getInitials } from '@/src/utils/date';
import type { UserProfile } from '@/src/models';

export default function ChildProfileScreen() {
  const { user, role } = useAuth();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      if (p) {
        setProfile(p);
        setName(p.name ?? '');
        setPhone(p.phone ?? '');
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { name: name.trim(), phone: phone.trim() });
      setProfile((p) => (p ? { ...p, name: name.trim(), phone: phone.trim() } : p));
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Alert.alert('Could Not Save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>{role === 'child' ? 'Child account' : 'Parent account'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(profile?.name ?? 'You')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Field label="Name">
            {editing ? (
              <TextInput value={name} onChangeText={setName} style={styles.input} autoCapitalize="words" />
            ) : (
              <Text style={styles.value}>{profile?.name ?? '—'}</Text>
            )}
          </Field>

          <View style={styles.divider} />

          <Field label="Email">
            <Text style={styles.value}>{profile?.email ?? user?.email ?? '—'}</Text>
          </Field>

          <View style={styles.divider} />

          <Field label="Phone">
            {editing ? (
              <TextInput
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="Phone number"
                placeholderTextColor={Colors.alpha.white25}
              />
            ) : (
              <Text style={styles.value}>{profile?.phone || 'Not set'}</Text>
            )}
          </Field>
        </View>

        {saved ? <Text style={styles.saved}>Profile saved</Text> : null}

        {editing ? (
          <View style={styles.editRow}>
            <Pressable
              onPress={() => setEditing(false)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.85 : 1 }]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              accessibilityRole="button"
              style={({ pressed }) => [styles.saveBtn, { opacity: saved ? 0.85 : 1 }]}>
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.9 : 1 }]}>
            <Ionicons name="pencil-outline" size={18} color={Colors.dashboard.bg} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8, gap: 2 },
  title: { color: Colors.dashboard.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: Colors.alpha.white45, fontSize: 13, fontWeight: '800' },
  content: { paddingHorizontal: 18, paddingBottom: 28, gap: 16 },
  avatarWrap: { alignItems: 'center', paddingVertical: 12 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accentIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.dashboard.accentSoftBorder,
  },
  avatarText: { color: Colors.dashboard.accent, fontWeight: '900', fontSize: 30 },
  card: {
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    borderRadius: 22,
    padding: 16,
    gap: 14,
  },
  field: { gap: 4 },
  fieldLabel: { color: Colors.alpha.white35, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  value: { color: Colors.alpha.white70, fontSize: 15, fontWeight: '800' },
  input: {
    color: Colors.dashboard.text,
    fontSize: 15,
    fontWeight: '800',
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    paddingHorizontal: 12,
  },
  divider: { height: 1, backgroundColor: Colors.dashboard.border },
  saved: { color: Colors.dashboard.accent, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  editRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: Colors.alpha.white55, fontSize: 14, fontWeight: '900' },
  saveBtn: {
    flex: 2,
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: Colors.dashboard.bg, fontSize: 14, fontWeight: '900' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
  },
  editBtnText: { color: Colors.dashboard.bg, fontSize: 14, fontWeight: '900' },
});
