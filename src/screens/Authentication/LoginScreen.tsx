import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import * as React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import Images from '../../assets/Images';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function LoginScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : router.replace('/'))}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.9 : 1 }]}>
            <Ionicons name="chevron-back" size={20} color={PALETTE.text} />
          </Pressable>

          <Text style={styles.headerKicker}>LOGIN</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to stay connected with your family.</Text>

          <View style={styles.form}>
            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              iconName="mail-outline"
            />

            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              iconName="call-outline"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.circle}>
            <Image source={Images.hands} style={styles.circleImage} resizeMode="cover" />
            <View style={styles.circleOverlay} />
          </View>

          <Button
            label="Login"
            showArrow
            arrowIconName="log-in-outline"
            onPress={() => {
              router.dismissAll();
              router.replace('/(tabs)');
            }}
            style={styles.cta}
          />

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don&apos;t have an account?</Text>
            <Pressable onPress={() => router.push('/signup')} hitSlop={10} accessibilityRole="button">
              {({ pressed }) => <Text style={[styles.signupLink, { opacity: pressed ? 0.9 : 1 }]}>Create Account</Text>}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PALETTE = {
  bg: Colors.auth.bg,
  text: Colors.auth.text,
  muted: Colors.alpha.white65,
  subtle: Colors.auth.subtle,
  link: Colors.brand.primary,
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.bg },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: Colors.alpha.white06,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerKicker: {
    color: PALETTE.subtle,
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '800',
  },
  content: { gap: 10, paddingTop: 8 },
  title: { color: PALETTE.text, fontSize: 34, lineHeight: 42, fontWeight: '800', marginTop: 6 },
  subtitle: { color: PALETTE.muted, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  form: { gap: 18, marginTop: 18 },

  footer: { marginTop: 'auto', alignItems: 'center', gap: 14, paddingTop: 16 },
  circle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    backgroundColor: Colors.alpha.white08,
    marginBottom: 2,
  },
  circleImage: { width: '100%', height: '100%', opacity: 0.22 },
  circleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.auth.overlayStrong,
  },
  cta: { marginTop: 2 },
  signupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  signupText: { color: PALETTE.subtle, fontSize: 13, fontWeight: '700' },
  signupLink: { color: PALETTE.link, fontSize: 13, fontWeight: '800' },
});
