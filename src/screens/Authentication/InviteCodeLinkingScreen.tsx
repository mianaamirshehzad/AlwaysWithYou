import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import Images from '../../assets/Images';
import Button from '../../components/Button';

type TabKey = 'have' | 'share';

function SegmentedTabs(props: { a: string; b: string; value: TabKey; onChange: (v: TabKey) => void }) {
  return (
    <View style={styles.segmentWrap}>
      <Pressable
        onPress={() => props.onChange('have')}
        style={[styles.segment, props.value === 'have' && styles.segmentOn]}
        accessibilityRole="button"
        accessibilityState={{ selected: props.value === 'have' }}>
        <Text style={[styles.segmentText, props.value === 'have' && styles.segmentTextOn]}>{props.a}</Text>
      </Pressable>
      <Pressable
        onPress={() => props.onChange('share')}
        style={[styles.segment, props.value === 'share' && styles.segmentOn]}
        accessibilityRole="button"
        accessibilityState={{ selected: props.value === 'share' }}>
        <Text style={[styles.segmentText, props.value === 'share' && styles.segmentTextOn]}>{props.b}</Text>
      </Pressable>
    </View>
  );
}

function InviteCodeEntry(props: { value: string; onChange: (code: string) => void }) {
  const digits = React.useMemo(() => {
    const raw = props.value.padEnd(6, ' ').slice(0, 6);
    return raw.split('').map((c) => (c === ' ' ? '' : c));
  }, [props.value]);

  const inputs = React.useRef<Array<TextInput | null>>([]);

  function setDigit(index: number, text: string) {
    const char = text.replace(/[^0-9a-zA-Z]/g, '').toUpperCase().slice(-1);
    const next = [...digits];
    next[index] = char;
    props.onChange(next.join(''));
    if (char && index < 5) inputs.current[index + 1]?.focus();
  }

  function onKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={styles.codeRow} accessibilityRole="text">
      {[0, 1, 2].map((i) => (
        <TextInput
          key={i}
          ref={(r) => {
            inputs.current[i] = r;
          }}
          value={digits[i]}
          onChangeText={(v) => setDigit(i, v)}
          onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          maxLength={1}
          style={styles.codeBox}
          selectionColor={PALETTE.accent}
          placeholder=""
          placeholderTextColor={PALETTE.subtle}
          accessibilityLabel={`Code digit ${i + 1}`}
        />
      ))}
      <Text style={styles.dash}>–</Text>
      {[3, 4, 5].map((i) => (
        <TextInput
          key={i}
          ref={(r) => {
            inputs.current[i] = r;
          }}
          value={digits[i]}
          onChangeText={(v) => setDigit(i, v)}
          onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          maxLength={1}
          style={styles.codeBox}
          selectionColor={PALETTE.accent}
          placeholder=""
          placeholderTextColor={PALETTE.subtle}
          accessibilityLabel={`Code digit ${i + 1}`}
        />
      ))}
    </View>
  );
}

export default function InviteCodeLinkingScreen() {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabKey>('have');
  const [code, setCode] = React.useState('');

  const normalized = code.replace(/[^0-9a-zA-Z]/g, '').toUpperCase().slice(0, 6);
  const canSubmit = normalized.length === 6;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={22} color={PALETTE.text} />
          </Pressable>
          <Text style={styles.headerTitle}>ConnectFamily</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.hero}>
          <Image source={Images.hands} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />
        </View>

        <SegmentedTabs a="I have a code" b="Share my code" value={tab} onChange={setTab} />

        <Text style={styles.h1}>Let&apos;s get connected</Text>
        <Text style={styles.p}>Enter the unique 6–digit code shown on your family member&apos;s screen.</Text>

        {tab === 'have' ? (
          <>
            <InviteCodeEntry value={normalized} onChange={setCode} />

            <Pressable
              onPress={() =>
                Alert.alert('Where do I find my code?', 'Ask your family member to open their app and share the Invite Code with you.')
              }
              style={({ pressed }) => [styles.helper, { opacity: pressed ? 0.9 : 1 }]}
              accessibilityRole="button">
              <Text style={styles.helperText}>Where do I find my code?</Text>
              <Ionicons name="arrow-forward" size={18} color={PALETTE.muted} />
            </Pressable>

            <View style={styles.ctaWrap}>
              <Button label="Link Account" onPress={() => router.replace('/(tabs)')} disabled={!canSubmit} />
            </View>
          </>
        ) : (
          <View style={styles.shareCard}>
            <Text style={styles.shareText}>
              Your invite code will appear here after you finish creating your account. Share it with your family member to link.
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Ionicons name="headset-outline" size={18} color={PALETTE.subtle} />
          <Text style={styles.footerText}>Need help? Contact Support</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PALETTE = {
  bg: Colors.auth.bg,
  text: Colors.auth.text,
  muted: Colors.auth.muted,
  subtle: Colors.auth.subtle,
  chipBorder: Colors.auth.chipBorder,
  accent: Colors.brand.primary,
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.bg },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 22, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  headerTitle: { color: PALETTE.text, fontSize: 18, fontWeight: '800' },
  hero: {
    height: 170,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.alpha.white06,
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.auth.heroOverlay },

  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.alpha.white06,
    borderRadius: 999,
    padding: 6,
    borderWidth: 1,
    borderColor: PALETTE.chipBorder,
    gap: 6,
  },
  segment: { flex: 1, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  segmentOn: { backgroundColor: Colors.brand.primarySoftBg },
  segmentText: { color: PALETTE.subtle, fontSize: 14, fontWeight: '700' },
  segmentTextOn: { color: PALETTE.text },

  h1: { color: PALETTE.text, fontSize: 34, lineHeight: 42, fontWeight: '800', marginTop: 6 },
  p: { color: PALETTE.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 18 },

  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 },
  codeBox: {
    width: 46,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.alpha.white06,
    borderWidth: 1,
    borderColor: PALETTE.chipBorder,
    color: PALETTE.text,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
  },
  dash: { color: PALETTE.subtle, fontSize: 24, marginHorizontal: 2 },
  helper: {
    alignSelf: 'center',
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: Colors.alpha.white06,
    borderWidth: 1,
    borderColor: PALETTE.chipBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  helperText: { color: PALETTE.muted, fontSize: 14, fontWeight: '700' },

  ctaWrap: { marginTop: 10 },

  shareCard: {
    marginTop: 6,
    backgroundColor: Colors.alpha.white06,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.chipBorder,
    padding: 16,
  },
  shareText: { color: PALETTE.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '600' },

  footer: { marginTop: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: 0.85 },
  footerText: { color: PALETTE.subtle, fontSize: 12, fontWeight: '700' },
});


