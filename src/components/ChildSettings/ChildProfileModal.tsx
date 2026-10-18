import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

import childSettingsColors from './colors';
import ErrorBanner from '../ErrorBanner';
import { updateUserProfile } from '@/src/services/firestore/users';
import { pickProfileImageFromGallery } from '@/src/services/imagePicker';
import { getInitials } from '@/src/utils/date';
import { validateDisplayName, validatePhoneNumber } from '@/src/utils/validation';

export type ChildProfileModalProps = {
  visible: boolean;
  userUid: string;
  initialName?: string;
  initialPhone?: string;
  initialPhotoUrl?: string;
  onClose: () => void;
  onSaved: (newName: string, newPhone: string, newPhotoUrl?: string) => void;
};

export default function ChildProfileModal({
  visible,
  userUid,
  initialName = '',
  initialPhone = '',
  initialPhotoUrl,
  onClose,
  onSaved,
}: ChildProfileModalProps) {
  const [name, setName] = React.useState(initialName);
  const [phone, setPhone] = React.useState(initialPhone);
  const [photoUrl, setPhotoUrl] = React.useState<string | undefined>(initialPhotoUrl);
  const [pickingImage, setPickingImage] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setName(initialName);
      setPhone(initialPhone);
      setPhotoUrl(initialPhotoUrl);
      setErrorMessage(null);
      setNameError(null);
      setPhoneError(null);
    }
  }, [visible, initialName, initialPhone, initialPhotoUrl]);

  const handlePickImage = async () => {
    try {
      setPickingImage(true);
      setErrorMessage(null);
      const pickedUri = await pickProfileImageFromGallery();
      if (pickedUri) {
        setPhotoUrl(pickedUri);
      }
    } catch (err: any) {
      Alert.alert('Permission Needed', err?.message ?? 'Could not open image gallery.');
    } finally {
      setPickingImage(false);
    }
  };

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
      await updateUserProfile(userUid, {
        name: nameVal.value,
        phone: phoneVal.value,
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      });

      onSaved(nameVal.value, phoneVal.value, photoUrl);
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
        {/* Solid opaque backdrop prevents background screen content from bleeding through and ignores outside touches */}
        <View style={styles.backdrop} pointerEvents="auto" />

        <View style={styles.sheet} accessibilityRole="alert" accessibilityLabel="Edit Caregiver Profile">
          <View style={styles.handle} />

          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.navBtn}>
              <Ionicons name="arrow-back" size={20} color={childSettingsColors.text} />
            </Pressable>
            <Text style={styles.title}>Edit Profile</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.navBtn}>
              <Ionicons name="close" size={20} color={childSettingsColors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {errorMessage ? (
              <ErrorBanner
                message={errorMessage}
                onRetry={handleSave}
                onDismiss={() => setErrorMessage(null)}
              />
            ) : null}

            {/* Profile Photo Picker */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrap}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.fallbackAvatar}>
                    <Text style={styles.fallbackInitials}>{getInitials(name || 'You')}</Text>
                  </View>
                )}
                <Pressable
                  onPress={handlePickImage}
                  disabled={pickingImage}
                  accessibilityRole="button"
                  accessibilityLabel="Choose photo from gallery"
                  style={({ pressed }) => [styles.avatarBadge, { opacity: pressed ? 0.85 : 1 }]}>
                  {pickingImage ? (
                    <ActivityIndicator size="small" color={childSettingsColors.white} />
                  ) : (
                    <Ionicons name="camera" size={16} color={childSettingsColors.white} />
                  )}
                </Pressable>
              </View>
              <Pressable
                onPress={handlePickImage}
                disabled={pickingImage}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                <Text style={styles.changePhotoText}>
                  {pickingImage ? 'Opening Gallery...' : 'Change Photo from Gallery'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (nameError) setNameError(null);
                }}
                style={[styles.input, !!nameError && styles.inputError]}
                placeholder="Enter your name"
                placeholderTextColor={childSettingsColors.textMuted}
                autoCapitalize="words"
                accessibilityLabel="Display Name Input"
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
                placeholderTextColor={childSettingsColors.textMuted}
                keyboardType="phone-pad"
                accessibilityLabel="Phone Number Input"
              />
              {phoneError ? <Text style={styles.fieldError}>{phoneError}</Text> : null}
              <Text style={styles.hint}>Shared with your linked family members so they can contact you.</Text>
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
    backgroundColor: '#0D1C16',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D1C16',
  },
  sheet: {
    backgroundColor: childSettingsColors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: childSettingsColors.border,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 28,
    paddingTop: 12,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: childSettingsColors.border,
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
    color: childSettingsColors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  navBtn: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: childSettingsColors.background,
    borderWidth: 1,
    borderColor: childSettingsColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: 18,
    paddingBottom: 16,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  avatarWrap: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: childSettingsColors.accentBorder,
    overflow: 'visible',
  },
  avatarImg: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  fallbackAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: childSettingsColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackInitials: {
    color: childSettingsColors.accent,
    fontSize: 28,
    fontWeight: '900',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: childSettingsColors.accent,
    borderWidth: 2,
    borderColor: childSettingsColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    color: childSettingsColors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  field: {
    gap: 6,
  },
  label: {
    color: childSettingsColors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    color: childSettingsColors.text,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: childSettingsColors.background,
    borderWidth: 1,
    borderColor: childSettingsColors.border,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  fieldError: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  hint: {
    color: childSettingsColors.textMuted,
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
    backgroundColor: childSettingsColors.background,
    borderWidth: 1,
    borderColor: childSettingsColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: childSettingsColors.textSecondary,
    fontSize: 15,
    fontWeight: '800',
  },
  saveBtn: {
    flex: 1.5,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: childSettingsColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: childSettingsColors.white,
    fontSize: 15,
    fontWeight: '900',
  },
});
