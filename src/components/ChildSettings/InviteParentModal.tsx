import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import childSettingsColors from './colors';

type Props = {
  visible: boolean;
  code: string | null;
  generating: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
};

export default function InviteParentModal(props: Props) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!props.visible) {
      setCopied(false);
    }
  }, [props.visible]);

  const handleCopy = async () => {
    if (props.code === null) {
      return;
    }
    await Clipboard.setStringAsync(props.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.handle} />

          <View style={styles.iconCircle}>
            <Ionicons name="mail-open-outline" size={26} color={childSettingsColors.accent} />
          </View>

          <Text style={styles.title}>Invite a Parent</Text>
          <Text style={styles.subtitle}>
            Share this 6-digit code with your parent. It expires in 24 hours.
          </Text>

          {props.generating ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={childSettingsColors.accent} />
              <Text style={styles.statusText}>Generating your code...</Text>
            </View>
          ) : props.error !== null ? (
            <View style={styles.centerBox}>
              <Ionicons name="alert-circle-outline" size={26} color={childSettingsColors.accent} />
              <Text style={styles.statusText}>{props.error}</Text>
              <Pressable
                onPress={props.onRetry}
                accessibilityRole="button"
                accessibilityLabel="Try Again"
                style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.85 : 1 }]}>
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.codeRow} accessibilityLabel={`Invitation code ${props.code}`}>
                {(props.code ?? '').split('').map((digit, index) => (
                  <View key={index} style={styles.codeBox}>
                    <Text style={styles.codeDigit}>{digit}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.expiryHint}>Expires in 24 hours</Text>

              <Pressable
                onPress={handleCopy}
                accessibilityRole="button"
                accessibilityLabel="Copy Code"
                style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.85 : 1 }]}>
                <Ionicons name={copied ? 'checkmark-circle-outline' : 'copy-outline'} size={18} color={childSettingsColors.white} />
                <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy Code'}</Text>
              </Pressable>
            </>
          )}

          <Pressable
            onPress={props.onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 18, 24, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: childSettingsColors.card,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: childSettingsColors.divider,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: childSettingsColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  title: { color: childSettingsColors.text, fontSize: 20, fontWeight: '900' },
  subtitle: {
    color: childSettingsColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  centerBox: { alignItems: 'center', gap: 10, paddingVertical: 14, minHeight: 116 },
  statusText: {
    color: childSettingsColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 2,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: childSettingsColors.accent,
  },
  retryText: { color: childSettingsColors.white, fontSize: 13, fontWeight: '800' },
  codeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  codeBox: {
    width: 46,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: childSettingsColors.accentBorder,
    backgroundColor: childSettingsColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: { color: childSettingsColors.accent, fontSize: 24, fontWeight: '900' },
  expiryHint: { color: childSettingsColors.textMuted, fontSize: 12, fontWeight: '700' },
  copyBtn: {
    marginTop: 4,
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: childSettingsColors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  copyText: { color: childSettingsColors.white, fontSize: 15, fontWeight: '800' },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  closeText: { color: childSettingsColors.textSecondary, fontSize: 14, fontWeight: '800' },
});
