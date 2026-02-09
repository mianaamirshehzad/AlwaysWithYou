import * as React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Images from '@/src/assets/Images';
import Button from '@/src/components/Button';
import RoleSelectionRadioCard from '@/src/components/RoleSelectionRadioCard';

type Role = 'child' | 'parent';

export default function RoleSelectionScreen(props: { onContinue?: (role: Role) => void }) {
  const [role, setRole] = React.useState<Role>('child');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={styles.kicker}>WELCOME</Text>

          <View style={styles.hero}>
            <Image source={Images.hands} style={styles.heroImage} resizeMode="cover" />
          </View>

          <Text style={styles.title}>Let&apos;s get connected</Text>
          <Text style={styles.subtitle}>Select the role that best describes you to personalize your app.</Text>

          <View style={styles.options}>
            <RoleSelectionRadioCard
              title="I am a Child"
              subtitle="I want to send reminders"
              iconName="heart-circle-outline"
              selected={role === 'child'}
              onPress={() => setRole('child')}
            />
            <RoleSelectionRadioCard
              title="I am a Parent"
              subtitle="I want to receive reminders"
              iconName="accessibility-outline"
              selected={role === 'parent'}
              onPress={() => setRole('parent')}
            />
          </View>
        </View>

        <View style={styles.bottom}>
          <Button label="Continue" showArrow onPress={() => props.onContinue?.(role)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PALETTE = {
  bg: '#062B22',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.70)',
  subtle: 'rgba(255,255,255,0.55)',
  heroBg: '#F3E7DB',
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.bg },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  top: {
    gap: 16,
  },
  bottom: {
    paddingTop: 18,
  },
  kicker: {
    textAlign: 'center',
    color: PALETTE.subtle,
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 6,
  },
  hero: {
    height: 240,
    borderRadius: 28,
    backgroundColor: PALETTE.heroBg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: PALETTE.text,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: PALETTE.muted,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
  },
  options: {
    gap: 14,
    marginTop: 10,
  },
});
