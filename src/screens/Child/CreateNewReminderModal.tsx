import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import Colors from '@/src/assets/Colors';
import Button from '../../components/Button';
import ReminderForCard from '../../components/Dashboard/ReminderForCard';
import { useAuth } from '@/src/context/AuthContext';
import { createCareTask, generateOccurrencesForTask } from '@/src/services/firestore/tasks';
import { todayString, formatDateInput } from '@/src/utils/date';
import type { TaskType, Frequency } from '@/src/models';

type Props = {
  visible: boolean;
  onClose: () => void;
  relationshipId: string;
  parentId: string;
  parentName: string;
  onCreated?: () => void;
};

const REMINDER_TYPES: Array<{ key: TaskType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { key: 'medicine', label: 'Medicine', icon: 'medical-outline' },
  { key: 'water', label: 'Water', icon: 'water-outline' },
  { key: 'walk', label: 'Walk', icon: 'walk-outline' },
  { key: 'exercise', label: 'Exercise', icon: 'fitness-outline' },
  { key: 'call', label: 'Call', icon: 'call-outline' },
  { key: 'custom', label: 'Custom', icon: 'ellipsis-horizontal-outline' },
];

const DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export default function CreateNewReminderModal(props: Props) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = React.useState<TaskType>('medicine');
  const [note, setNote] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [frequency, setFrequency] = React.useState<Frequency>('daily');
  const [selectedDays, setSelectedDays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [timePickerOpen, setTimePickerOpen] = React.useState(false);
  const [timeDate, setTimeDate] = React.useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });

  React.useEffect(() => {
    if (props.visible) {
      setFormError(null);
      setSubmitting(false);
    }
  }, [props.visible]);

  const defaultTitle = REMINDER_TYPES.find((t) => t.key === selectedType)?.label ?? 'Reminder';

  const handleSend = async () => {
    if (!user || !props.relationshipId || !props.parentId) {
      setFormError('Please connect a parent first.');
      return;
    }
    const finalTitle = (title.trim() || defaultTitle).trim();
    const hh = String(timeDate.getHours()).padStart(2, '0');
    const mm = String(timeDate.getMinutes()).padStart(2, '0');
    const scheduledTime = `${hh}:${mm}`;
    const startDate = todayString();

    setSubmitting(true);
    setFormError(null);
    try {
      const task = {
        relationshipId: props.relationshipId,
        createdBy: user.uid,
        assignedTo: props.parentId,
        type: selectedType,
        title: finalTitle,
        note: note.trim(),
        scheduledTime,
        frequency,
        daysOfWeek: frequency === 'custom' ? selectedDays : undefined,
        startDate,
        active: true,
      };
      await createCareTask(task as any);
      props.onCreated?.();
    } catch {
      setFormError('Could not save the reminder. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={props.visible}
      onRequestClose={props.onClose}
      animationType="slide"
      presentationStyle="fullScreen">
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
          <View style={styles.screen}>
            <View style={styles.header}>
              <Pressable onPress={props.onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={Colors.dashboard.icon} />
              </Pressable>
              <Text style={styles.headerTitle}>New Reminder</Text>
              <View style={{ width: 22 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.forText}>For: {props.parentName}</Text>

              <Text style={styles.sectionKicker}>WHAT IS THIS FOR?</Text>
              <View style={styles.reminderGrid}>
                {REMINDER_TYPES.map((t) => (
                  <ReminderForCard
                    key={t.key}
                    label={t.label}
                    iconName={t.icon}
                    selected={selectedType === t.key}
                    onPress={() => setSelectedType(t.key)}
                  />
                ))}
              </View>

              {selectedType === 'custom' ? (
                <>
                  <Text style={styles.sectionKicker}>REMINDER TITLE</Text>
                  <View style={styles.titleBox}>
                    <TextInput
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g. Take vitamins"
                      placeholderTextColor={Colors.alpha.white25}
                      style={styles.titleInput}
                      maxLength={60}
                    />
                  </View>
                </>
              ) : null}

              <View style={styles.noteHeader}>
                <Text style={styles.sectionKicker}>PERSONAL NOTE</Text>
                <Text style={styles.optional}>Optional</Text>
              </View>
              <View style={styles.noteBox}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={`Hi ${props.parentName}, remember to take care.`}
                  placeholderTextColor={Colors.alpha.white25}
                  multiline
                  style={styles.noteInput}
                  maxLength={120}
                />
                <Text style={styles.counter}>{`${note.length}/120`}</Text>
              </View>

              <Text style={styles.sectionKicker}>TIME</Text>
              <View style={styles.whenCard}>
                <View style={styles.whenRow}>
                  <View style={styles.whenLeft}>
                    <View style={styles.whenIcon}>
                      <Ionicons name="time-outline" size={16} color={Colors.alpha.white75} />
                    </View>
                    <Text style={styles.whenLabel}>Scheduled Time</Text>
                  </View>
                  <Pressable
                    onPress={() => setTimePickerOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Pick time"
                    style={styles.whenPill}>
                    <Text style={styles.whenPillText}>{formatTime(timeDate)}</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={styles.sectionKicker}>FREQUENCY</Text>
              <View style={styles.freqRow}>
                <FreqChip label="Daily" active={frequency === 'daily'} onPress={() => setFrequency('daily')} />
                <FreqChip label="Weekly" active={frequency === 'weekly'} onPress={() => setFrequency('weekly')} />
                <FreqChip label="Once" active={frequency === 'once'} onPress={() => setFrequency('once')} />
              </View>

              <Text style={styles.sectionKicker}>REPEAT ON</Text>
              <View style={styles.daysRow}>
                {DAYS.map((d) => (
                  <Pressable
                    key={d.value}
                    onPress={() =>
                      setSelectedDays((prev) =>
                        prev.includes(d.value) ? prev.filter((x) => x !== d.value) : [...prev, d.value]
                      )
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedDays.includes(d.value) }}
                    style={[styles.dayChip, selectedDays.includes(d.value) && styles.dayChipOn]}>
                    <Text style={[styles.dayText, selectedDays.includes(d.value) && styles.dayTextOn]}>
                      {d.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <Button
                label={submitting ? 'Saving...' : 'Send Reminder'}
                onPress={handleSend}
                disabled={submitting}
                showArrow
                arrowIconName="heart"
              />
            </View>
          </View>
        </KeyboardAvoidingView>

        {timePickerOpen ? (
          <DateTimePicker
            value={timeDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => {
              if (Platform.OS !== 'ios') setTimePickerOpen(false);
              if (!selected) return;
              setTimeDate(selected);
            }}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function formatTime(d: Date) {
  let hours = d.getHours();
  const minute = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function FreqChip(props: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: props.active }}
      style={[styles.freqChip, props.active && styles.freqChipOn]}>
      <Text style={[styles.freqText, props.active && styles.freqTextOn]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },
  screen: { flex: 1, paddingHorizontal: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 15, paddingBottom: 8 },
  headerTitle: { color: Colors.dashboard.text, fontSize: 16, fontWeight: '900' },
  content: { paddingBottom: 18, gap: 16 },
  forText: { color: Colors.dashboard.accent, fontSize: 13, fontWeight: '900', textAlign: 'center' },

  sectionKicker: { color: Colors.alpha.white35, fontSize: 11, letterSpacing: 1.2, fontWeight: '900' },
  reminderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  titleBox: {
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    borderRadius: 22,
    paddingHorizontal: 14,
  },
  titleInput: {
    height: 48,
    color: Colors.dashboard.icon,
    fontSize: 14,
    fontWeight: '700',
    padding: 0,
  },

  noteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optional: { color: Colors.alpha.white28, fontSize: 11, fontWeight: '800' },
  noteBox: {
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    borderRadius: 22,
    padding: 14,
  },
  noteInput: {
    minHeight: 80,
    color: Colors.dashboard.icon,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'left',
    textAlignVertical: 'top',
    padding: 0,
  },
  counter: { marginTop: 6, alignSelf: 'flex-end', color: Colors.alpha.white28, fontSize: 11, fontWeight: '900' },

  whenCard: {
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    borderRadius: 22,
    padding: 14,
  },
  whenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  whenLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  whenIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whenLabel: { color: Colors.alpha.white75, fontSize: 13, fontWeight: '900' },
  whenPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accentSoftBg,
    borderWidth: 1,
    borderColor: Colors.dashboard.accentPillBorder,
  },
  whenPillText: { color: Colors.dashboard.accent, fontSize: 12, fontWeight: '900' },

  freqRow: { flexDirection: 'row', gap: 10 },
  freqChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqChipOn: { backgroundColor: Colors.dashboard.surfaceStrong, borderColor: Colors.alpha.white08 },
  freqText: { color: Colors.alpha.white40, fontSize: 12, fontWeight: '900' },
  freqTextOn: { color: Colors.dashboard.text },

  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  dayChipOn: { backgroundColor: Colors.dashboard.accentSelectedBg, borderColor: Colors.dashboard.accentSelectedBorder },
  dayText: { color: Colors.alpha.white45, fontSize: 12, fontWeight: '900' },
  dayTextOn: { color: Colors.dashboard.text },

  footer: { paddingTop: 10, paddingBottom: 14, gap: 8 },
  formError: { color: Colors.dashboard.danger, fontSize: 12, fontWeight: '800', textAlign: 'center' },
});
