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
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc } from 'firebase/firestore';

import Colors from '@/src/assets/Colors';
import EmptyState from '@/src/components/EmptyState';
import ErrorBanner from '@/src/components/ErrorBanner';
import { useAuth } from '@/src/context/AuthContext';
import { useUserProfile } from '@/src/context/UserProfileContext';
import { useUnreadChat } from '@/src/context/UnreadChatContext';
import { getFirebaseDb } from '@/src/services/firebase';
import { getUserProfile } from '@/src/services/firestore/users';
import {
  subscribeToMessages,
  sendMessageWithRetry,
  getCachedMessages,
  saveCachedMessages,
  getOlderMessages,
  CHAT_PAGE_SIZE,
} from '@/src/services/firestore/chat';
import { pickChatImage, takeChatPhoto } from '@/src/services/imagePicker';
import { uploadChatMedia } from '@/src/services/mediaUpload';
import {
  checkVoiceNoteSupport,
  formatAudioDuration,
  startAudioRecording,
  stopAudioRecording,
  cancelAudioRecording,
  playAudioNote,
  pauseAudioPlayback,
  stopAudioPlayback,
} from '@/src/services/voiceNotes';
import { getInitials, getTimestampMs } from '@/src/utils/date';
import type { Message } from '@/src/models';

