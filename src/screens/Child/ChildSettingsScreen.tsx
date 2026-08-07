import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Images from '../../assets/Images';
import AppInfoSection from '../../components/ChildSettings/AppInfoSection';
import ChildProfileCard from '../../components/ChildSettings/ChildProfileCard';
import childSettingsColors from '../../components/ChildSettings/colors';
import MyParentsSection from '../../components/ChildSettings/MyParentsSection';
import type { ParentEntry } from '../../components/ChildSettings/MyParentsSection';
import PreferencesSection from '../../components/ChildSettings/PreferencesSection';

export default function ChildSettingsScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [pushNotifications, setPushNotifications] = React.useState(true);
  const [dailySummaryEmail, setDailySummaryEmail] = React.useState(false);

  const childProfile = {
    name: 'Sarah Miller',
    roleLabel: 'Child Account',
    avatarSource: Images.hands,
  };

  const parents: ParentEntry[] = [
    {
      id: 'mom',
      name: 'Mom',
      lastActive: 'Last active: 2 hours ago',
      avatarSource: Images.water,
      onPress: () => openParentDetails('Mom'),
    },
    {
      id: 'dad',
      name: 'Dad',
      lastActive: 'Last active: 10 mins ago',
      avatarSource: Images.medicine,
      onPress: () => openParentDetails('Dad'),
    },
  ];

  const openParentDetails = (name: string) => {
    Alert.alert(name, 'Parent details are not available yet.');
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing is not available yet.');
  };

  const handleAddParent = () => {
    Alert.alert('Add New Parent', 'Parent invitation is not available yet.');
  };

  const handleReminderSounds = () => {
    Alert.alert('Reminder Sounds', 'Sound selection is not available yet.');
  };

  const handleHelpPress = () => {
    Alert.alert('Help & Support', 'Our support team is here for you.');
  };

  const handlePrivacyPress = () => {
    Alert.alert('Privacy Policy', 'Privacy policy is not available yet.');
  };

  const handleTermsPress = () => {
    Alert.alert('Terms of Service', 'Terms of service are not available yet.');
  };

  const handleLogOut = () => {
    router.replace('/');
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
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ChildProfileCard
            name={childProfile.name}
            roleLabel={childProfile.roleLabel}
            avatarSource={childProfile.avatarSource}
            onEditProfile={handleEditProfile}
          />

          <MyParentsSection parents={parents} onAddParent={handleAddParent} />

          <PreferencesSection
            pushNotifications={pushNotifications}
            onTogglePushNotifications={setPushNotifications}
            dailySummaryEmail={dailySummaryEmail}
            onToggleDailySummaryEmail={setDailySummaryEmail}
            reminderSoundLabel="Chime"
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
            <Text style={styles.version}>Version 2.4.1</Text>
            <Text style={styles.love}>Made with love for our elders</Text>
          </View>
        </ScrollView>
      </View>
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
