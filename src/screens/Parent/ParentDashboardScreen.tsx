import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import Images from '../../assets/Images';
import FloatingActionButton from '../../components/Dashboard/FloatingActionButton';
import ParentReminderCard from '../../components/Dashboard/ParentReminderCard';
import NotificationAcknowledgementModal from '../../components/NotificationAcknowledgementModal';
import UpcomingReminderCard from '../../components/UpcomingReminderCard';
import { useAuth } from '../../context/AuthContext';
import { useRelationships } from '../../context/RelationshipsContext';
import {
  subscribeToOccurrencesForParent,
  getTodayOccurrences,
  completeOccurrence,
  updateMissedOccurrences,
} from '../../services/firestore/tasks';
import { getUserProfile } from '../../services/firestore/users';
import type { UserProfile, TaskOccurrence } from '../../models';
import { todayString, formatTime12h } from '../../utils/date';
import * as Linking from 'expo-linking';

const TASK_ICON_MAP: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  medicine: 'medical-outline',
  water: 'water-outline',
  walk: 'walk-outline',
  exercise: 'fitness-outline',
  call: 'call-outline',
  custom: 'ellipsis-horizontal-outline',
};

export default function ParentDashboardScreen() {
  const { user } = useAuth();
  const { relationships } = useRelationships();

  const [parentProfile, setParentProfile] = React.useState<UserProfile | null>(null);
  const [childProfiles, setChildProfiles] = React.useState<Map<string, UserProfile>>(new Map());
  const [occurrences, setOccurrences] = React.useState<TaskOccurrence[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [completingId, setCompletingId] = React.useState<string | null>(null);

  const today = React.useMemo(() => formatToday(new Date()), []);

  React.useEffect(() => {
    if (!user) return;
    let mounted = true;

    getUserProfile(user.uid).then((p) => {
      if (mounted) setParentProfile(p);
    });

    return () => { mounted = false; };
  }, [user]);

  React.useEffect(() => {
    if (relationships.length === 0) return;
    let mounted = true;

    const childIds = relationships.map((r) => r.childId);
    const loadProfiles = async () => {
      const map = new Map<string, UserProfile>();
      await Promise.all(
        childIds.map(async (id) => {
          const p = await getUserProfile(id);
          if (p) map.set(id, p);
        })
      );
      if (mounted) setChildProfiles(map);
    };
    loadProfiles();

    return () => { mounted = false; };
  }, [relationships]);

  React.useEffect(() => {
    if (!user) return;
    let mounted = true;
    setLoading(true);

    updateMissedOccurrences().catch(() => {});

    const todayStr = todayString();
    const unsubscribe = subscribeToOccurrencesForParent(user.uid, todayStr, todayStr, (occs) => {
      if (mounted) {
        setOccurrences(occs);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user]);

  const { pending, completed, missed, upcoming } = React.useMemo(
    () => getTodayOccurrences(occurrences),
    [occurrences]
  );

  const totalToday = pending.length + completed.length + missed.length;
  const completionPercent = totalToday > 0 ? Math.round((completed.length / totalToday) * 100) : 0;

  const firstChildName = React.useMemo(() => {
    if (relationships.length === 0) return null;
    const childId = relationships[0].childId;
    return childProfiles.get(childId)?.name ?? null;
  }, [relationships, childProfiles]);

  const childPhone = React.useMemo(() => {
    if (relationships.length === 0) return null;
    const childId = relationships[0].childId;
    return childProfiles.get(childId)?.phone ?? null;
  }, [relationships, childProfiles]);

  const parentLabel = parentProfile?.name?.split(' ')[0] ?? 'there';

  const handleComplete = React.useCallback(
    async (occurrence: TaskOccurrence) => {
      if (!user || completingId) return;
      setCompletingId(occurrence.id);
      try {
        await completeOccurrence(occurrence.id, user.uid);
      } catch {
        // optimistically we already show pending, Firestore will retry
      } finally {
        setCompletingId(null);
      }
    },
    [user, completingId]
  );

  const handleCall = React.useCallback(() => {
    if (childPhone) {
      Linking.openURL(`tel:${childPhone}`);
    }
  }, [childPhone]);

  React.useEffect(() => {
    if (pending.length > 0) {
      const t = setTimeout(() => setNotifOpen(true), 3000);
      return () => clearTimeout(t);
    }
  }, [pending.length]);

  const primaryPending = pending[0] ?? null;
  const firstChildNameForCard = primaryPending
    ? (childProfiles.get(primaryPending.childId)?.name ?? 'Your child')
    : firstChildName ?? 'Your child';

  if (loading && occurrences.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.dashboard.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.todayKicker}>TODAY</Text>
            <Text style={styles.todayText}>{today}</Text>
          </View>

          <View style={styles.headerRight}>
            {totalToday > 0 && (
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>{`${completionPercent}%`}</Text>
              </View>
            )}
            <View style={styles.avatarWrap}>
              <Image source={Images.hands} style={styles.avatar} />
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.greeting}>
            <Text style={styles.greetingHi}>Hi, </Text>
            <Text style={styles.greetingName}>{firstChildName ? `${firstChildName} 👋` : `${parentLabel} 👋`}</Text>
          </Text>

          {totalToday > 0 && (
            <View style={styles.statsRow}>
              <View style={[styles.statPill, { backgroundColor: Colors.dashboard.accentSoftBg }]}>
                <Ionicons name="time-outline" size={14} color={Colors.dashboard.accent} />
                <Text style={[styles.statText, { color: Colors.dashboard.accentText }]}>{pending.length} pending</Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: Colors.dashboard.infoSoftBg }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color={Colors.dashboard.info} />
                <Text style={[styles.statText, { color: Colors.dashboard.infoText }]}>{completed.length} done</Text>
              </View>
              {missed.length > 0 && (
                <View style={[styles.statPill, { backgroundColor: Colors.dashboard.dangerSoftBg }]}>
                  <Ionicons name="alert-circle-outline" size={14} color={Colors.dashboard.danger} />
                  <Text style={[styles.statText, { color: Colors.dashboard.dangerText }]}>{missed.length} missed</Text>
                </View>
              )}
            </View>
          )}

          {primaryPending ? (
            <>
              <Text style={styles.sectionKicker}>RIGHT NOW</Text>
              <ParentReminderCard
                title={primaryPending.title}
                timeLabel={formatTime12h(primaryPending.scheduledTime)}
                fromName={firstChildNameForCard}
                actionLabel={completingId === primaryPending.id ? 'Completing...' : 'Mark Done'}
                onPressAction={() => handleComplete(primaryPending)}
              />
            </>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-done-circle" size={36} color={Colors.dashboard.accent} />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySub}>No pending tasks right now.</Text>
            </View>
          )}

          {upcoming.length > 0 && (
            <View style={styles.comingUp}>
              <Text style={styles.sectionKicker}>COMING UP</Text>
              <View style={styles.list}>
                {upcoming.map((occ) => (
                  <UpcomingReminderCard
                    key={occ.id}
                    title={occ.title}
                    subtitle={childProfiles.get(occ.childId)?.name ?? ''}
                    timeLabel={formatTime12h(occ.scheduledTime)}
                    iconName={TASK_ICON_MAP[occ.type] ?? 'ellipsis-horizontal-outline'}
                  />
                ))}
              </View>
            </View>
          )}

          {completed.length > 0 && (
            <View style={styles.comingUp}>
              <Text style={styles.sectionKicker}>COMPLETED</Text>
              <View style={styles.list}>
                {completed.map((occ) => (
                  <UpcomingReminderCard
                    key={occ.id}
                    title={occ.title}
                    subtitle={childProfiles.get(occ.childId)?.name ?? ''}
                    timeLabel={`${formatTime12h(occ.scheduledTime)} ✓`}
                    iconName={TASK_ICON_MAP[occ.type] ?? 'checkmark-outline'}
                  />
                ))}
              </View>
            </View>
          )}

          {missed.length > 0 && (
            <View style={styles.comingUp}>
              <Text style={styles.sectionKicker}>MISSED</Text>
              <View style={styles.list}>
                {missed.map((occ) => (
                  <UpcomingReminderCard
                    key={occ.id}
                    title={occ.title}
                    subtitle={childProfiles.get(occ.childId)?.name ?? ''}
                    timeLabel={`${formatTime12h(occ.scheduledTime)} ✗`}
                    iconName={TASK_ICON_MAP[occ.type] ?? 'alert-circle-outline'}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <FloatingActionButton
          iconName="call"
          iconSize={24}
          accessibilityLabel="Call Child"
          onPress={handleCall}
          style={styles.button}
        />
        <NotificationAcknowledgementModal visible={notifOpen} onClose={() => setNotifOpen(false)} />
      </View>
    </SafeAreaView>
  );
}

function formatToday(d: Date) {
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  const day = d.getDate();
  return `${weekday}, ${day}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },
  screen: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    backgroundColor: Colors.dashboard.bg,
    paddingHorizontal: 18,
    paddingBottom: 10,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerLeft: { gap: 6 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayKicker: { color: Colors.dashboard.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  todayText: { color: Colors.dashboard.text, fontSize: 18, fontWeight: '900' },
  progressBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accentSoftBg,
    borderWidth: 1,
    borderColor: Colors.dashboard.accentSoftBorder,
  },
  progressBadgeText: { color: Colors.dashboard.accentText, fontSize: 12, fontWeight: '900' },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  avatar: { width: '100%', height: '100%', opacity: 0.95 },

  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 14,
  },

  button: { marginBottom: -100 },

  greeting: { fontSize: 44, lineHeight: 48, fontWeight: '900' },
  greetingHi: { color: Colors.dashboard.text },
  greetingName: { color: Colors.alpha.white40 },

  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  statText: { fontSize: 12, fontWeight: '900' },

  sectionKicker: { color: Colors.alpha.white35, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 6 },
  comingUp: { gap: 10, marginTop: 4 },
  list: { gap: 10 },

  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
    backgroundColor: Colors.dashboard.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  emptyTitle: { color: Colors.dashboard.text, fontSize: 18, fontWeight: '900' },
  emptySub: { color: Colors.alpha.white45, fontSize: 13, fontWeight: '700' },
});
