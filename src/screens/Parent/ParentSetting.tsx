import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import Images from '../../assets/Images';
import UserProfileHeader from '../../components/UserProfileHeader';
import CaregiverCard from '../../components/ParentSettings/CaregiverCard';
import SnoozeDurationSection from '../../components/ParentSettings/SnoozeDurationSection';
import SoundAlertsSection from '../../components/ParentSettings/SoundAlertsSection';
import TextSizeSection from '../../components/ParentSettings/TextSizeSection';

export default function ParentSetting() {
  const router = useRouter();
  const navigation = useNavigation();

  const [playSound, setPlaySound] = React.useState(true);
  const [vibrate, setVibrate] = React.useState(false);
  const [snooze, setSnooze] = React.useState(15);
  const [textSize, setTextSize] = React.useState(0.5);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : router.replace('/(parent-tabs)'))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.9 : 1 }]}>
            <Ionicons name="arrow-back" size={18} color={Colors.alpha.white85} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <UserProfileHeader
            name="Martha Smith"
            subtitle="Managing my preferences"
            avatarSource={Images.hands}
            size="lg"
            showBadge
          />

          <SoundAlertsSection
            playSound={playSound}
            onTogglePlaySound={setPlaySound}
            vibrate={vibrate}
            onToggleVibrate={setVibrate}
          />

          <SnoozeDurationSection valueMinutes={snooze} onChange={setSnooze} />

          <TextSizeSection value={textSize} onChange={setTextSize} />

          <CaregiverCard name="Sarah Smith" relation="Daughter" avatarSource={Images.hands} onCall={() => {}} />

          <Pressable accessibilityRole="button" accessibilityLabel="Sign out" style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.9 : 1 }]}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>

          <Text style={styles.version}>Version 2.4.0</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dashboard.bg,
    zIndex: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: Colors.dashboard.text, fontSize: 16, fontWeight: '900' },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 28, gap: 16 },

  signOut: {
    marginTop: 6,
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.dashboard.danger,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dashboard.bg,
  },
  signOutText: { color: Colors.dashboard.danger, fontSize: 14, fontWeight: '900' },
  version: { textAlign: 'center', color: Colors.alpha.white28, fontSize: 11, fontWeight: '900', marginTop: 4 },
});

