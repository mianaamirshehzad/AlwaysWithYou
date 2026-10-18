import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Colors from '@/src/assets/Colors';
import { useAuth } from '@/src/context/AuthContext';
import { useRelationships, useSelectedParent } from '@/src/context/RelationshipsContext';
import {
  createCareTask,
  subscribeToOccurrencesForParent,
  getTodayOccurrences,
  getHistoryOccurrencesForParent,
  updateMissedOccurrences,
} from '@/src/services/firestore/tasks';
import { getInitials, todayString, formatTime12h, formatDateFull } from '@/src/utils/date';
import CareCard, { type CareStatus } from '../../components/Dashboard/CareCard';
import FloatingActionButton from '../../components/Dashboard/FloatingActionButton';
import QuickSendItem from '../../components/Dashboard/QuickSendItem';
import SummaryCard from '../../components/Dashboard/SummaryCard';
import ParentSwitcherModal from '../../components/ParentSwitcherModal';
import CreateNewReminderModal from './CreateNewReminderModal';
import Images from '../../assets/Images';
import type { TaskType } from '../../models';
import { deliverCaregiverEscalationAlert, registerPushTokenForUser } from '../../services/notifications';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';

export default function ChildDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { parents, loading: relationshipsLoading } = useRelationships();
  const { selectedParent, setSelectedParentId } = useSelectedParent();

  const [timelineTab, setTimelineTab] = React.useState<'today' | 'history'>('today');
  const [createReminderOpen, setCreateReminderOpen] = React.useState(false);
  const [switcherOpen, setSwitcherOpen] = React.useState(false);
  const [occurrences, setOccurrences] = React.useState<any[]>([]);
  const [historyOccurrences, setHistoryOccurrences] = React.useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [todayData, setTodayData] = React.useState<{ pending: any[]; completed: any[]; missed: any[]; upcoming: any[] }>({
    pending: [],
    completed: [],
    missed: [],
    upcoming: [],
  });
  const [tasks, setTasks] = React.useState<any[]>([]);
  const alertedOccurrences = React.useRef<Set<string>>(new Set());

  const parentUid = selectedParent?.profile?.uid ?? selectedParent?.relationship.parentId ?? null;
  const relationshipId = selectedParent?.relationship.id ?? null;

  React.useEffect(() => {
    if (user?.uid) {
      registerPushTokenForUser(user.uid).catch(() => {});
    }
  }, [user?.uid]);

  React.useEffect(() => {
    if (!parentUid || !relationshipId) {
      setOccurrences([]);
      setTodayData({ pending: [], completed: [], missed: [], upcoming: [] });
      setHistoryOccurrences([]);
      return;
    }
    let mounted = true;
    const todayStr = todayString();
    const unsubscribe = subscribeToOccurrencesForParent(
      parentUid,
      todayStr,
      todayStr,
      (occs) => {
        if (mounted) {
          setOccurrences(occs);
          const classified = getTodayOccurrences(occs);
          setTodayData(classified);

          // Deliver native care alert to caregiver for newly missed occurrences
          const parentName = selectedParent?.profile?.name;
          for (const missedOcc of classified.missed) {
            if (missedOcc.escalatedAt && !alertedOccurrences.current.has(missedOcc.id)) {
              alertedOccurrences.current.add(missedOcc.id);
              deliverCaregiverEscalationAlert(missedOcc, parentName).catch(() => {});
            }
          }
        }
      },
      (err) => {
        console.error('ChildDashboard occurrences listener error:', err);
      },
      // The caregiver must constrain the query with their own uid so the
      // security rules can prove it only returns their relationship's data.
      user?.uid
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [parentUid, relationshipId, selectedParent?.profile?.name, user?.uid]);

  const loadHistory = React.useCallback(() => {
    if (!parentUid) return;
    setHistoryLoading(true);
    setHistoryError(null);
    getHistoryOccurrencesForParent(parentUid, 14, user?.uid)
      .then((items) => {
        setHistoryOccurrences(items);
        setHistoryLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to load history occurrences:', err);
        setHistoryError('Unable to load history. Please check your connection.');
        setHistoryLoading(false);
      });
  }, [parentUid]);

  React.useEffect(() => {
    if (timelineTab === 'history') {
      loadHistory();
    }
  }, [timelineTab, loadHistory]);

  React.useEffect(() => {
    if (!parentUid) return;
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateMissedOccurrences(parentUid, user?.uid).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [parentUid, user?.uid]);

  const quickSend = async (type: TaskType, title: string) => {
    if (!user || !relationshipId || !parentUid) {
      Alert.alert('No Parent Selected', 'Please connect a parent first.');
      return;
    }
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    try {
      await createCareTask({
        relationshipId,
        createdBy: user.uid,
        assignedTo: parentUid,
        type,
        title,
        note: '',
        description: '',
        scheduledTime: `${hh}:${mm}`,
        frequency: 'once',
        startDate: todayString(),
        active: true,
      });
      Alert.alert('Reminder Sent', `Sent "${title}" to ${selectedParent?.profile?.name ?? 'your parent'}.`);
    } catch {
      Alert.alert('Could Not Send', 'Please check your connection and try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>Dashboard</Text>
            <View style={styles.topBarRight}>
              <Pressable
                onPress={() => router.push('/(tabs)/settings')}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={styles.iconBtn}>
                <Ionicons name="settings-outline" size={18} color={Colors.dashboard.icon} />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => setSwitcherOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Switch parent"
            style={({ pressed }) => [styles.parentChip, { opacity: pressed ? 0.85 : 1 }]}>
            <View style={styles.parentAvatar}>
              <Text style={styles.parentAvatarText}>
                {getInitials(selectedParent?.profile?.name ?? 'Parent')}
              </Text>
            </View>
            <View style={styles.parentChipTextCol}>
              <Text style={styles.parentKicker}>CARING FOR</Text>
              <Text style={styles.parentName}>
                {selectedParent?.profile?.name ??
                  (relationshipsLoading ? 'Loading parent...' : 'No parent connected')}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.alpha.white60} />
          </Pressable>

          {relationshipsLoading && !selectedParent ? (
            <View style={styles.dashboardLoadingWrap}>
              <ActivityIndicator size="large" color={Colors.dashboard.accent} />
              <Text style={styles.dashboardLoadingText}>Loading care dashboard...</Text>
            </View>
          ) : !relationshipId ? (
            <Pressable
              onPress={() => router.push('/(tabs)/settings')}
              accessibilityRole="button"
              accessibilityLabel="Invite a parent"
              style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={Colors.alpha.white30} />
              <Text style={styles.emptyTitle}>No parent connected yet</Text>
              <Text style={styles.emptyText}>
                Tap here or go to Profile to invite your parent with a 6-digit code.
              </Text>
            </Pressable>
          ) : (
            <>
              <SummaryCard
                percent={totalPercent(todayData)}
                completedLabel={`${todayData.completed.length} completed`}
                missedLabel={`${todayData.missed.length} missed`}
                streakLabel={`${todayData.pending.length + todayData.upcoming.length} remaining`}
              />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Send</Text>
                <View style={styles.quickRow}>
                  <QuickSendItem label="Water" iconName="water-outline" onPress={() => quickSend('water', 'Drink water')} />
                  <QuickSendItem label="Meds" iconName="medical-outline" onPress={() => quickSend('medicine', 'Take medicine')} />
                  <QuickSendItem label="Call" iconName="call-outline" onPress={() => quickSend('call', `Call ${selectedParent?.profile?.name ?? 'me'}`)} />
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
                  {timelineTab === 'today'
                    ? renderToday(todayData, selectedParent?.profile?.name ?? '')
                    : renderHistory(historyOccurrences, historyLoading, historyError, loadHistory)}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {relationshipId ? (
          <FloatingActionButton
            onPress={() => setCreateReminderOpen(true)}
            accessibilityLabel="Create reminder"
            style={{ marginBottom: -60 }}
          />
        ) : null}

        <ParentSwitcherModal
          visible={switcherOpen}
          parents={parents}
          selectedUid={parentUid}
          onSelect={setSelectedParentId}
          onClose={() => setSwitcherOpen(false)}
        />
        <CreateNewReminderModal
          visible={createReminderOpen}
          onClose={() => setCreateReminderOpen(false)}
          relationshipId={relationshipId ?? ''}
          parentId={parentUid ?? ''}
          parentName={selectedParent?.profile?.name ?? 'your parent'}
          onCreated={() => {
            setCreateReminderOpen(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function totalPercent(data: { completed: any[]; missed: any[]; pending: any[]; upcoming: any[] }) {
  const total = data.completed.length + data.missed.length + data.pending.length + data.upcoming.length;
  if (total === 0) return 0;
  return Math.round((data.completed.length / total) * 100);
}

function renderToday(data: { pending: any[]; completed: any[]; missed: any[]; upcoming: any[] }, parentName: string) {
  const cards: React.ReactElement[] = [];
  data.pending.forEach((o) => {
    cards.push(
      <CareCard
        key={o.id}
        title={o.title ?? 'Reminder'}
        time={formatTime12h(o.scheduledTime)}
        iconName="notifications-outline"
        status="upcoming"
        statusLabel="Pending"
      />
    );
  });
  data.completed.forEach((o) => {
    cards.push(
      <CareCard
        key={o.id}
        title={o.title ?? 'Reminder'}
        time={formatTime12h(o.scheduledTime)}
        iconName="checkmark-done-outline"
        status="done"
        statusLabel="Completed"
      />
    );
  });
  data.missed.forEach((o) => {
    cards.push(
      <CareCard
        key={o.id}
        title={o.title ?? 'Reminder'}
        time={formatTime12h(o.scheduledTime)}
        iconName="alert-circle-outline"
        status="missed"
        statusLabel="Missed"
      />
    );
  });
  data.upcoming.forEach((o) => {
    cards.push(
      <CareCard
        key={o.id}
        title={o.title ?? 'Reminder'}
        time={formatTime12h(o.scheduledTime)}
        iconName="time-outline"
        status="upcoming"
        statusLabel="Upcoming"
      />
    );
  });
  if (cards.length === 0) {
    return (
      <EmptyState
        compact
        iconName="sunny-outline"
        title="No Reminders Today"
        description="All clear! No care tasks are scheduled for today."
      />
    );
  }
  return cards;
}

function renderHistory(
  occurrences: any[],
  loading: boolean,
  error: string | null,
  onRetry: () => void
) {
  if (loading) {
    return <ActivityIndicator size="small" color={Colors.dashboard.accent} style={{ paddingVertical: 24 }} />;
  }
  if (error) {
    return <ErrorBanner message={error} onRetry={onRetry} retryLabel="Retry" />;
  }
  if (occurrences.length === 0) {
    return (
      <EmptyState
        compact
        iconName="time-outline"
        title="No Past Activity"
        description="Completed and missed reminders will appear here."
      />
    );
  }
  return occurrences.map((o) => {
    const status: CareStatus =
      o.status === 'completed' ? 'done' : o.status === 'missed' ? 'missed' : 'upcoming';
    return (
      <CareCard
        key={o.id}
        title={o.title ?? 'Reminder'}
        time={`${o.scheduledDate} • ${formatTime12h(o.scheduledTime)}`}
        iconName={
          o.status === 'completed'
            ? 'checkmark-circle-outline'
            : o.status === 'missed'
            ? 'alert-circle-outline'
            : 'time-outline'
        }
        status={status}
        statusLabel={o.status === 'completed' ? 'Completed' : o.status === 'missed' ? 'Missed' : 'Pending'}
      />
    );
  });
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
  parentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.accentSelectedBorder,
  },
  parentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accentIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentAvatarText: { color: Colors.dashboard.accent, fontWeight: '900', fontSize: 15 },
  parentChipTextCol: { flex: 1 },
  parentKicker: { color: Colors.alpha.white35, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  parentName: { color: Colors.dashboard.text, fontSize: 15, fontWeight: '900', marginTop: 1 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: { color: Colors.dashboard.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: Colors.alpha.white45, fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '700' },
  section: { marginTop: 2, gap: 10 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: Colors.dashboard.text, fontSize: 14, fontWeight: '900' },
  quickRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  timelineList: { gap: 10 },
  noTasks: { color: Colors.alpha.white40, fontSize: 13, fontWeight: '700', paddingVertical: 16, textAlign: 'center' },
  segmentWrap: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  segmentBtnOn: {
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  segmentText: { color: Colors.dashboard.tabInactive, fontSize: 11, fontWeight: '900' },
  segmentTextOn: { color: Colors.dashboard.text },
  dashboardLoadingWrap: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dashboardLoadingText: {
    color: Colors.alpha.white45,
    fontSize: 13,
    fontWeight: '700',
  },
});
