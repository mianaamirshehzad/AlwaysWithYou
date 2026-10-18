import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import Colors from '@/src/assets/Colors';
import Button from '../../components/Button';
import ReminderForCard from '../../components/Dashboard/ReminderForCard';
import { useAuth } from '@/src/context/AuthContext';
import { useRelationships } from '@/src/context/RelationshipsContext';
import { createCareTask } from '@/src/services/firestore/tasks';
import { todayString } from '@/src/utils/date';
import { getReadyMadeNote, isReadyMadeNote } from '@/src/utils/reminders';
import type { TaskType, Frequency } from '@/src/models';

type Props = {
  visible: boolean;
  onClose: () => void;
  relationshipId: string;
  parentId: string;
  parentName: string;
  onCreated?: () => void;
};

const REMINDER_TYPES: Array<{
  key: TaskType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
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
  const { user, role } = useAuth();
  const { relationships } = useRelationships();

  const [selectedType, setSelectedType] = React.useState<TaskType | null>(null);
  const [note, setNote] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [timingOption, setTimingOption] = React.useState<'now' | 'scheduled' | null>(null);
  const [timePickerOpen, setTimePickerOpen] = React.useState(false);
  const [timeDate, setTimeDate] = React.useState(() => new Date());
  const [frequency, setFrequency] = React.useState<Frequency | null>(null);
  const [selectedDays, setSelectedDays] = React.useState<number[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (props.visible) {
      setFormError(null);
      setSubmitting(false);
      setSelectedType(null);
      setTitle('');
      setNote('');
      setTimingOption(null);
      setTimeDate(new Date());
      setFrequency(null);
      setSelectedDays([]);
    }
  }, [props.visible]);

  // Validation: Send Reminder button is inactive for empty type, time, frequency, or repeat on
  const isTypeValid =
    selectedType !== null && (selectedType !== 'custom' || title.trim().length > 0);
  const isTimeValid = timingOption !== null;
  const isFrequencyValid = frequency !== null;
  const isRepeatOnValid = selectedDays.length > 0;

  const canSubmit =
    isTypeValid &&
    isTimeValid &&
    isFrequencyValid &&
    isRepeatOnValid &&
    !submitting;

  const handleSelectType = (nextType: TaskType) => {
    if (nextType === 'custom') {
      if (isReadyMadeNote(note, props.parentName)) {
        setNote('');
      }
      if (!title.trim() && selectedType && selectedType !== 'custom') {
        const prevLabel = REMINDER_TYPES.find((t) => t.key === selectedType)?.label;
        if (prevLabel) setTitle(prevLabel);
      }
      setSelectedType('custom');
    } else {
      setSelectedType(nextType);
      const readyMade = getReadyMadeNote(nextType, props.parentName);
      setNote(readyMade);
      setTitle('');
    }
  };

  const handleNoteChange = (newText: string) => {
    setNote(newText);

    // If personal note is added or edited by caregiver:
    // "If personal note is added, it should be the Custom option selected for this what is it for section as now the reminder is customised."
    if (selectedType === null) {
      if (newText.trim().length > 0) {
        setSelectedType('custom');
      }
    } else if (selectedType !== 'custom') {
      const readyMade = getReadyMadeNote(selectedType, props.parentName);
      if (newText !== readyMade) {
        const prevLabel = REMINDER_TYPES.find((t) => t.key === selectedType)?.label;
        setSelectedType('custom');
        if (!title.trim() && prevLabel) {
          setTitle(prevLabel);
        }
      }
    }
  };

  const handleSelectFrequency = (nextFreq: Frequency) => {
    setFrequency(nextFreq);
    if (selectedDays.length === 0) {
      if (nextFreq === 'daily') {
        setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      } else {
        setSelectedDays([new Date().getDay()]);
      }
    }
  };

  const handleSelectTiming = (mode: 'now' | 'scheduled') => {
    setTimingOption(mode);
    if (mode === 'now') {
      setTimeDate(new Date());
    } else {
      setTimePickerOpen(true);
    }
  };

  const defaultTitle =
    REMINDER_TYPES.find((t) => t.key === selectedType)?.label ?? 'Reminder';

  const handleSend = async () => {
    if (!canSubmit || submitting) return;
    if (!user || !props.relationshipId || !props.parentId) {
      setFormError('Please connect a parent first.');
      return;
    }
    if (role !== 'child') {
      setFormError('Only a caregiver child can create reminders.');
      return;
    }
    const hasActiveRel = relationships.some(
      (r) =>
        r.id === props.relationshipId &&
        r.status === 'active' &&
        r.parentId === props.parentId
    );
    if (!hasActiveRel) {
      setFormError('You do not have an active relationship with this parent.');
      return;
    }

    const finalTitle = (title.trim() || defaultTitle).trim();
    const targetDate = timingOption === 'now' ? new Date() : timeDate;
    const hh = String(targetDate.getHours()).padStart(2, '0');
    const mm = String(targetDate.getMinutes()).padStart(2, '0');
    const scheduledTime = `${hh}:${mm}`;
    const startDate = todayString();

    setSubmitting(true);
    setFormError(null);
    try {
      const task = {
        relationshipId: props.relationshipId,
        createdBy: user.uid,
        assignedTo: props.parentId,
        type: selectedType!,
        title: finalTitle,
        note: note.trim(),
        scheduledTime,
        frequency: frequency!,
        daysOfWeek: selectedDays,
        startDate,
        active: true,
      };
      await createCareTask(task);
      props.onCreated?.();
      props.onClose();
    } catch (err: any) {
      setFormError(
        err?.message ?? 'Could not save the reminder. Please check your connection and try again.'
      );
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safe}>
          <View style={styles.screen}>
            <View style={styles.header}>
              <Pressable
                onPress={props.onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={Colors.dashboard.icon} />
              </Pressable>
              <Text style={styles.headerTitle}>New reminder</Text>
              <View style={{ width: 22 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.forText}>For: {props.parentName}</Text>

              {/* What is this for? */}
              <Text style={styles.sectionKicker}>What is this for?</Text>
              <View style={styles.reminderGrid}>
                {REMINDER_TYPES.map((t) => (
                  <ReminderForCard
                    key={t.key}
                    label={t.label}
                    iconName={t.icon}
                    selected={selectedType === t.key}
                    onPress={() => handleSelectType(t.key)}
                  />
                ))}
              </View>

              {selectedType === 'custom' ? (
                <>
                  <Text style={styles.sectionKicker}>Reminder title</Text>
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

              {/* Personal note */}
              <View style={styles.noteHeader}>
                <Text style={styles.sectionKicker}>Personal note</Text>
                <Text style={styles.optional}>Optional</Text>
              </View>
              <View style={styles.noteBox}>
                <TextInput
                  value={note}
                  onChangeText={handleNoteChange}
                  placeholder={`Hi ${props.parentName}, remember to take care.`}
                  placeholderTextColor={Colors.alpha.white25}
                  multiline
                  style={styles.noteInput}
                  maxLength={120}
                />
                <Text style={styles.counter}>{`${note.length}/120`}</Text>
              </View>

              {/* Time Options */}
              <Text style={styles.sectionKicker}>Time</Text>
              <View style={styles.timeOptionsRow}>
                <Pressable
                  onPress={() => handleSelectTiming('now')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: timingOption === 'now' }}
                  style={[
                    styles.selectablePill,
                    styles.timePill,
                    timingOption === 'now' && styles.selectablePillOn,
                  ]}>
                  <View
                    style={[
                      styles.iconCircle,
                      timingOption === 'now' && styles.iconCircleOn,
                    ]}>
                    <Ionicons
                      name="flash"
                      size={15}
                      color={
                        timingOption === 'now' ? Colors.brand.onPrimary : Colors.alpha.white82
                      }
                    />
                  </View>
                  <View style={styles.timePillTextWrap}>
                    <Text
                      style={[
                        styles.pillLabel,
                        timingOption === 'now' && styles.pillLabelOn,
                      ]}>
                      Right now
                    </Text>
                    <Text style={styles.timeSubText}>Send immediately</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectTiming('scheduled')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: timingOption === 'scheduled' }}
                  style={[
                    styles.selectablePill,
                    styles.timePill,
                    timingOption === 'scheduled' && styles.selectablePillOn,
                  ]}>
                  <View
                    style={[
                      styles.iconCircle,
                      timingOption === 'scheduled' && styles.iconCircleOn,
                    ]}>
                    <Ionicons
                      name="time"
                      size={15}
                      color={
                        timingOption === 'scheduled'
                          ? Colors.brand.onPrimary
                          : Colors.alpha.white82
                      }
                    />
                  </View>
                  <View style={styles.timePillTextWrap}>
                    <Text
                      style={[
                        styles.pillLabel,
                        timingOption === 'scheduled' && styles.pillLabelOn,
                      ]}>
                      Scheduled time
                    </Text>
                    <Text style={styles.timeSubText}>
                      {timingOption === 'scheduled' ? formatTime(timeDate) : 'Pick a time'}
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Frequency */}
              <Text style={styles.sectionKicker}>Frequency</Text>
              <View style={styles.freqRow}>
                <Pressable
                  onPress={() => handleSelectFrequency('daily')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: frequency === 'daily' }}
                  style={[
                    styles.selectablePill,
                    styles.freqPill,
                    frequency === 'daily' && styles.selectablePillOn,
                  ]}>
                  <View
                    style={[
                      styles.iconCircle,
                      frequency === 'daily' && styles.iconCircleOn,
                    ]}>
                    <Ionicons
                      name="repeat"
                      size={14}
                      color={
                        frequency === 'daily' ? Colors.brand.onPrimary : Colors.alpha.white82
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.pillLabel,
                      frequency === 'daily' && styles.pillLabelOn,
                    ]}>
                    Daily
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectFrequency('weekly')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: frequency === 'weekly' }}
                  style={[
                    styles.selectablePill,
                    styles.freqPill,
                    frequency === 'weekly' && styles.selectablePillOn,
                  ]}>
                  <View
                    style={[
                      styles.iconCircle,
                      frequency === 'weekly' && styles.iconCircleOn,
                    ]}>
                    <Ionicons
                      name="calendar"
                      size={14}
                      color={
                        frequency === 'weekly' ? Colors.brand.onPrimary : Colors.alpha.white82
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.pillLabel,
                      frequency === 'weekly' && styles.pillLabelOn,
                    ]}>
                    Weekly
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectFrequency('once')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: frequency === 'once' }}
                  style={[
                    styles.selectablePill,
                    styles.freqPill,
                    frequency === 'once' && styles.selectablePillOn,
                  ]}>
                  <View
                    style={[
                      styles.iconCircle,
                      frequency === 'once' && styles.iconCircleOn,
                    ]}>
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={
                        frequency === 'once' ? Colors.brand.onPrimary : Colors.alpha.white82
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.pillLabel,
                      frequency === 'once' && styles.pillLabelOn,
                    ]}>
                    Once
                  </Text>
                </Pressable>
              </View>

              {/* Repeat on */}
              <Text style={styles.sectionKicker}>Repeat on</Text>
              <View style={styles.daysRow}>
                {DAYS.map((d) => {
                  const isSelected = selectedDays.includes(d.value);
                  return (
                    <Pressable
                      key={d.value}
                      onPress={() =>
                        setSelectedDays((prev) =>
                          prev.includes(d.value)
                            ? prev.filter((x) => x !== d.value)
                            : [...prev, d.value]
                        )
                      }
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={[styles.dayChip, isSelected && styles.dayChipOn]}>
                      <Text style={[styles.dayText, isSelected && styles.dayTextOn]}>
                        {d.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <Button
                label={submitting ? 'Sending reminder...' : 'Send reminder'}
                onPress={handleSend}
                disabled={!canSubmit}
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
              setTimingOption('scheduled');
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },
  screen: { flex: 1, paddingHorizontal: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 15,
    paddingBottom: 8,
  },
  headerTitle: { color: Colors.dashboard.text, fontSize: 16, fontWeight: '900' },
  content: { paddingBottom: 24, gap: 14 },
  forText: {
    color: Colors.dashboard.accent,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 2,
  },

  sectionKicker: {
    color: Colors.alpha.white45,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 4,
  },
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
  counter: {
    marginTop: 6,
    alignSelf: 'flex-end',
    color: Colors.alpha.white28,
    fontSize: 11,
    fontWeight: '900',
  },

  /* Consistent selectable pill styling matching ReminderForCard */
  selectablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
  },
  selectablePillOn: {
    backgroundColor: Colors.dashboard.accentSelectedBg,
    borderColor: Colors.dashboard.accentSelectedBorder,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dashboard.surfaceStrong,
  },
  iconCircleOn: {
    backgroundColor: Colors.dashboard.accent,
  },
  pillLabel: {
    color: Colors.alpha.white75,
    fontSize: 12,
    fontWeight: '900',
  },
  pillLabelOn: {
    color: Colors.dashboard.text,
  },

  /* Time options */
  timeOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  timePillTextWrap: {
    flex: 1,
    gap: 1,
  },
  timeSubText: {
    color: Colors.alpha.white40,
    fontSize: 10,
    fontWeight: '700',
  },

  /* Frequency row */
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqPill: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
  },

  /* Repeat on days */
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipOn: {
    backgroundColor: Colors.dashboard.accentSelectedBg,
    borderColor: Colors.dashboard.accentSelectedBorder,
  },
  dayText: {
    color: Colors.alpha.white75,
    fontSize: 12,
    fontWeight: '900',
  },
  dayTextOn: {
    color: Colors.dashboard.text,
    fontWeight: '900',
  },

  footer: {
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
  },
  formError: {
    color: Colors.dashboard.danger,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
