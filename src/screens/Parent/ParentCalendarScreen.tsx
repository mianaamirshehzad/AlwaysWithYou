import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import ParentCalendarHeader from '../../components/ParentCalendar/ParentCalendarHeader';
import WeekStrip, { WeekDay } from '../../components/ParentCalendar/WeekStrip';
import ProgressCard from '../../components/ParentCalendar/ProgressCard';
import DailyCareSection from '../../components/ParentCalendar/DailyCareSection';
import CalendarPromoCard from '../../components/ParentCalendar/CalendarPromoCard';

export default function ParentCalendarScreen() {
  const [selectedDate, setSelectedDate] = React.useState(() => stripTime(new Date()));
  const days = React.useMemo(() => buildWeek(selectedDate), [selectedDate]);
  const subtitle = React.useMemo(() => formatMonthYear(selectedDate), [selectedDate]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ParentCalendarHeader
          title="VITALITY CARE"
          subtitle={subtitle}
          onPrev={() => setSelectedDate((d) => addDays(d, -7))}
          onNext={() => setSelectedDate((d) => addDays(d, 7))}
        />
        <WeekStrip days={days} selectedDate={selectedDate} onSelect={(d) => setSelectedDate(stripTime(d))} />
        <ProgressCard percent={25} completedLabel="25% Complete" hint="3 more tasks scheduled for today" />
        <DailyCareSection
          items={[
            { title: 'Morning Pills', timeLabel: '08:00 AM • COMPLETED', status: 'completed', iconName: 'medical-outline' },
            { title: 'Afternoon Walk', timeLabel: '02:30 PM • UPCOMING', status: 'upcoming', iconName: 'walk-outline', actionLabel: 'Start' },
            { title: 'Hydration Check', timeLabel: '10:00 AM • MISSED', status: 'missed', iconName: 'water-outline' },
            { title: 'Evening Meal', timeLabel: '06:00 PM • SCHEDULED', status: 'scheduled', iconName: 'restaurant-outline' },
          ]}
          onViewAll={() => {}}
        />
        <CalendarPromoCard />
        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function stripTime(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return stripTime(x);
}

function startOfWeekMonday(d: Date) {
  const x = stripTime(d);
  const jsDay = x.getDay(); // 0..6 (Sun..Sat)
  const diff = (jsDay + 6) % 7; // Mon=0 ... Sun=6
  x.setDate(x.getDate() - diff);
  return x;
}

function buildWeek(anchor: Date): WeekDay[] {
  const start = startOfWeekMonday(anchor);
  const dows = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
  return dows.map((dow, i) => {
    const date = addDays(start, i);
    return { dow, day: date.getDate(), date };
  });
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28, gap: 14 },
});

