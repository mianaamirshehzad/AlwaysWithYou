import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import { useAuth } from '@/src/context/AuthContext';
import { useSelectedParent } from '@/src/context/RelationshipsContext';
import { getTasksForRelationship, toggleTaskActive, deleteCareTask } from '@/src/services/firestore/tasks';
import { formatTime12h, formatDateLong } from '@/src/utils/date';
import type { CareTask } from '@/src/models';

export default function PlanScreen() {
  const { selectedParent } = useSelectedParent();
  const [tasks, setTasks] = React.useState<CareTask[]>([]);
  const [loading, setLoading] = React.useState(true);

  const relationshipId = selectedParent?.relationship.id ?? null;

  React.useEffect(() => {
    if (!relationshipId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    getTasksForRelationship(relationshipId)
      .then((t) => mounted && setTasks(t))
      .catch(() => mounted && setTasks([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [relationshipId]);

  const handleToggle = async (task: CareTask) => {
    try {
      await toggleTaskActive(task.id, !task.active);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, active: !task.active } : t)));
    } catch {
      Alert.alert('Could Not Update', 'Please try again.');
    }
  };

  const handleDelete = (task: CareTask) => {
    Alert.alert('Delete Reminder?', `"${task.title}" will be removed and its future schedule cancelled.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCareTask(task.id);
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
          } catch {
            Alert.alert('Could Not Delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Plan</Text>
        <Text style={styles.subtitle}>{selectedParent?.profile?.name ?? 'No parent'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.dashboard.accent} style={{ marginTop: 60 }} />
        ) : !relationshipId ? (
          <EmptyState
            icon="people-outline"
            title="No parent connected"
            message="Connect a parent in Settings to start planning care reminders."
          />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No active reminders"
            message="Create a new reminder from the Home tab."
          />
        ) : (
          tasks.map((task) => (
            <View key={task.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.statusDot, task.active ? styles.dotOn : styles.dotOff]} />
                <Text style={styles.cardTitle}>{task.title}</Text>
                <Pressable
                  onPress={() => handleToggle(task)}
                  accessibilityRole="button"
                  accessibilityLabel={task.active ? 'Pause reminder' : 'Resume reminder'}
                  hitSlop={8}
                  style={styles.iconBtn}>
                  <Ionicons
                    name={task.active ? 'pause' : 'play'}
                    size={20}
                    color={task.active ? Colors.dashboard.warning : Colors.dashboard.accent}
                  />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(task)}
                  accessibilityRole="button"
                  accessibilityLabel="Delete reminder"
                  hitSlop={8}
                  style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.dashboard.danger} />
                </Pressable>
              </View>

              <View style={styles.metaRow}>
                <MetaChip icon="time-outline" label={formatTime12h(task.scheduledTime)} />
                <MetaChip icon="repeat-outline" label={frequencyLabel(task.frequency)} />
                {task.daysOfWeek && task.daysOfWeek.length > 0 ? (
                  <MetaChip icon="calendar-outline" label={task.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')} />
                ) : null}
              </View>

              {task.note ? <Text style={styles.note}>{task.note}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function frequencyLabel(f: string) {
  switch (f) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'once':
      return 'One time';
    case 'custom':
      return 'Custom days';
    default:
      return f;
  }
}

function MetaChip(props: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.metaChip}>
      <Ionicons name={props.icon} size={12} color={Colors.alpha.white50} />
      <Text style={styles.metaChipText}>{props.label}</Text>
    </View>
  );
}

function EmptyState(props: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; message: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={props.icon} size={44} color={Colors.alpha.white28} />
      <Text style={styles.emptyTitle}>{props.title}</Text>
      <Text style={styles.emptyText}>{props.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8, gap: 2 },
  title: { color: Colors.dashboard.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: Colors.alpha.white45, fontSize: 13, fontWeight: '800' },
  content: { paddingHorizontal: 18, paddingBottom: 28, gap: 12 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24, gap: 10 },
  emptyTitle: { color: Colors.dashboard.text, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: Colors.alpha.white45, fontSize: 13, lineHeight: 19, textAlign: 'center', fontWeight: '700' },

  card: {
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  dotOn: { backgroundColor: Colors.dashboard.accent },
  dotOff: { backgroundColor: Colors.alpha.white25 },
  cardTitle: { flex: 1, color: Colors.dashboard.text, fontSize: 15, fontWeight: '900' },
  iconBtn: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  metaChipText: { color: Colors.alpha.white55, fontSize: 11, fontWeight: '800' },
  note: { color: Colors.alpha.white50, fontSize: 12, lineHeight: 17, fontWeight: '600' },
});
