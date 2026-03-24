import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import Images from '../../assets/Images';
import CareCard from '../../components/Dashboard/CareCard';
import FloatingActionButton from '../../components/Dashboard/FloatingActionButton';
import ProfileGreeting from '../../components/Dashboard/ProfileGreeting';
import QuickSendItem from '../../components/Dashboard/QuickSendItem';
import SummaryCard from '../../components/Dashboard/SummaryCard';
import CreateNewReminderModal from './CreateNewReminderModal';

export default function ChildDashboardScreen() {
  const [timelineTab, setTimelineTab] = React.useState<'today' | 'history'>('today');
  const [createReminderOpen, setCreateReminderOpen] = React.useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>Dashboard</Text>
            <View style={styles.topBarRight}>
              <IconButton iconName="notifications-outline" accessibilityLabel="Notifications" />
              <IconButton iconName="settings-outline" accessibilityLabel="Settings" />
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <ProfileGreeting name="Sarah" headline="Mom is doing well today" avatarSource={Images.hands} />

          <SummaryCard percent={75} completedLabel="3 completed" missedLabel="1 missed" streakLabel="5 DAY STREAK" />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Send</Text>
            <View style={styles.quickRow}>
              <QuickSendItem label="Water" iconName="water-outline" onPress={() => {}} />
              <QuickSendItem label="Meds" iconName="add-circle-outline" onPress={() => {}} />
              <QuickSendItem label="Call" iconName="call-outline" onPress={() => {}} />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              <View style={styles.segmentWrap}>
                <SegmentButton label="Today" active={timelineTab === 'today'} onPress={() => setTimelineTab('today')} />
                <SegmentButton label="History" active={timelineTab === 'history'} onPress={() => setTimelineTab('history')} />
              </View>
            </View>

            <View style={styles.timelineList}>
              <CareCard title="Morning Meds" time="9:00 AM" iconName="medical-outline" status="acknowledged" />
              <CareCard title="Morning Walk" time="10:30 AM" iconName="walk-outline" status="done" />
              <CareCard title="Lunch Check-in" time="12:30 PM" iconName="chatbubble-outline" status="missed" />
              <CareCard title="Midday Hydration" time="Sent 1:00 PM" iconName="water-outline" status="sent" />
              <CareCard title="Afternoon Rest" time="2:00 PM" iconName="bed-outline" status="upcoming" />
            </View>
          </View>
        </ScrollView>

        <FloatingActionButton onPress={() => setCreateReminderOpen(true)} style={{ marginBottom:-100 }} />
        <CreateNewReminderModal visible={createReminderOpen} onClose={() => setCreateReminderOpen(false)} />
      </View>
    </SafeAreaView>
  );
}

function IconButton(props: { iconName: React.ComponentProps<typeof Ionicons>['name']; accessibilityLabel: string }) {
  return (
    <View accessibilityRole="button" accessibilityLabel={props.accessibilityLabel} style={styles.iconBtn}>
      <Ionicons name={props.iconName} size={18} color={Colors.dashboard.icon} />
    </View>
  );
}

function SegmentButton(props: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: props.active }}
      style={[styles.segmentBtn, props.active && styles.segmentBtnOn]}>
      <Text style={[styles.segmentText, props.active && styles.segmentTextOn]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },
  screen: { flex: 1 },
  header: {
    backgroundColor: Colors.dashboard.bg,
    paddingHorizontal: 18,
    paddingBottom: 6,
    zIndex: 10,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  topBarTitle: { color: Colors.dashboard.text, fontSize: 18, fontWeight: '900' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 2, gap: 10 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  quickRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  timelineList: { gap: 10 },
  segmentWrap: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  segmentBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  segmentBtnOn: {
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  segmentText: { color: Colors.dashboard.tabInactive, fontSize: 11, fontWeight: '900' },
  segmentTextOn: { color: Colors.dashboard.text },
});
