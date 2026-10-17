import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import EmptyState from '@/src/components/EmptyState';
import ErrorBanner from '@/src/components/ErrorBanner';
import { useAuth } from '@/src/context/AuthContext';
import { useRelationships } from '@/src/context/RelationshipsContext';
import { subscribeToMessages, sendMessageWithRetry } from '@/src/services/firestore/chat';
import { checkVoiceNoteSupport, formatAudioDuration, playAudioNote } from '@/src/services/voiceNotes';
import { getInitials } from '@/src/utils/date';
import { getUserProfilesBatch } from '@/src/services/firestore/users';
import type { Message, UserProfile } from '@/src/models';

export default function ParentChatScreen() {
  const { user } = useAuth();
  const { relationships, loading: relsLoading } = useRelationships();

  const [childProfiles, setChildProfiles] = React.useState<Map<string, UserProfile>>(new Map());
  const [selectedChildId, setSelectedChildId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [failedText, setFailedText] = React.useState<string | null>(null);

  const listRef = React.useRef<FlatList<Message>>(null);

  React.useEffect(() => {
    if (relationships.length === 0) return;
    const childIds = relationships.map((r) => r.childId);
    getUserProfilesBatch(childIds).then(setChildProfiles);
  }, [relationships]);

  const selectedRelationship = React.useMemo(() => {
    if (!selectedChildId) return relationships[0] ?? null;
    return relationships.find((r) => r.childId === selectedChildId) ?? relationships[0] ?? null;
  }, [selectedChildId, relationships]);

  const relationshipId = selectedRelationship?.id ?? null;

  React.useEffect(() => {
    if (!selectedChildId && relationships.length > 0) {
      setSelectedChildId(relationships[0].childId);
    }
  }, [relationships, selectedChildId]);

  React.useEffect(() => {
    if (!relationshipId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToMessages(
      relationshipId,
      (msgs) => {
        setMessages(msgs);
        setLoading(false);
      },
      100,
      () => {
        setSendError('Failed to synchronize messages with the server.');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [relationshipId]);

  const childProfile = selectedChildId ? childProfiles.get(selectedChildId) ?? null : null;
  const childName = childProfile?.name ?? 'Caregiver';

  const handleSend = async (textToSend?: string) => {
    const candidate = (textToSend ?? text).trim();
    if (!candidate || !user || !relationshipId || sending) return;

    if (!textToSend) {
      setText('');
    }
    setSending(true);
    setSendError(null);
    setFailedText(null);

    try {
      await sendMessageWithRetry(relationshipId, user.uid, candidate);
    } catch (err: any) {
      setFailedText(candidate);
      setSendError(err?.message ?? 'Failed to deliver message. Tap to retry.');
      if (!textToSend) {
        setText(candidate);
      }
    } finally {
      setSending(false);
    }
  };

  const handleVoiceNotePress = () => {
    const support = checkVoiceNoteSupport();
    Alert.alert(
      'Voice Notes Not Configured',
      `${support.reason ?? 'Voice messages require the expo-audio library and cloud storage.'}\n\nText messages are fully operational.`,
      [{ text: 'OK' }]
    );
  };

  const handlePlayAudio = (item: Message) => {
    if (!item.audioUrl) {
      Alert.alert('Audio Unavailable', 'No audio recording found for this message.');
      return;
    }
    playAudioNote(item.audioUrl).catch((err) => {
      Alert.alert('Playback Unsupported', err.message);
    });
  };

  const renderChildSelector = () => {
    if (relationships.length <= 1) return null;
    return (
      <View style={styles.selectorRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={relationships}
          keyExtractor={(r) => r.childId}
          contentContainerStyle={styles.selectorContent}
          renderItem={({ item }) => {
            const profile = childProfiles.get(item.childId);
            const isActive = item.childId === selectedChildId;
            const name = profile?.name ?? 'Child';
            return (
              <Pressable
                onPress={() => setSelectedChildId(item.childId)}
                accessibilityRole="button"
                accessibilityLabel={`Select conversation with ${name}`}
                style={({ pressed }) => [
                  styles.selectorChip,
                  isActive && styles.selectorChipActive,
                  { opacity: pressed ? 0.85 : 1 },
                ]}>
                <View style={[styles.selectorAvatar, isActive && styles.selectorAvatarActive]}>
                  <Text style={[styles.selectorAvatarText, isActive && styles.selectorAvatarTextActive]}>
                    {getInitials(name)}
                  </Text>
                </View>
                <Text style={[styles.selectorName, isActive && styles.selectorNameActive]} numberOfLines={1}>
                  {name}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(childName)}</Text>
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerName}>{childName}</Text>
            <Text style={styles.headerSub}>{relationshipId ? 'Connected' : 'No caregiver linked'}</Text>
          </View>
        </View>

        {renderChildSelector()}

        {relsLoading || loading ? (
          <ActivityIndicator size="large" color={Colors.dashboard.accent} style={{ marginTop: 60 }} />
        ) : !relationshipId ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              iconName="chatbubbles-outline"
              title="No Caregiver Linked"
              description="Connect with your caregiver to start chatting."
            />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              iconName="chatbubble-ellipses-outline"
              title="Say Hello!"
              description={`Send your first message to ${childName}.`}
            />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const mine = item.senderId === user?.uid;
              const isAudio = item.messageType === 'audio';

              return (
                <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  {!mine && (
                    <View style={styles.bubbleAvatar}>
                      <Text style={styles.bubbleAvatarText}>{getInitials(childName)}</Text>
                    </View>
                  )}
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {isAudio ? (
                      <Pressable
                        onPress={() => handlePlayAudio(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Play voice note, duration ${formatAudioDuration(item.audioDurationMs)}`}
                        style={styles.audioRow}>
                        <Ionicons
                          name="play-circle"
                          size={28}
                          color={mine ? Colors.dashboard.bg : Colors.dashboard.accent}
                        />
                        <View style={styles.audioMeta}>
                          <Text
                            style={[
                              styles.audioDuration,
                              mine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                            ]}>
                            Voice note • {formatAudioDuration(item.audioDurationMs)}
                          </Text>
                          <Text
                            style={[
                              styles.audioHint,
                              mine ? styles.audioHintMine : styles.audioHintTheirs,
                            ]}>
                            Tap to play
                          </Text>
                        </View>
                      </Pressable>
                    ) : (
                      <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                        {item.text}
                      </Text>
                    )}
                    <Text style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
                      {formatMessageTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {sendError ? (
          <View style={styles.errorBannerWrap}>
            <ErrorBanner
              message={sendError}
              onRetry={failedText ? () => handleSend(failedText) : undefined}
              retryLabel="Retry"
              onDismiss={() => {
                setSendError(null);
                setFailedText(null);
              }}
            />
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <Pressable
            onPress={handleVoiceNotePress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Record voice note"
            style={({ pressed }) => [styles.micBtn, { opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name="mic-outline" size={22} color={Colors.alpha.white55} />
          </Pressable>

          <TextInput
            value={text}
            onChangeText={(val) => {
              setText(val);
              if (sendError && !failedText) setSendError(null);
            }}
            placeholder={`Message ${childName}...`}
            placeholderTextColor={Colors.alpha.white28}
            style={styles.input}
            multiline
            maxLength={500}
            accessibilityLabel="Message Input"
          />

          <Pressable
            onPress={() => handleSend()}
            disabled={!text.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => [
              styles.sendBtn,
              (!text.trim() || sending) && styles.sendBtnDisabled,
              { opacity: pressed ? 0.85 : 1 },
            ]}>
            <Ionicons name="send" size={18} color={Colors.dashboard.bg} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatMessageTime(ts: any) {
  if (!ts) return '';
  const ms = typeof ts === 'object' && 'toMillis' in ts ? ts.toMillis() : new Date(ts).getTime();
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dashboard.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accentIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.dashboard.accent, fontWeight: '900', fontSize: 15 },
  headerTextCol: { flex: 1 },
  headerName: { color: Colors.dashboard.text, fontSize: 16, fontWeight: '900' },
  headerSub: { color: Colors.alpha.white40, fontSize: 11, fontWeight: '800' },
  selectorRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dashboard.border,
    backgroundColor: Colors.dashboard.surface,
  },
  selectorContent: { paddingHorizontal: 18, gap: 8 },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    backgroundColor: Colors.dashboard.surfaceStrong,
    minHeight: 44,
  },
  selectorChipActive: {
    borderColor: Colors.dashboard.accent,
    backgroundColor: Colors.dashboard.accentSoftBg,
  },
  selectorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorAvatarActive: { backgroundColor: Colors.dashboard.accent },
  selectorAvatarText: { color: Colors.alpha.white70, fontSize: 10, fontWeight: '900' },
  selectorAvatarTextActive: { color: Colors.dashboard.bg },
  selectorName: { color: Colors.alpha.white70, fontSize: 13, fontWeight: '700' },
  selectorNameActive: { color: Colors.dashboard.accentText, fontWeight: '900' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  listContent: { padding: 18, gap: 8, flexGrow: 1 },
  bubbleRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dashboard.accentIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleAvatarText: { color: Colors.dashboard.accent, fontSize: 10, fontWeight: '900' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: Colors.dashboard.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  bubbleText: { fontSize: 15, fontWeight: '700' },
  bubbleTextMine: { color: Colors.dashboard.bg },
  bubbleTextTheirs: { color: Colors.dashboard.text },
  bubbleTime: { marginTop: 4, fontSize: 10, fontWeight: '800', alignSelf: 'flex-end' },
  bubbleTimeMine: { color: Colors.dashboard.bg, opacity: 0.7 },
  bubbleTimeTheirs: { color: Colors.alpha.white40 },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
    minWidth: 160,
  },
  audioMeta: {
    flex: 1,
    gap: 2,
  },
  audioDuration: {
    fontSize: 13,
    fontWeight: '800',
  },
  audioHint: {
    fontSize: 10,
    fontWeight: '700',
  },
  audioHintMine: {
    color: Colors.dashboard.bg,
    opacity: 0.8,
  },
  audioHintTheirs: {
    color: Colors.alpha.white45,
  },
  errorBannerWrap: {
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dashboard.border,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.dashboard.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