export default function ConversationScreen() {
  const router = useRouter();
  const { user, role: myRole } = useAuth();
  const { profile } = useUserProfile();
  const { markConversationAsRead, setActiveConversationId } = useUnreadChat();
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
  const [receiverPhoto, setReceiverPhoto] = React.useState<string | null>(photoUrl);

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [olderMessages, setOlderMessages] = React.useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [hasMoreOlder, setHasMoreOlder] = React.useState(true);
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [failedText, setFailedText] = React.useState<string | null>(null);

  const oldestDocRef = React.useRef<any>(null);
  const isLoadingOlderRef = React.useRef(false);
  const isNearBottomRef = React.useRef(true);
  const isInitialLoadedRef = React.useRef(false);

  // Set active conversation and mark as read while viewing
  React.useEffect(() => {
    if (relationshipId) {
      setActiveConversationId(relationshipId);
      void markConversationAsRead(relationshipId);
    }
    return () => {
      setActiveConversationId(null);
    };
  }, [relationshipId, markConversationAsRead, setActiveConversationId]);

  // Sync photoUrl if updated in params, or fetch other participant's profile from Firestore
  React.useEffect(() => {
    if (params.photoUrl && params.photoUrl.trim().length > 0) {
      setReceiverPhoto(params.photoUrl.trim());
      return;
    }

    if (!relationshipId || !user) return;
    let mounted = true;

    const db = getFirebaseDb();
    getDoc(doc(db, 'relationships', relationshipId))
      .then(async (snap) => {
        if (!mounted || !snap.exists()) return;
        const data = snap.data();
        const otherUid = data.parentId === user.uid ? data.childId : data.parentId;
        if (otherUid) {
          const p = await getUserProfile(otherUid);
          if (mounted && p?.photoUrl) {
            setReceiverPhoto(p.photoUrl);
          }
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [relationshipId, params.photoUrl, user]);

  const displayedMessages = React.useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of olderMessages) {
      map.set(m.id, m);
    }
    for (const m of messages) {
      map.set(m.id, m);
    }
    for (const m of pendingMessages) {
      map.set(m.id, m);
    }
    const combined = Array.from(map.values());
    combined.sort((a, b) => {
      const timeA = getTimestampMs(a.createdAt);
      const timeB = getTimestampMs(b.createdAt);
      return timeA - timeB;
    });
    return combined;
  }, [olderMessages, messages, pendingMessages]);

  // Voice recording state
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = React.useState(0);
  const recordingTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio playback state
  const [playingMessageId, setPlayingMessageId] = React.useState<string | null>(null);
  const [playbackPositionMs, setPlaybackPositionMs] = React.useState(0);
  const [playbackDurationMs, setPlaybackDurationMs] = React.useState(0);

  // Full-screen image preview modal
  const [previewImageUri, setPreviewImageUri] = React.useState<string | null>(null);

  const listRef = React.useRef<FlatList<Message>>(null);

  // Load 10 - 20 messages from local cache first, then subscribe to real-time updates
  React.useEffect(() => {
    if (!relationshipId) {
      setMessages([]);
      setOlderMessages([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    isInitialLoadedRef.current = false;
    setOlderMessages([]);
    setHasMoreOlder(true);
    oldestDocRef.current = null;

    // 1. Instant local cache hydration (10 - 20 messages)
    getCachedMessages(relationshipId)
      .then((cached) => {
        if (mounted && cached.length > 0 && !isInitialLoadedRef.current) {
          setMessages(cached);
          setLoading(false);
        }
      })
      .catch(() => {});

    // 2. Real-time subscription for latest 20 messages
    const unsubscribe = subscribeToMessages(
      relationshipId,
      (newestBatch, oldestDoc) => {
        if (!mounted) return;
        setMessages(newestBatch);
        setLoading(false);
        isInitialLoadedRef.current = true;

        void saveCachedMessages(relationshipId, newestBatch);
        void markConversationAsRead(relationshipId);

        // Store pagination cursor from oldest doc in real-time batch
        if (oldestDoc && !oldestDocRef.current) {
          oldestDocRef.current = oldestDoc;
        }
        if (newestBatch.length < CHAT_PAGE_SIZE) {
          setHasMoreOlder(false);
        }
      },
      CHAT_PAGE_SIZE,
      () => {
        if (mounted) {
          setSendError('Failed to synchronize messages with the server.');
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
      stopAudioPlayback().catch(() => {});
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [relationshipId, markConversationAsRead]);

  // Pagination: load earlier messages backwards when scrolling upwards
  const handleLoadOlderMessages = React.useCallback(async () => {
    if (loadingOlder || !hasMoreOlder || !relationshipId || !oldestDocRef.current) {
      return;
    }

    setLoadingOlder(true);
    isLoadingOlderRef.current = true;

    try {
      const result = await getOlderMessages(relationshipId, oldestDocRef.current, CHAT_PAGE_SIZE);
      if (result.messages.length > 0) {
        setOlderMessages((prev) => {
          const map = new Map<string, Message>();
          for (const m of result.messages) {
            map.set(m.id, m);
          }
          for (const m of prev) {
            map.set(m.id, m);
          }
          return Array.from(map.values());
        });
        oldestDocRef.current = result.oldestDoc;
      }
      setHasMoreOlder(result.hasMore);
    } catch (err) {
      console.warn('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
      setTimeout(() => {
        isLoadingOlderRef.current = false;
      }, 400);
    }
  }, [loadingOlder, hasMoreOlder, relationshipId]);

  const handleScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const offsetY = contentOffset.y;

      const distanceFromBottom = contentSize.height - (offsetY + layoutMeasurement.height);
      isNearBottomRef.current = distanceFromBottom < 100;

      // When user goes upwards and reaches the top of the currently displayed messages
      if (offsetY <= 40 && !loadingOlder && hasMoreOlder && displayedMessages.length >= 10) {
        void handleLoadOlderMessages();
      }
    },
    [loadingOlder, hasMoreOlder, displayedMessages.length, handleLoadOlderMessages]
  );

  const renderListHeader = React.useCallback(() => {
    if (displayedMessages.length === 0) return null;

    if (loadingOlder) {
      return (
        <View style={styles.loadingOlderWrap}>
          <ActivityIndicator size="small" color={Colors.dashboard.accent} />
          <Text style={styles.loadingOlderText}>Loading earlier messages...</Text>
        </View>
      );
    }

    if (hasMoreOlder && displayedMessages.length >= CHAT_PAGE_SIZE) {
      return (
        <Pressable
          onPress={handleLoadOlderMessages}
          accessibilityRole="button"
          accessibilityLabel="Load earlier messages"
          style={({ pressed }) => [styles.loadOlderBtn, { opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="arrow-up-circle-outline" size={16} color={Colors.dashboard.accent} />
          <Text style={styles.loadOlderBtnText}>Load earlier messages</Text>
        </Pressable>
      );
    }

    if (!hasMoreOlder && displayedMessages.length >= CHAT_PAGE_SIZE) {
      return (
        <View style={styles.startOfChatWrap}>
          <Ionicons name="chatbubble-ellipses" size={16} color={Colors.alpha.white30} />
          <Text style={styles.startOfChatText}>Beginning of conversation</Text>
        </View>
      );
    }

    return null;
  }, [displayedMessages.length, loadingOlder, hasMoreOlder, handleLoadOlderMessages]);

  const handleBack = () => {
    stopAudioPlayback().catch(() => {});
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

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: relationshipId,
      senderId: user.uid,
      text: candidate,
      messageType: 'text',
      status: 'sending' as any,
      createdAt: null as any,
    };
    setPendingMessages((prev) => [...prev, tempMsg]);

    try {
      await sendMessageWithRetry(relationshipId, user.uid, candidate, {
        messageType: 'text',
        senderName: profile?.name || user.displayName || undefined,
      });
    } catch (err: any) {
      setFailedText(candidate);
      setSendError(err?.message ?? 'Failed to deliver message. Tap to retry.');
      if (!textToSend) {
        setText(candidate);
      }
    } finally {
      setSending(false);
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  // Image attachment actions
  const handleImagePickerPress = () => {
    if (sending || !relationshipId) return;

    if (Platform.OS === 'web') {
      handlePickFromGallery();
      return;
    }

    Alert.alert('Send Photo', 'Select a source for your photo', [
      {
        text: 'Take Photo',
        onPress: handleTakePhoto,
      },
      {
        text: 'Choose from Gallery',
        onPress: handlePickFromGallery,
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const handlePickFromGallery = async () => {
    if (!user || !relationshipId || sending) return;
    try {
      const uri = await pickChatImage();
      if (!uri) return;

      const tempId = `temp-${Date.now()}`;
      const tempMsg: Message = {
        id: tempId,
        conversationId: relationshipId,
        senderId: user.uid,
        text: '📷 Photo',
        messageType: 'image',
        imageUrl: uri,
        status: 'sending' as any,
        createdAt: null as any,
      };
      setPendingMessages((prev) => [...prev, tempMsg]);

      setSending(true);
      setSendError(null);

      let finalImageUrl = uri;
      try {
        const imagePath = `chat/${relationshipId}/images/${Date.now()}.jpg`;
        finalImageUrl = await uploadChatMedia(uri, imagePath, 'image/jpeg');
      } catch (uploadErr) {
        console.warn('Image upload fallback:', uploadErr);
      }

      try {
        await sendMessageWithRetry(relationshipId, user.uid, '📷 Photo', {
          messageType: 'image',
          imageUrl: finalImageUrl,
          senderName: profile?.name || user.displayName || undefined,
        });
      } finally {
        setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (err: any) {
      setSendError(err?.message ?? 'Failed to send photo. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!user || !relationshipId || sending) return;
    try {
      const uri = await takeChatPhoto();
      if (!uri) return;

      const tempId = `temp-${Date.now()}`;
      const tempMsg: Message = {
        id: tempId,
        conversationId: relationshipId,
        senderId: user.uid,
        text: '📷 Photo',
        messageType: 'image',
        imageUrl: uri,
        status: 'sending' as any,
        createdAt: null as any,
      };
      setPendingMessages((prev) => [...prev, tempMsg]);

      setSending(true);
      setSendError(null);

      let finalImageUrl = uri;
      try {
        const imagePath = `chat/${relationshipId}/images/${Date.now()}.jpg`;
        finalImageUrl = await uploadChatMedia(uri, imagePath, 'image/jpeg');
      } catch (uploadErr) {
        console.warn('Photo upload fallback:', uploadErr);
      }

      try {
        await sendMessageWithRetry(relationshipId, user.uid, '📷 Photo', {
          messageType: 'image',
          imageUrl: finalImageUrl,
          senderName: profile?.name || user.displayName || undefined,
        });
      } finally {
        setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (err: any) {
      setSendError(err?.message ?? 'Failed to capture photo. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const requestVoicePermissions = async (): Promise<boolean> => {
    try {
      const expoAudio = require('expo-audio');
      if (typeof expoAudio.getRecordingPermissionsAsync === 'function') {
        const current = await expoAudio.getRecordingPermissionsAsync();
        if (current.granted || current.status === 'granted') return true;
      }
      if (typeof expoAudio.requestRecordingPermissionsAsync === 'function') {
        const req = await expoAudio.requestRecordingPermissionsAsync();
        if (req.granted || req.status === 'granted') return true;
      }
      Alert.alert(
        'Microphone Permission Required',
        'AlwaysWithYou needs permission to access your microphone to record and send voice messages. Please enable microphone permissions in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS !== 'web') {
                void Linking.openSettings();
              }
            },
          },
        ]
      );
      return false;
    } catch {
      return true;
    }
  };

  // WhatsApp-style Voice Recording handlers
  const handleStartRecording = async () => {
    if (!user || !relationshipId || sending) return;

    const support = checkVoiceNoteSupport();
    if (!support.hasNativeAudio) {
      Alert.alert(
        'Voice Recording Unavailable',
        `${support.reason ?? 'Voice recording requires audio capabilities on this device.'}\n\nText messages and photos are fully operational.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const hasPermission = await requestVoicePermissions();
    if (!hasPermission) return;

    try {
      await stopAudioPlayback();
      await startAudioRecording();
      setIsRecording(true);
      setRecordingDurationMs(0);

      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDurationMs(Date.now() - startTime);
      }, 200);
    } catch (err: any) {
      Alert.alert('Recording Failed', err?.message ?? 'Could not start audio recording.');
    }
  };

  const handleCancelRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    await cancelAudioRecording();
    setIsRecording(false);
    setRecordingDurationMs(0);
  };

  const handleSendVoiceRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (!user || !relationshipId) {
      await handleCancelRecording();
      return;
    }

    setSending(true);
    setIsRecording(false);

    try {
      const result = await stopAudioRecording();
      if (!result || !result.uri) {
        throw new Error('Recorded audio file is missing.');
      }

      const tempId = `temp-${Date.now()}`;
      const tempMsg: Message = {
        id: tempId,
        conversationId: relationshipId,
        senderId: user.uid,
        text: '🎤 Voice message',
        messageType: 'audio',
        audioUrl: result.uri,
        audioDurationMs: result.durationMs,
        status: 'sending' as any,
        createdAt: null as any,
      };
      setPendingMessages((prev) => [...prev, tempMsg]);

      let finalAudioUrl = result.uri;
      try {
        const audioPath = `chat/${relationshipId}/audio/${Date.now()}.m4a`;
        finalAudioUrl = await uploadChatMedia(result.uri, audioPath, 'audio/m4a');
      } catch (uploadErr) {
        console.warn('Audio upload fallback:', uploadErr);
      }

      try {
        await sendMessageWithRetry(relationshipId, user.uid, '🎤 Voice message', {
          messageType: 'audio',
          audioUrl: finalAudioUrl,
          audioDurationMs: result.durationMs,
          senderName: profile?.name || user.displayName || undefined,
        });
      } finally {
        setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (err: any) {
      setSendError(err?.message ?? 'Failed to send voice message.');
    } finally {
      setSending(false);
      setRecordingDurationMs(0);
    }
  };

  // Audio Playback
  const handleTogglePlayAudio = async (item: Message) => {
    if (!item.audioUrl) {
      Alert.alert('Audio Unavailable', 'No audio recording found for this message.');
      return;
    }

    // If currently playing this specific message, pause it
    if (playingMessageId === item.id) {
      await pauseAudioPlayback();
      setPlayingMessageId(null);
      return;
    }

    try {
      setPlayingMessageId(item.id);
      setPlaybackPositionMs(0);
      setPlaybackDurationMs(item.audioDurationMs || 0);

      await playAudioNote(item.audioUrl, (status) => {
        if (status.didFinish) {
          setPlayingMessageId(null);
          setPlaybackPositionMs(0);
        } else if (status.isPlaying) {
          setPlayingMessageId(item.id);
          setPlaybackPositionMs(status.positionMs);
          if (status.durationMs > 0) {
            setPlaybackDurationMs(status.durationMs);
          }
        }
      });
    } catch (err: any) {
      setPlayingMessageId(null);
      Alert.alert('Playback Failed', err?.message ?? 'Unable to play voice note.');
    }
  };

  const hasText = text.trim().length > 0;

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
            {receiverPhoto ? (
              <Image source={{ uri: receiverPhoto }} style={styles.avatarImg} />
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
            data={displayedMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              displayedMessages.length === 0 && styles.listContentEmpty,
            ]}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListHeaderComponent={renderListHeader}
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
              if (displayedMessages.length > 0) {
                // Only scroll to end if not loading older messages, and user was near bottom or on initial load
                if (!isLoadingOlderRef.current && (isNearBottomRef.current || !isInitialLoadedRef.current)) {
                  listRef.current?.scrollToEnd({ animated: isInitialLoadedRef.current });
                }
              }
            }}
            renderItem={({ item }) => {
              const mine = item.senderId === user?.uid;
              const isAudio = item.messageType === 'audio';
              const isImage = item.messageType === 'image';
              const isPlaying = playingMessageId === item.id;
              const isPending = item.status === ('sending' as any) || !item.createdAt;

              return (
                <View
                  style={[
                    styles.bubbleRow,
                    mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
                  ]}>
                  {!mine && (
                    <View style={styles.bubbleAvatar}>
                      {receiverPhoto ? (
                        <Image source={{ uri: receiverPhoto }} style={styles.bubbleAvatarImg} />
                      ) : (
                        <Text style={styles.bubbleAvatarText}>
                          {getInitials(recipientName)}
                        </Text>
                      )}
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleTheirs,
                      isImage && styles.bubbleImageContainer,
                    ]}>
                    {/* Image Message */}
                    {isImage && item.imageUrl ? (
                      <Pressable
                        onPress={() => setPreviewImageUri(item.imageUrl || null)}
                        accessibilityRole="button"
                        accessibilityLabel="View photo"
                        style={styles.imageWrapper}>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.chatImage}
                          resizeMode="cover"
                        />
                        <View style={styles.imageOverlayTime}>
                          {isPending ? (
                            <Ionicons
                              name="time-outline"
                              size={12}
                              color="#FFFFFF"
                              accessibilityLabel="Sending photo..."
                            />
                          ) : (
                            <>
                              <Text style={styles.imageTimeText}>
                                {formatMessageTime(item.createdAt)}
                              </Text>
                              {mine && (
                                <Ionicons
                                  name="checkmark-done"
                                  size={13}
                                  color="#FFFFFF"
                                  style={styles.statusCheck}
                                />
                              )}
                            </>
                          )}
                        </View>
                      </Pressable>
                    ) : isAudio ? (
                      /* Audio Voice Note Message (WhatsApp Style) */
                      <View style={styles.audioBubbleContainer}>
                        <Pressable
                          onPress={() => handleTogglePlayAudio(item)}
                          accessibilityRole="button"
                          accessibilityLabel={
                            isPlaying
                              ? 'Pause voice message'
                              : `Play voice message, duration ${formatAudioDuration(
                                  item.audioDurationMs
                                )}`
                          }
                          style={styles.audioPlayBtn}>
                          <Ionicons
                            name={isPlaying ? 'pause-circle' : 'play-circle'}
                            size={38}
                            color={mine ? Colors.dashboard.bg : Colors.dashboard.accent}
                          />
                        </Pressable>
                        <View style={styles.audioMeta}>
                          {/* Audio Waveform / Progress Bar */}
                          <View style={styles.audioProgressTrack}>
                            <View
                              style={[
                                styles.audioProgressFill,
                                {
                                  width:
                                    isPlaying && playbackDurationMs > 0
                                      ? `${Math.min(
                                          100,
                                          (playbackPositionMs / playbackDurationMs) * 100
                                        )}%`
                                      : '0%',
                                  backgroundColor: mine
                                    ? Colors.dashboard.bg
                                    : Colors.dashboard.accent,
                                },
                              ]}
                            />
                          </View>
                          <View style={styles.audioTimeRow}>
                            <Text
                              style={[
                                styles.audioDurationText,
                                mine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                              ]}>
                              {isPlaying
                                ? formatAudioDuration(playbackPositionMs)
                                : formatAudioDuration(item.audioDurationMs)}
                            </Text>
                            <Ionicons
                              name="mic"
                              size={12}
                              color={
                                mine
                                  ? 'rgba(7, 31, 25, 0.65)'
                                  : Colors.alpha.white55
                              }
                            />
                          </View>
                        </View>
                      </View>
                    ) : (
                      /* Text Message */
                      <Text
                        style={[
                          styles.bubbleText,
                          mine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                        ]}>
                        {item.text}
                      </Text>
                    )}

                    {!isImage && (
                      <View style={styles.bubbleFooterRow}>
                        {isPending ? (
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color={mine ? 'rgba(7, 31, 25, 0.70)' : Colors.alpha.white45}
                            accessibilityLabel="Sending..."
                          />
                        ) : (
                          <>
                            <Text
                              style={[
                                styles.bubbleTime,
                                mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs,
                              ]}>
                              {formatMessageTime(item.createdAt)}
                            </Text>
                            {mine && (
                              <Ionicons
                                name="checkmark-done"
                                size={12}
                                color={
                                  mine
                                    ? 'rgba(7, 31, 25, 0.70)'
                                    : Colors.alpha.white45
                                }
                                style={styles.statusCheck}
                              />
                            )}
                          </>
                        )}
                      </View>
                    )}
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

        {/* WhatsApp-Style Sticky Chat Input Bar */}
        {isRecording ? (
          /* Active Recording State Bar */
          <View style={styles.recordingBar}>
            <Pressable
              onPress={handleCancelRecording}
              accessibilityRole="button"
              accessibilityLabel="Discard recording"
              hitSlop={10}
              style={({ pressed }) => [
                styles.recordingDiscardBtn,
                { opacity: pressed ? 0.75 : 1 },
              ]}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </Pressable>

            <View style={styles.recordingCenter}>
              <View style={styles.recordingPulseDot} />
              <Text style={styles.recordingTimerText}>
                {formatAudioDuration(recordingDurationMs)}
              </Text>
              <Text style={styles.recordingLabel}>Recording voice message...</Text>
            </View>

            <Pressable
              onPress={handleSendVoiceRecording}
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel="Send voice message"
              style={({ pressed }) => [
                styles.sendBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}>
              {sending ? (
                <ActivityIndicator size="small" color={Colors.dashboard.bg} />
              ) : (
                <Ionicons name="send" size={18} color={Colors.dashboard.bg} />
              )}
            </Pressable>
          </View>
        ) : (
          /* Normal Message Input State */
          <View style={styles.inputBar}>
            {/* Image / Camera Button: Hidden when user is typing to expand input width */}
            {!hasText && (
              <Pressable
                onPress={handleImagePickerPress}
                disabled={sending || !relationshipId}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Attach photo"
                style={({ pressed }) => [
                  styles.attachBtn,
                  (!relationshipId || sending) && styles.btnDisabled,
                  { opacity: pressed ? 0.75 : 1 },
                ]}>
                <Ionicons name="camera-outline" size={23} color={Colors.dashboard.accent} />
              </Pressable>
            )}

            <TextInput
              value={text}
              onChangeText={(val) => {
                setText(val);
                if (sendError && !failedText) setSendError(null);
              }}
              placeholder={
                relationshipId
                  ? `Message ${recipientName}...`
                  : 'Select a conversation to chat'
              }
              placeholderTextColor={Colors.alpha.white28}
              style={styles.input}
              multiline
              maxLength={500}
              editable={Boolean(relationshipId)}
              accessibilityLabel="Message Input"
            />

            {/* Dynamic Action Button: Mic when empty, Send when has text (Instant switch without loading spinner) */}
            {hasText ? (
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
            ) : (
              <Pressable
                onPress={handleStartRecording}
                disabled={sending || !relationshipId}
                accessibilityRole="button"
                accessibilityLabel="Record voice message"
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!relationshipId || sending) && styles.sendBtnDisabled,
                  { opacity: pressed ? 0.85 : 1 },
                ]}>
                <Ionicons name="mic" size={20} color={Colors.dashboard.bg} />
              </Pressable>
            )}
          </View>
        )}

        {/* Full-Screen Image Preview Modal */}
        <Modal
          visible={Boolean(previewImageUri)}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImageUri(null)}>
          <View style={styles.modalBackdrop}>
            <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  Photo • {recipientName}
                </Text>
                <Pressable
                  onPress={() => setPreviewImageUri(null)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close photo viewer"
                  style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
              <View style={styles.modalImageWrapper}>
                {previewImageUri ? (
                  <Image
                    source={{ uri: previewImageUri }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                ) : null}
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatMessageTime(ts: any) {
  if (!ts) return '';
  const ms =
    typeof ts === 'object' && 'toMillis' in ts ? ts.toMillis() : new Date(ts).getTime();
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
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleImageContainer: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 4,
    overflow: 'hidden',
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
  bubbleFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  bubbleTime: {
    fontSize: 10,
    fontWeight: '700',
  },
  bubbleTimeMine: {
    color: 'rgba(7, 31, 25, 0.65)',
  },
  bubbleTimeTheirs: {
    color: Colors.alpha.white45,
  },
  statusCheck: {
    marginLeft: 1,
  },
  // Image Message styling
  imageWrapper: {
    width: 230,
    height: 230,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  chatImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayTime: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  imageTimeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  // Audio message styling
  audioBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 210,
    gap: 10,
    paddingVertical: 2,
  },
  audioPlayBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioMeta: {
    flex: 1,
    gap: 6,
  },
  audioProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    width: '100%',
  },
  audioProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  audioTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioDurationText: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorBannerWrap: {
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  // Input bar styling
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
  attachBtn: {
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
  btnDisabled: {
    opacity: 0.35,
  },
  // WhatsApp-style Recording Bar styling
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderTopWidth: 1,
    borderTopColor: Colors.alpha.white08,
    gap: 12,
  },
  recordingDiscardBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  recordingTimerText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
  },
  recordingLabel: {
    color: Colors.alpha.white70,
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal Preview
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  modalSafe: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  // Pagination & Load older messages styling
  loadingOlderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingOlderText: {
    color: Colors.dashboard.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  loadOlderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accentIconBg,
    borderWidth: 1,
    borderColor: Colors.dashboard.accentSoftBorder,
    alignSelf: 'center',
    marginBottom: 8,
  },
  loadOlderBtnText: {
    color: Colors.dashboard.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  startOfChatWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  startOfChatText: {
    color: Colors.alpha.white35,
    fontSize: 11,
    fontWeight: '700',
  },
});
