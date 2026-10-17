import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Colors from '@/src/assets/Colors';
import ErrorBanner from '../ErrorBanner';
import { updateUserProfile } from '@/src/services/firestore/users';
import { validateDisplayName, validatePhoneNumber } from '@/src/utils/validation';

export type ParentProfileModalProps = {
  visible: boolean;
  parentUid: string;
  initialName?: string;
  initialPhone?: string;
  onClose: () => void;
  onSaved: (newName: string, newPhone: string) => void;
};

export default function ParentProfileModal({
  visible,
  parentUid,
  initialName = '',
  initialPhone = '',
  onClose,
  onSaved,
}: ParentProfileModalProps) {
  const [name, setName] = React.useState(initialName);
  const [phone, setPhone] = React.useState(initialPhone);
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setName(initialName);
      setPhone(initialPhone);
      setErrorMessage(null);
      setNameError(null);
      setPhoneError(null);
    }
  }, [visible, initialName, initialPhone]);

  const handleSave = async () => {
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
      await updateUserProfile(parentUid, {
        name: nameVal.value,
        phone: phoneVal.value,
      });

      onSaved(nameVal.value, phoneVal.value);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Could not update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss profile modal"
        />

        <View style={styles.sheet} accessibilityRole="alert" accessibilityLabel="Edit Parent Profile">
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.alpha.white70} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {errorMessage ? (
              <ErrorBanner
                message={errorMessage}
                onRetry={handleSave}
                onDismiss={() => setErrorMessage(null)}
              />
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (nameError) setNameError(null);
                }}
                style={[styles.input, !!nameError && styles.inputError]}
                placeholder="Enter your name"
                placeholderTextColor={Colors.alpha.white25}
                autoCapitalize="words"
                accessibilityLabel="Your Name Input"
              />
              {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  if (phoneError) setPhoneError(null);
                }}
                style={[styles.input, !!phoneError && styles.inputError]}
                placeholder="e.g. +1 555 123 4567"
                placeholderTextColor={Colors.alpha.white25}
                keyboardType="phone-pad"
                accessibilityLabel="Phone Number Input"
              />
              {phoneError ? <Text style={styles.fieldError}>{phoneError}</Text> : null}
              <Text style={styles.hint}>Used by your caregiver if they need to call you.</Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.85 : 1 }]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Save profile"
                style={({ pressed }) => [
                  styles.saveBtn,
                  { opacity: saving ? 0.7 : pressed ? 0.85 : 1 },
                ]}>
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.alpha.white25,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  title: {
    color: Colors.dashboard.text,
    fontSize: 20,
    fontWeight: '900',
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: 18,
    paddingBottom: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    color: Colors.alpha.white55,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    color: Colors.dashboard.text,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: Colors.dashboard.danger,
  },
  fieldError: {
    color: Colors.dashboard.dangerText,
    fontSize: 12,
    fontWeight: '700',
  },
  hint: {
    color: Colors.alpha.white35,
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: Colors.alpha.white70,
    fontSize: 15,
    fontWeight: '800',
  },
  saveBtn: {
    flex: 1.5,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: Colors.dashboard.bg,
    fontSize: 15,
    fontWeight: '900',
  },
});

