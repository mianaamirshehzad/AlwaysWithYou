import * as React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import ParentCalendarHeader from '../../components/ParentCalendar/ParentCalendarHeader';
import WeekStrip, { WeekDay } from '../../components/ParentCalendar/WeekStrip';
import ProgressCard from '../../components/ParentCalendar/ProgressCard';
import DailyCareSection from '../../components/ParentCalendar/DailyCareSection';
import CalendarPromoCard from '../../components/ParentCalendar/CalendarPromoCard';
import { useAuth } from '../../context/AuthContext';
import { useRelationships } from '../../context/RelationshipsContext';
import {
  subscribeToOccurrencesForParent,
  getTodayOccurrences,
} from '../../services/firestore/tasks';
import { getUserProfile } from '../../services/firestore/users';
import type { TaskOccurrence } from '../../models';
import { todayString, formatDateInput, formatTime12h } from '../../utils/date';
import { addDays as addDaysUtil } from '../../utils/date';

const TASK_ICON_MAP: Record<string, any> = {
  medicine: 'medical-outline',
  water: 'water-outline',
  walk: 'walk-outline',
  exercise: 'fitness-outline',
  call: 'call-outline',
  custom: 'ellipsis-horizontal-outline',
};

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ParentCalendarScreen() {
  const { user } = useAuth();
  const { relationships } = useRelationships();

  const [selectedDate, setSelectedDate] = React.useState(() => stripTime(new Date()));
  const [occurrences, setOccurrences] = React.useState<TaskOccurrence[]>([]);
  const [loading, setLoading] = React.useState(true);

  const days = React.useMemo(() => buildWeek(selectedDate), [selectedDate]);
  const subtitle = React.useMemo(() => formatMonthYear(selectedDate), [selectedDate]);

  const selectedDateStr = React.useMemo(() => toDateString(selectedDate), [selectedDate]);
  const todayStr = React.useMemo(() => todayString(), []);

  React.useEffect(() => {
    if (!user) return;
    let mounted = true;
    setLoading(true);

    const unsubscribe = subscribeToOccurrencesForParent(
      user.uid,
      selectedDateStr,
      selectedDateStr,
      (occs) => {
        if (mounted) {
          setOccurrences(occs);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user, selectedDateStr]);

  const { pending, completed, missed, upcoming } = React.useMemo(
    () => getTodayOccurrences(occurrences),
    [occurrences]
  );

  const totalToday = pending.length + completed.length + missed.length;
  const completionPercent = totalToday > 0 ? Math.round((completed.length / totalToday) * 100) : 0;
  const remainingCount = pending.length + upcoming.length;

  const dailyItems = React.useMemo(() => {
    return occurrences
      .slice()
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
      .map((occ) => {
        const status = occ.status === 'completed'
          ? 'completed' as const
          : occ.status === 'missed'
          ? 'missed' as const
          : selectedDateStr === todayStr
          ? (occ.scheduledTime <= currentTimeString() ? 'upcoming' as const : 'scheduled' as const)
          : 'scheduled' as const;

        return {
          title: occ.title,
          timeLabel: `${formatTime12h(occ.scheduledTime)} • ${status.toUpperCase()}`,
          status,
          iconName: TASK_ICON_MAP[occ.type] ?? 'ellipsis-horizontal-outline',
        };
      });
  }, [occurrences, selectedDateStr, todayStr]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ParentCalendarHeader
          title="VITALITY CARE"
          subtitle={subtitle}
          onPrev={() => setSelectedDate((d) => addDaysUtil(d, -7))}
          onNext={() => setSelectedDate((d) => addDaysUtil(d, 7))}
        />
        <WeekStrip days={days} selectedDate={selectedDate} onSelect={(d) => setSelectedDate(stripTime(d))} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.dashboard.accent} />
          </View>
        ) : (
          <>
            <ProgressCard
              percent={completionPercent}
              completedLabel={`${completionPercent}% Complete`}
              hint={remainingCount > 0 ? `${remainingCount} more tasks scheduled for today` : 'All tasks done for today'}
            />

            {dailyItems.length > 0 ? (
              <DailyCareSection
                items={dailyItems}
                onViewAll={() => {}}
              />
            ) : null}

            <CalendarPromoCard />
          </>
        )}

        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function currentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function stripTime(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeekMonday(d: Date) {
  const x = stripTime(d);
  const jsDay = x.getDay();
  const diff = (jsDay + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

function buildWeek(anchor: Date): WeekDay[] {
  const start = startOfWeekMonday(anchor);
  const dows = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
  return dows.map((dow, i) => {
    const date = addDaysUtil(start, i);
    return { dow, day: date.getDate(), date };
  });
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28, gap: 14 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
});
