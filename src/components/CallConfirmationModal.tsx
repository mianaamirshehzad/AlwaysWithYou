import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import Colors from '@/src/assets/Colors';

export type CallConfirmationModalProps = {
  visible: boolean;
  contactName: string;
  relationshipLabel?: string;
  phoneNumber?: string | null;
  onClose: () => void;
};

import { cleanPhoneNumber } from '../utils/phone';
export { cleanPhoneNumber };

export default function CallConfirmationModal({
  visible,
  contactName,
  relationshipLabel = 'Caregiver',
  phoneNumber,
  onClose,
}: CallConfirmationModalProps) {
  const [calling, setCalling] = React.useState(false);

  const cleanedPhone = React.useMemo(() => cleanPhoneNumber(phoneNumber), [phoneNumber]);
  const hasValidPhone = cleanedPhone.length >= 3;

  const handleConfirmCall = async () => {
    if (calling) return;
    if (!hasValidPhone) {
      Alert.alert(
        'Phone Number Unavailable',
        `${contactName} has not added a phone number yet.`,
        [{ text: 'OK', onPress: onClose }]
      );
      return;
    }

    setCalling(true);
    try {
      const url = `tel:${cleanedPhone}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Calls Unsupported',
          'Phone calls are not supported on this device.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      Alert.alert('Call Failed', 'Unable to initiate phone call. Please check your phone app.');
    } finally {
      setCalling(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss call dialog"
        />

        <View
          style={styles.card}
          accessibilityRole="alert"
          accessibilityLabel={`Call ${contactName} confirmation`}>
          <View style={styles.iconWrap}>
            <Ionicons name="call" size={28} color={Colors.dashboard.accent} />
          </View>

          <Text style={styles.title}>Call {contactName}?</Text>
          <Text style={styles.sub}>
            {relationshipLabel} • {phoneNumber || 'No phone number'}
          </Text>

          {!hasValidPhone ? (
            <View style={styles.warningBox}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.dashboard.danger} />
              <Text style={styles.warningText}>No phone number is registered for this contact.</Text>
            </View>
          ) : (
            <Text style={styles.note}>
              This will open your phone app to start the call.
            </Text>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={calling}
              accessibilityRole="button"
              accessibilityLabel="Cancel call"
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.8 : 1 }]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirmCall}
              disabled={calling || !hasValidPhone}
              accessibilityRole="button"
              accessibilityLabel={`Call ${contactName}`}
              style={({ pressed }) => [
                styles.callBtn,
                (!hasValidPhone || calling) && styles.callBtnDisabled,
                { opacity: pressed ? 0.85 : 1 },
              ]}>
              <Ionicons name="call" size={18} color={Colors.dashboard.bg} />
              <Text style={styles.callText}>{calling ? 'Opening...' : 'Call Now'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accentIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: Colors.dashboard.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  sub: {
    color: Colors.alpha.white55,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  note: {
    color: Colors.alpha.white40,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dashboard.dangerSoftBg,
    borderColor: Colors.dashboard.dangerSoftBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    width: '100%',
  },
  warningText: {
    color: Colors.dashboard.dangerText,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
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
    fontSize: 14,
    fontWeight: '800',
  },
  callBtn: {
    flex: 1.3,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callBtnDisabled: {
    opacity: 0.4,
  },
  callText: {
    color: Colors.dashboard.bg,
    fontSize: 15,
    fontWeight: '900',
  },
});
