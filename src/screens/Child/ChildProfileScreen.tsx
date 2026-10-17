import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import ErrorBanner from '@/src/components/ErrorBanner';
import SuccessFeedback from '@/src/components/SuccessFeedback';
import { useAuth } from '@/src/context/AuthContext';
import { getUserProfile, updateUserProfile } from '@/src/services/firestore/users';
import { getInitials } from '@/src/utils/date';
import { validateDisplayName, validatePhoneNumber } from '@/src/utils/validation';
import type { UserProfile } from '@/src/models';

export default function ChildProfileScreen() {
  const { user, role } = useAuth();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);

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

  const handleStartEdit = () => {
    setNameError(null);
    setPhoneError(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setName(profile?.name ?? '');
    setPhone(profile?.phone ?? '');
    setEditing(true);
  };

  const handleCancel = () => {
    setNameError(null);
    setPhoneError(null);
    setErrorMessage(null);
    setName(profile?.name ?? '');
    setPhone(profile?.phone ?? '');
    setEditing(false);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate inputs
    const nameVal = validateDisplayName(name);
    const phoneVal = validatePhoneNumber(phone);

    setNameError(nameVal.error ?? null);
    setPhoneError(phoneVal.error ?? null);

    if (!nameVal.isValid || !phoneVal.isValid) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      // Role, uid, and email remain strictly immutable
      await updateUserProfile(user.uid, {
        name: nameVal.value,
        phone: phoneVal.value,
      });

      setProfile((p) =>
        p ? { ...p, name: nameVal.value, phone: phoneVal.value } : p
      );
      setEditing(false);
      setSuccessMessage('Profile updated successfully');
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Could not save profile. Please check your connection and retry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>{role === 'child' ? 'Caregiver account' : 'Parent account'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(profile?.name ?? 'You')}</Text>
          </View>
        </View>

        {errorMessage ? (
          <ErrorBanner
            message={errorMessage}
            onRetry={handleSave}
            onDismiss={() => setErrorMessage(null)}
          />
        ) : null}

        <SuccessFeedback
          message={successMessage ?? ''}
          visible={!!successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />

        <View style={styles.card}>
          <Field label="Display Name">
            {editing ? (
              <View style={styles.inputWrap}>
                <TextInput
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (nameError) setNameError(null);
                  }}
                  style={[styles.input, !!nameError && styles.inputError]}
                  autoCapitalize="words"
                  placeholder="Enter full name"
                  placeholderTextColor={Colors.alpha.white25}
                  accessibilityLabel="Display Name Input"
                />
                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
              </View>
            ) : (
              <Text style={styles.value}>{profile?.name ?? '—'}</Text>
            )}
          </Field>

          <View style={styles.divider} />

          <Field label="Email Address">
            <Text style={styles.value}>{profile?.email ?? user?.email ?? '—'}</Text>
            <Text style={styles.immutableHint}>Account ownership is permanently bound to this email.</Text>
          </Field>

          <View style={styles.divider} />

          <Field label="Phone Number">
            {editing ? (
              <View style={styles.inputWrap}>
                <TextInput
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    if (phoneError) setPhoneError(null);
                  }}
                  style={[styles.input, !!phoneError && styles.inputError]}
                  keyboardType="phone-pad"
                  placeholder="e.g. +1 555 123 4567"
                  placeholderTextColor={Colors.alpha.white25}
                  accessibilityLabel="Phone Number Input"
                />
                {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
              </View>
            ) : (
              <Text style={styles.value}>{profile?.phone || 'Not set'}</Text>
            )}
          </Field>

          <View style={styles.divider} />

          <Field label="Role">
            <Text style={styles.value}>{role === 'child' ? 'Caregiver' : 'Care Receiver'}</Text>
            <Text style={styles.immutableHint}>Role is permanent and cannot be altered.</Text>
          </Field>
        </View>

        {editing ? (
          <View style={styles.editRow}>
            <Pressable
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing"
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.85 : 1 }]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save profile changes"
              style={({ pressed }) => [styles.saveBtn, { opacity: saving ? 0.7 : pressed ? 0.85 : 1 }]}>
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleStartEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit Profile"
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
  field: { gap: 6 },
  fieldLabel: { color: Colors.alpha.white35, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  value: { color: Colors.alpha.white70, fontSize: 15, fontWeight: '800' },
  immutableHint: { color: Colors.alpha.white25, fontSize: 11, fontWeight: '600', marginTop: 2 },
  inputWrap: { gap: 4 },
  input: {
    color: Colors.dashboard.text,
    fontSize: 15,
    fontWeight: '800',
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: Colors.dashboard.danger,
  },
  errorText: {
    color: Colors.dashboard.dangerText,
    fontSize: 12,
    fontWeight: '700',
  },
  divider: { height: 1, backgroundColor: Colors.dashboard.border },
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
