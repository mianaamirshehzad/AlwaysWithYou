import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Images from '../../assets/Images';
import AppInfoSection from '../../components/ChildSettings/AppInfoSection';
import ChildProfileCard from '../../components/ChildSettings/ChildProfileCard';
import ChildProfileModal from '../../components/ChildSettings/ChildProfileModal';
import childSettingsColors from '../../components/ChildSettings/colors';
import InviteParentModal from '../../components/ChildSettings/InviteParentModal';
import MyParentsSection from '../../components/ChildSettings/MyParentsSection';
import PreferencesSection from '../../components/ChildSettings/PreferencesSection';
import ErrorBanner from '../../components/ErrorBanner';
import { useAuth } from '../../context/AuthContext';
import { useRelationships } from '../../context/RelationshipsContext';
import { usePreferences } from '../../context/PreferencesContext';
import { getCurrentUser, logOut } from '../../services/auth';
import { createInvitation } from '../../services/firestore/invitations';
import { getUserProfile } from '../../services/firestore/users';
import {
  requestNotificationPermission,
  openNotificationSettings,
} from '../../services/notifications';
import { openLegalDocument } from '../../constants/legal';
import type { UserProfile } from '../../models';

export default function ChildSettingsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ editProfile?: string }>();
  const { user, role } = useAuth();
  const { parents } = useRelationships();
  const { preferences, update, saveError, retrySave } = usePreferences();

  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileModalVisible, setProfileModalVisible] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const [inviteVisible, setInviteVisible] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState<string | null>(null);
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviting, setInviting] = React.useState(false);

  React.useEffect(() => {
    if (params.editProfile === 'true') {
      setProfileModalVisible(true);
    }
  }, [params.editProfile]);

  React.useEffect(() => {
    if (!user) return;
    let mounted = true;
    getUserProfile(user.uid)
      .then((p) => {
        if (mounted && p) {
          setProfile(p);
        }
      })
      .catch((err) => {
        console.warn('Failed to load caregiver profile:', err);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const generateInvitation = async (childUid: string) => {
    setInviting(true);
    setInviteError(null);
    setInviteCode(null);
    try {
      const code = await createInvitation(childUid);
      setInviteCode(code);
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : 'Unable to generate an invitation code. Please try again.'
      );
    } finally {
      setInviting(false);
    }
  };

  const handleAddParent = () => {
    const current = getCurrentUser();
    if (current === null) {
      Alert.alert('Sign In Required', 'Please log in to invite a parent.');
      return;
    }
    setInviteVisible(true);
    void generateInvitation(current.uid);
  };

  const handleLogOut = async () => {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    try {
      await logOut();
      router.replace('/login');
    } catch {
      setLoggingOut(false);
      Alert.alert('Log Out Failed', 'Please try again.');
    }
  };

  const displayName = profile?.name || user?.displayName || 'My Account';
  const roleLabel = role === 'child' ? 'Caregiver Account' : 'Parent Account';

  const parentEntries = parents.map((p) => ({
    id: p.relationship.id,
    name: p.profile?.name ?? 'Parent',
    lastActive: 'Connected',
  }));

  const handleReminderSounds = () => {
    Alert.alert('Reminder Sounds', 'Notification sound is set by your device.');
  };

  const handleHelpPress = () => {
    openLegalDocument('support');
  };

  const handlePrivacyPress = () => {
    openLegalDocument('privacy');
  };

  const handleTermsPress = () => {
    openLegalDocument('terms');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : router.replace('/(tabs)'))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.9 : 1 }]}>
            <Ionicons name="arrow-back" size={18} color={childSettingsColors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ChildProfileCard
            name={displayName}
            email={profile?.email || user?.email || undefined}
            phone={profile?.phone}
            roleLabel={roleLabel}
            photoUrl={profile?.photoUrl}
            onEditProfile={() => setProfileModalVisible(true)}
            onEditPhoto={() => setProfileModalVisible(true)}
          />

          <MyParentsSection parents={parentEntries} onAddParent={handleAddParent} />

          {saveError ? (
            <ErrorBanner
              message={saveError}
              onRetry={retrySave}
              retryLabel="Retry"
              style={{ marginHorizontal: 0 }}
            />
          ) : null}

          <PreferencesSection
            pushNotifications={preferences?.pushNotifications ?? true}
            onTogglePushNotifications={async (v) => {
              if (v) {
                const res = await requestNotificationPermission();
                if (!res.granted) {
                  Alert.alert(
                    'Notifications Disabled',
                    'To receive care updates, please enable notifications in your device settings.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Settings', onPress: openNotificationSettings },
                    ]
                  );
                  return;
                }
              }
              await update({ pushNotifications: v });
            }}
            dailySummaryEmail={preferences?.dailySummaryEmail ?? false}
            onToggleDailySummaryEmail={(v) => update({ dailySummaryEmail: v })}
            reminderSoundLabel="Device"
            onPressReminderSounds={handleReminderSounds}
          />

          <AppInfoSection
            onHelpPress={handleHelpPress}
            onPrivacyPress={handlePrivacyPress}
            onTermsPress={handleTermsPress}
          />

          <Pressable
            onPress={handleLogOut}
            accessibilityRole="button"
            accessibilityLabel="Log Out"
            style={({ pressed }) => [styles.logOutBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="log-out-outline" size={18} color={childSettingsColors.accent} />
            <Text style={styles.logOutText}>Log Out</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.version}>Version 1.0.0</Text>
            <Text style={styles.love}>Made with love for our elders</Text>
          </View>
        </ScrollView>
      </View>

      <InviteParentModal
        visible={inviteVisible}
        code={inviteCode}
        generating={inviting}
        error={inviteError}
        onRetry={() => {
          const current = getCurrentUser();
          if (current !== null) {
            void generateInvitation(current.uid);
          }
        }}
        onClose={() => setInviteVisible(false)}
      />

      {user ? (
        <ChildProfileModal
          visible={profileModalVisible}
          userUid={user.uid}
          initialName={profile?.name ?? user.displayName ?? ''}
          initialPhone={profile?.phone ?? ''}
          initialPhotoUrl={profile?.photoUrl}
          onClose={() => setProfileModalVisible(false)}
          onSaved={(newName, newPhone, newPhotoUrl) => {
            setProfile((p) =>
              p
                ? {
                    ...p,
                    name: newName,
                    phone: newPhone,
                    ...(newPhotoUrl !== undefined ? { photoUrl: newPhotoUrl } : {}),
                  }
                : p
            );
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: childSettingsColors.background },
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: childSettingsColors.background,
    zIndex: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: childSettingsColors.card,
    borderWidth: 1,
    borderColor: childSettingsColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: childSettingsColors.text, fontSize: 16, fontWeight: '900' },
  headerSpacer: { width: 42 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 20,
  },
  logOutBtn: {
    marginTop: 4,
    width: '100%',
    minHeight: 56,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: childSettingsColors.accentBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: childSettingsColors.card,
  },
  logOutText: { color: childSettingsColors.accent, fontSize: 15, fontWeight: '800' },
  footer: {
    marginTop: 4,
    alignItems: 'center',
    gap: 3,
  },
  version: { color: childSettingsColors.textSecondary, fontSize: 11, fontWeight: '700' },
  love: { color: childSettingsColors.textMuted, fontSize: 11, fontWeight: '600' },
});
