import * as React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import Images from '../../assets/Images';
import FloatingActionButton from '../../components/Dashboard/FloatingActionButton';
import ParentReminderCard from '../../components/Dashboard/ParentReminderCard';
import NotificationAcknowledgementModal from '../../components/NotificationAcknowledgementModal';
import UpcomingReminderCard from '../../components/UpcomingReminderCard';

type ParentKind = 'mother' | 'father';

export default function ParentDashboardScreen() {
  // TODO: replace with real profile data.
  const parentKind: ParentKind = 'father';
  const parentLabel = parentKind === 'father' ? 'Dad' : 'Mom';

  const today = React.useMemo(() => formatToday(new Date()), []);
  const [notifOpen, setNotifOpen] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setNotifOpen(true), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.todayKicker}>TODAY</Text>
            <Text style={styles.todayText}>{today}</Text>
          </View>

          <View style={styles.avatarWrap}>
            <Image source={Images.hands} style={styles.avatar} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.greeting}>
            <Text style={styles.greetingHi}>Hi, </Text>
            <Text style={styles.greetingName}>{parentLabel}.</Text>
          </Text>

          <Text style={styles.sectionKicker}>RIGHT NOW</Text>

          <ParentReminderCard
            title="Afternoon Pills"
            timeLabel="2:00 PM"
            fromName="Sarah"
            onPressAction={() => {}}
          />

          <View style={styles.comingUp}>
            <Text style={styles.sectionKicker}>COMING UP</Text>
            <View style={styles.list}>
              <UpcomingReminderCard title="Glass of Water" subtitle="Hydration check" timeLabel="3:00 PM" iconName="water-outline" />
              <UpcomingReminderCard title="Short Walk" subtitle="Get some fresh air" timeLabel="5:00 PM" iconName="walk-outline" />
            </View>
          </View>
        </ScrollView>

        <FloatingActionButton iconName="call" iconSize={24} accessibilityLabel="Call" onPress={() => {}} style = {styles.button} />
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

  // Sticky header
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
  todayKicker: { color: Colors.dashboard.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  todayText: { color: Colors.dashboard.text, fontSize: 18, fontWeight: '900' },
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

  sectionKicker: { color: Colors.alpha.white35, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 6 },
  comingUp: { gap: 10, marginTop: 4 },
  list: { gap: 10 },
});

