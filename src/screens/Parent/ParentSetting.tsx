import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import Images from '../../assets/Images';
import UserProfileHeader from '../../components/UserProfileHeader';
import CaregiverCard from '../../components/ParentSettings/CaregiverCard';
import SnoozeDurationSection from '../../components/ParentSettings/SnoozeDurationSection';
import SoundAlertsSection from '../../components/ParentSettings/SoundAlertsSection';
import TextSizeSection from '../../components/ParentSettings/TextSizeSection';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useRelationships } from '../../context/RelationshipsContext';
import { getUserProfile } from '../../services/firestore/users';
import { logOut } from '../../services/auth';
import type { UserProfile } from '../../models';
import * as Linking from 'expo-linking';

export default function ParentSetting() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { preferences, update } = usePreferences();
  const { relationships } = useRelationships();

  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [childProfile, setChildProfile] = React.useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    let mounted = true;
    setLoadingProfile(true);

    getUserProfile(user.uid).then((p) => {
      if (mounted) {
        setProfile(p);
        setLoadingProfile(false);
      }
    }).catch(() => {
      if (mounted) setLoadingProfile(false);
    });

    return () => { mounted = false; };
  }, [user]);

  React.useEffect(() => {
    if (relationships.length === 0) return;
    const childId = relationships[0].childId;
    let mounted = true;

    getUserProfile(childId).then((p) => {
      if (mounted) setChildProfile(p);
    });

    return () => { mounted = false; };
  }, [relationships]);

  const handleSignOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logOut();
      router.replace('/');
    } catch {
      setLoggingOut(false);
      Alert.alert('Sign Out Failed', 'Please try again.');
    }
  };

  const handleCallChild = React.useCallback(() => {
    if (childProfile?.phone) {
      Linking.openURL(`tel:${childProfile.phone}`);
    } else {
      Alert.alert('No Phone Number', 'The child has not provided a phone number yet.');
    }
  }, [childProfile]);

  const playSound = preferences?.soundEnabled ?? true;
  const vibrate = preferences?.vibrateEnabled ?? false;
  const snooze = preferences?.snoozeMinutes ?? 15;
  const textSize = preferences?.textSize ?? 0.5;

  const userName = profile?.name ?? 'Parent';
  const subtitle = profile?.email ?? 'Managing my preferences';

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

        {loadingProfile ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.dashboard.accent} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <UserProfileHeader
              name={userName}
              subtitle={subtitle}
              avatarSource={Images.hands}
              size="lg"
              showBadge
            />

            <SoundAlertsSection
              playSound={playSound}
              onTogglePlaySound={(v) => update({ soundEnabled: v })}
              vibrate={vibrate}
              onToggleVibrate={(v) => update({ vibrateEnabled: v })}
            />

            <SnoozeDurationSection valueMinutes={snooze} onChange={(v) => update({ snoozeMinutes: v })} />

            <TextSizeSection value={textSize} onChange={(v) => update({ textSize: v })} />

            {childProfile && (
              <CaregiverCard
                name={childProfile.name}
                relation="Child"
                avatarSource={Images.hands}
                onCall={handleCallChild}
              />
            )}

            <Pressable onPress={handleSignOut} accessibilityRole="button" accessibilityLabel="Sign out" style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.9 : 1 }]}>
              <Text style={styles.signOutText}>{loggingOut ? 'Signing Out...' : 'Sign Out'}</Text>
            </Pressable>

            <Text style={styles.version}>Version 2.4.0</Text>
          </ScrollView>
        )}
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

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
