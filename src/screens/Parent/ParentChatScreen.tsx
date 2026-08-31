import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import {
  ActivityIndicator,
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
import { useAuth } from '@/src/context/AuthContext';
import { useRelationships } from '@/src/context/RelationshipsContext';
import { subscribeToMessages, sendMessage } from '@/src/services/firestore/chat';
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
    const unsubscribe = subscribeToMessages(relationshipId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
    return unsubscribe;
  }, [relationshipId]);

  const childProfile = selectedChildId ? childProfiles.get(selectedChildId) ?? null : null;
  const childName = childProfile?.name ?? 'Child';

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || !relationshipId || sending) return;
    setText('');
    setSending(true);
    try {
      await sendMessage(relationshipId, user.uid, trimmed);
    } catch {
      setText(trimmed);
    } finally {
      setSending(false);
    }
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
        keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(childName)}</Text>
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerName}>{childName}</Text>
            <Text style={styles.headerSub}>{relationshipId ? 'Connected' : 'No child linked'}</Text>
          </View>
        </View>

        {renderChildSelector()}

        {relsLoading || loading ? (
          <ActivityIndicator size="large" color={Colors.dashboard.accent} style={{ marginTop: 60 }} />
        ) : !relationshipId ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={44} color={Colors.alpha.white28} />
            <Text style={styles.emptyTitle}>No children linked</Text>
            <Text style={styles.emptyText}>Connect with a child to start chatting.</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubble-ellipses-outline" size={44} color={Colors.alpha.white28} />
            <Text style={styles.emptyTitle}>Say hello!</Text>
            <Text style={styles.emptyText}>Send your first message to {childName}.</Text>
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
              return (
                <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  {!mine && (
                    <View style={styles.bubbleAvatar}>
                      <Text style={styles.bubbleAvatarText}>{getInitials(childName)}</Text>
                    </View>
                  )}
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                      {item.text}
                    </Text>
                    <Text style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
                      {formatMessageTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Message ${childName}...`}
            placeholderTextColor={Colors.alpha.white28}
            style={styles.input}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => [
              styles.sendBtn,
              !text.trim() && styles.sendBtnDisabled,
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.dashboard.border,
  },
  selectorContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
  },
  selectorChipActive: {
    backgroundColor: Colors.dashboard.accentSoftBg,
    borderColor: Colors.dashboard.accentSoftBorder,
  },
  selectorAvatar: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorAvatarActive: { backgroundColor: Colors.dashboard.accentIconBg, borderColor: Colors.dashboard.accentSoftBorder },
  selectorAvatarText: { color: Colors.alpha.white55, fontWeight: '900', fontSize: 10 },
  selectorAvatarTextActive: { color: Colors.dashboard.accent },
  selectorName: { color: Colors.alpha.white45, fontSize: 12, fontWeight: '800', maxWidth: 100 },
  selectorNameActive: { color: Colors.dashboard.text },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  emptyTitle: { color: Colors.dashboard.text, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: Colors.alpha.white45, fontSize: 13, textAlign: 'center', fontWeight: '700' },
  listContent: { padding: 18, gap: 8, flexGrow: 1 },
  bubbleRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-end' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accentIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bubbleAvatarText: { color: Colors.dashboard.accent, fontWeight: '900', fontSize: 10 },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dashboard.border,
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
