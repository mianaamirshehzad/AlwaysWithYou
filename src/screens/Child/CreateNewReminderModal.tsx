import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import Colors from '@/src/assets/Colors';
import Button from '../../components/Button';
import ReminderForCard from '../../components/Dashboard/ReminderForCard';
import UserProfileHeader from '../../components/UserProfileHeader';

type ReminderType = 'medicine' | 'water' | 'rest' | 'walk' | 'parkTime' | 'callMe';
type Frequency = 'daily' | 'weekly' | 'custom';

const REMINDER_TYPES: Array<{ key: ReminderType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { key: 'medicine', label: 'Medicine', icon: 'medical-outline' },
  { key: 'water', label: 'Water', icon: 'water-outline' },
  { key: 'rest', label: 'Rest', icon: 'bed-outline' },
  { key: 'walk', label: 'Walk', icon: 'walk-outline' },
  { key: 'parkTime', label: 'Park Time', icon: 'leaf-outline' },
  { key: 'callMe', label: 'Call Me', icon: 'call-outline' },
];

export default function CreateNewReminderModal(props: { visible: boolean; onClose: () => void }) {
  const [selectedType, setSelectedType] = React.useState<ReminderType>('medicine');
  const [note, setNote] = React.useState('');
  const [frequency, setFrequency] = React.useState<Frequency>('daily');
  const [customDays, setCustomDays] = React.useState<number[]>([2]);
  const [customDayInput, setCustomDayInput] = React.useState('');

  const [timePickerOpen, setTimePickerOpen] = React.useState(false);
  const [timeDraft, setTimeDraft] = React.useState<TimeParts>({ hour: 2, minute: 0, ampm: 'PM' });
  const [time, setTime] = React.useState<TimeParts>({ hour: 2, minute: 0, ampm: 'PM' });
  const [timeDate, setTimeDate] = React.useState(() => {
    const d = new Date();
    d.setHours(14, 0, 0, 0);
    return d;
  });

  const remaining = Math.max(0, 120 - note.length);

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
              <UserProfileHeader name="For Mom" subtitle="Tap to change" size="md" showBadge />

              <Text style={styles.sectionKicker}>WHAT&apos;S THIS REMINDER FOR?</Text>
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

              <View style={styles.noteHeader}>
                <Text style={styles.sectionKicker}>PERSONAL NOTE</Text>
                <Text style={styles.optional}>Optional</Text>
              </View>
              <View style={styles.noteBox}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Hi Mom, remember to take your heart meds after lunch! Love you."
                  placeholderTextColor={Colors.alpha.white25}
                  multiline
                  style={styles.noteInput}
                  maxLength={120}
                />
                <View style={styles.noteFooter}>
                  <Pressable style={styles.noteAction} accessibilityRole="button">
                    <Ionicons name="mic" size={14} color={Colors.dashboard.accent} />
                    <Text style={styles.noteActionText}>Voice Note</Text>
                  </Pressable>
                  <Pressable style={styles.noteAction} accessibilityRole="button">
                    <Ionicons name="happy-outline" size={14} color={Colors.dashboard.warning} />
                    <Text style={styles.noteActionText}>Emoji</Text>
                  </Pressable>
                  <Text style={styles.counter}>{`${120 - remaining}/${120}`}</Text>
                </View>
              </View>

              <Text style={styles.sectionKicker}>WHEN?</Text>
              <View style={styles.whenCard}>
                <View style={styles.whenRow}>
                  <View style={styles.whenLeft}>
                    <View style={styles.whenIcon}>
                      <Ionicons name="time-outline" size={16} color={Colors.alpha.white75} />
                    </View>
                    <Text style={styles.whenLabel}>Time</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setTimeDraft(time);
                      setTimePickerOpen(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Pick time"
                    style={styles.whenPill}>
                    <Text style={styles.whenPillText}>{formatTime(time)}</Text>
                  </Pressable>
                </View>

                <View style={styles.divider} />

                <View style={styles.whenRow}>
                  <View style={styles.whenLeft}>
                    <View style={styles.whenIcon}>
                      <Ionicons name="repeat-outline" size={16} color={Colors.alpha.white75} />
                    </View>
                    <Text style={styles.whenLabel}>Frequency</Text>
                  </View>
                </View>

                <View style={styles.freqRow}>
                  <FreqChip label="Daily" active={frequency === 'daily'} onPress={() => setFrequency('daily')} />
                  <FreqChip label="Weekly" active={frequency === 'weekly'} onPress={() => setFrequency('weekly')} />
                  <FreqChip label="Custom" active={frequency === 'custom'} onPress={() => setFrequency('custom')} />
                </View>

                {frequency === 'custom' ? (
                  <View style={styles.customWrap}>
                    <Text style={styles.customHint}>Repeat every (days)</Text>
                    <View style={styles.customChips}>
                      {customDays.map((d) => (
                        <Pressable
                          key={d}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${d} days`}
                          onPress={() => setCustomDays((prev) => prev.filter((x) => x !== d))}
                          style={styles.customChip}>
                          <Text style={styles.customChipText}>{`${d}d`}</Text>
                          <Ionicons name="close" size={12} color={Colors.alpha.white75} />
                        </Pressable>
                      ))}
                    </View>

                    <View style={styles.customInputRow}>
                      <TextInput
                        value={customDayInput}
                        onChangeText={(v: string) => setCustomDayInput(v.replace(/[^0-9]/g, '').slice(0, 3))}
                        placeholder="e.g. 2"
                        placeholderTextColor={Colors.alpha.white25}
                        keyboardType="number-pad"
                        style={styles.customInput}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Add custom frequency"
                        onPress={() => {
                          const n = Number(customDayInput);
                          if (!Number.isFinite(n) || n <= 0) return;
                          setCustomDays((prev) => Array.from(new Set([...prev, n])).sort((a, b) => a - b));
                          setCustomDayInput('');
                        }}
                        style={styles.customAddBtn}>
                        <Text style={styles.customAddText}>Add</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Button label="Send Reminder" onPress={props.onClose} showArrow arrowIconName="heart" />
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
              setTime(partsFromDate(selected));
            }}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

type TimeParts = { hour: number; minute: number; ampm: 'AM' | 'PM' };

function formatTime(t: TimeParts) {
  return `${t.hour}:${String(t.minute).padStart(2, '0')} ${t.ampm}`;
}

function partsFromDate(d: Date): TimeParts {
  let hours = d.getHours();
  const minute = d.getMinutes();
  const ampm: TimeParts['ampm'] = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return { hour: hours, minute, ampm };
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

function TimeChip(props: { label: string; active: boolean; onPress: () => void }) {
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

  sectionKicker: { color: Colors.alpha.white35, fontSize: 11, letterSpacing: 1.2, fontWeight: '900' },
  reminderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

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
    minHeight: 92,
    color: Colors.dashboard.icon,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'left',
    textAlignVertical: 'top',
    padding: 0,
  },
  noteFooter: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  noteAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteActionText: { color: Colors.alpha.white45, fontSize: 11, fontWeight: '900' },
  counter: { marginLeft: 'auto', color: Colors.alpha.white28, fontSize: 11, fontWeight: '900' },

  whenCard: {
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    borderRadius: 22,
    padding: 14,
    gap: 12,
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
  divider: { height: 1, backgroundColor: Colors.dashboard.border },

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
  freqChipOn: {
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderColor: Colors.alpha.white08,
  },
  freqText: { color: Colors.alpha.white40, fontSize: 12, fontWeight: '900' },
  freqTextOn: { color: Colors.dashboard.text },

  customWrap: { marginTop: 10, gap: 10 },
  customHint: { color: Colors.alpha.white45, fontSize: 11, fontWeight: '900' },
  customChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  customChipText: { color: Colors.dashboard.text, fontSize: 12, fontWeight: '900' },
  customInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customInput: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    color: Colors.dashboard.text,
    fontWeight: '900',
  },
  customAddBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accentSoftBg,
    borderWidth: 1,
    borderColor: Colors.dashboard.accentPillBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAddText: { color: Colors.dashboard.accent, fontSize: 12, fontWeight: '900' },

  footer: { paddingTop: 10, paddingBottom: 14 },
});

