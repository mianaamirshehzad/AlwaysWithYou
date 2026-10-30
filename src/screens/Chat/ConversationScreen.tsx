import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
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
import { subscribeToMessages, sendMessageWithRetry } from '@/src/services/firestore/chat';
import { checkVoiceNoteSupport, formatAudioDuration, playAudioNote } from '@/src/services/voiceNotes';
import { getInitials } from '@/src/utils/date';
import type { Message } from '@/src/models';

export default function ConversationScreen() {
  const router = useRouter();
  const { user, role: myRole } = useAuth();
  const params = useLocalSearchParams<{
    relationshipId?: string;
    name?: string;
    recipientRole?: string;
    photoUrl?: string;
  }>();

  const relationshipId = params.relationshipId ?? null;
  const recipientName =
    params.name && params.name.trim()
      ? params.name.trim()
      : myRole === 'child'
      ? 'Parent'
      : 'Caregiver';
  const photoUrl = params.photoUrl && params.photoUrl.trim() ? params.photoUrl : null;

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [failedText, setFailedText] = React.useState<string | null>(null);

  const listRef = React.useRef<FlatList<Message>>(null);

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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(myRole === 'parent' ? '/(parent-tabs)/chat' : '/(tabs)/three');
    }
  };

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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to chats"
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name="arrow-back" size={20} color={Colors.dashboard.text} />
          </Pressable>

          <View style={styles.avatar}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(recipientName)}</Text>
            )}
          </View>

          <View style={styles.headerTextCol}>
            <Text style={styles.headerName} numberOfLines={1}>
              {recipientName}
            </Text>
            <Text style={styles.headerSub}>
              {relationshipId ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dashboard.accent} />
          </View>
        ) : !relationshipId ? (
          <Pressable style={styles.emptyContainer} onPress={Keyboard.dismiss}>
            <EmptyState
              compact
              iconName="chatbubbles-outline"
              title="Conversation Not Found"
              description="Unable to locate this conversation. Please return to your messages."
            />
          </Pressable>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              messages.length === 0 && styles.listContentEmpty,
            ]}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Pressable style={styles.emptyPressable} onPress={Keyboard.dismiss}>
                <EmptyState
                  compact
                  iconName="chatbubble-ellipses-outline"
                  title="Say Hello!"
                  description={`Send your first message to ${recipientName}.`}
                />
              </Pressable>
            }
            onContentSizeChange={() => {
              if (messages.length > 0) {
                listRef.current?.scrollToEnd({ animated: true });
              }
            }}
            renderItem={({ item }) => {
              const mine = item.senderId === user?.uid;
              const isAudio = item.messageType === 'audio';

              return (
                <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  {!mine && (
                    <View style={styles.bubbleAvatar}>
                      {photoUrl ? (
                        <Image source={{ uri: photoUrl }} style={styles.bubbleAvatarImg} />
                      ) : (
                        <Text style={styles.bubbleAvatarText}>{getInitials(recipientName)}</Text>
                      )}
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

        {/* Sticky Input Bar */}
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
            placeholder={relationshipId ? `Message ${recipientName}...` : 'Select a conversation to chat'}
            placeholderTextColor={Colors.alpha.white28}
            style={styles.input}
            multiline
            maxLength={500}
            editable={Boolean(relationshipId)}
            accessibilityLabel="Message Input"
          />

          <Pressable
            onPress={() => handleSend()}
            disabled={!text.trim() || sending || !relationshipId}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => [
              styles.sendBtn,
              (!text.trim() || sending || !relationshipId) && styles.sendBtnDisabled,
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
  if (!ms || Number.isNaN(ms)) return '';
  const d = new Date(ms);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dashboard.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.alpha.white08,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.dashboard.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dashboard.accentIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.dashboard.accentSoftBorder,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: Colors.dashboard.accent,
    fontWeight: '900',
    fontSize: 15,
  },
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    color: Colors.dashboard.text,
    fontSize: 16,
    fontWeight: '900',
  },
  headerSub: {
    color: Colors.dashboard.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bubbleAvatarImg: {
    width: '100%',
    height: '100%',
  },
  bubbleAvatarText: {
    color: Colors.alpha.white70,
    fontSize: 10,
    fontWeight: '800',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleMine: {
    backgroundColor: Colors.dashboard.accent,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: Colors.dashboard.bg,
  },
  bubbleTextTheirs: {
    color: Colors.dashboard.text,
  },
  bubbleTime: {
    fontSize: 10,
    fontWeight: '700',
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: 'rgba(7, 31, 25, 0.65)',
  },
  bubbleTimeTheirs: {
    color: Colors.alpha.white45,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audioMeta: {
    flex: 1,
    gap: 2,
  },
  audioDuration: {
    fontSize: 14,
    fontWeight: '700',
  },
  audioHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  audioHintMine: {
    color: 'rgba(7, 31, 25, 0.70)',
  },
  audioHintTheirs: {
    color: Colors.alpha.white55,
  },
  errorBannerWrap: {
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: Colors.dashboard.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.alpha.white08,
    gap: 10,
  },
  micBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 22,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: Colors.dashboard.text,
    fontSize: 15,
    fontWeight: '600',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dashboard.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
});

