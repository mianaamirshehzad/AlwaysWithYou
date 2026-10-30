import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';
import EmptyState from '@/src/components/EmptyState';
import ErrorBanner from '@/src/components/ErrorBanner';
import InviteParentModal from '@/src/components/ChildSettings/InviteParentModal';
import { useRelationships } from '@/src/context/RelationshipsContext';
import { subscribeToConversations, type Conversation } from '@/src/services/firestore/chat';
import { createInvitation } from '@/src/services/firestore/invitations';
import { getCurrentUser } from '@/src/services/auth';
import { formatConversationTime, getInitials } from '@/src/utils/date';
import type { ParentProfile } from '@/src/context/RelationshipsContext';

export default function ChildChatScreen() {
  const router = useRouter();
  const { parents, loading: relsLoading, error: relsError, refresh } = useRelationships();

  const [conversationsMap, setConversationsMap] = React.useState<Map<string, Conversation>>(new Map());
  const [inviteVisible, setInviteVisible] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState<string | null>(null);
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviting, setInviting] = React.useState(false);

  // Subscribe in real-time to conversations for all connected parents
  React.useEffect(() => {
    if (parents.length === 0) {
      setConversationsMap(new Map());
      return;
    }
    const relIds = parents.map((p) => p.relationship.id);
    const unsubscribe = subscribeToConversations(relIds, (map) => {
      setConversationsMap(map);
    });
    return unsubscribe;
  }, [parents]);

  const generateInvitation = async (childUid: string) => {
    setInviting(true);
    setInviteError(null);
    setInviteCode(null);
    try {
      const code = await createInvitation(childUid);
      setInviteCode(code);
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : 'Unable to generate an invitation code. Please try again.'
      );
    } finally {
      setInviting(false);
    }
  };

  const handleOpenInvite = () => {
    const current = getCurrentUser();
    if (current) {
      setInviteVisible(true);
      void generateInvitation(current.uid);
    }
  };

  const handleOpenConversation = (parent: ParentProfile) => {
    router.push({
      pathname: '/conversation',
      params: {
        relationshipId: parent.relationship.id,
        name: parent.profile?.name ?? 'Parent',
        recipientRole: 'parent',
        photoUrl: parent.profile?.photoUrl ?? '',
      },
    });
  };

  // Separate parents into previous chatters (conversations with messages)
  // and available contacts (no messages sent yet)
  const { previousChatters, availableParents } = React.useMemo(() => {
    const chatters: { parent: ParentProfile; conversation: Conversation }[] = [];
    const available: ParentProfile[] = [];

    for (const p of parents) {
      const conv = conversationsMap.get(p.relationship.id);
      if (conv && conv.lastMessage) {
        chatters.push({ parent: p, conversation: conv });
      } else {
        available.push(p);
      }
    }

    // Sort previous chatters by most recent message timestamp descending
    chatters.sort((a, b) => {
      const timeA = getTimestampMs(a.conversation.lastMessageAt);
      const timeB = getTimestampMs(b.conversation.lastMessageAt);
      return timeB - timeA;
    });

    return { previousChatters: chatters, availableParents: available };
  }, [parents, conversationsMap]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSub}>
            {parents.length === 0
              ? 'No connected contacts'
              : `${parents.length} connected parent${parents.length === 1 ? '' : 's'}`}
          </Text>
        </View>

        {parents.length > 0 && availableParents.length > 0 ? (
          <Pressable
            onPress={() => {
              if (availableParents.length > 0) {
                handleOpenConversation(availableParents[0]);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
            style={({ pressed }) => [styles.newChatBtn, { opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.dashboard.bg} />
            <Text style={styles.newChatBtnText}>Start Chat</Text>
          </Pressable>
        ) : null}
      </View>

      {relsError ? (
        <View style={styles.errorWrap}>
          <ErrorBanner message={relsError} onRetry={refresh} retryLabel="Retry" />
        </View>
      ) : null}

      {relsLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.dashboard.accent} />
        </View>
      ) : parents.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            compact
            iconName="chatbubbles-outline"
            title="No Parents Connected"
            description="Connect with a parent using an invite code to start chatting and coordinating care."
            actionLabel="Invite a Parent"
            onAction={handleOpenInvite}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Section: Previous Chatters (if any) */}
          {previousChatters.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Previous Chats</Text>
              <View style={styles.cardList}>
                {previousChatters.map(({ parent, conversation }) => {
                  const name = parent.profile?.name ?? 'Parent';
                  const photoUrl = parent.profile?.photoUrl;
                  const isAudio = conversation.lastMessage?.includes('Voice message');

                  return (
                    <Pressable
                      key={parent.relationship.id}
                      onPress={() => handleOpenConversation(parent)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open chat with ${name}`}
                      style={({ pressed }) => [
                        styles.chatterItem,
                        { opacity: pressed ? 0.8 : 1 },
                      ]}>
                      <View style={styles.avatarWrap}>
                        {photoUrl ? (
                          <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
                        ) : (
                          <Text style={styles.avatarText}>{getInitials(name)}</Text>
                        )}
                      </View>

                      <View style={styles.chatterInfo}>
                        <View style={styles.chatterTopRow}>
                          <Text style={styles.chatterName} numberOfLines={1}>
                            {name}
                          </Text>
                          <Text style={styles.chatterTime}>
                            {formatConversationTime(conversation.lastMessageAt)}
                          </Text>
                        </View>

                        <View style={styles.lastMessageRow}>
                          {isAudio ? (
                            <Ionicons
                              name="mic"
                              size={14}
                              color={Colors.dashboard.accent}
                              style={styles.micIcon}
                            />
                          ) : null}
                          <Text
                            style={[
                              styles.lastMessageText,
                              isAudio && styles.lastMessageAudio,
                            ]}
                            numberOfLines={1}>
                            {conversation.lastMessage ?? 'No messages yet'}
                          </Text>
                        </View>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={Colors.alpha.white35}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Section: Available to Start Chat */}
          {availableParents.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {previousChatters.length > 0 ? 'Start a New Chat' : 'Start Chatting'}
              </Text>

              {previousChatters.length === 0 ? (
                <View style={styles.introBanner}>
                  <Ionicons name="chatbubbles" size={28} color={Colors.dashboard.accent} />
                  <View style={styles.introTextWrap}>
                    <Text style={styles.introTitle}>No previous chats yet</Text>
                    <Text style={styles.introSub}>
                      Select a connected parent below to start a conversation:
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.cardList}>
                {availableParents.map((parent) => {
                  const name = parent.profile?.name ?? 'Parent';
                  const photoUrl = parent.profile?.photoUrl;

                  return (
                    <Pressable
                      key={parent.relationship.id}
                      onPress={() => handleOpenConversation(parent)}
                      accessibilityRole="button"
                      accessibilityLabel={`Start chat with ${name}`}
                      style={({ pressed }) => [
                        styles.startChatItem,
                        { opacity: pressed ? 0.85 : 1 },
                      ]}>
                      <View style={styles.avatarWrap}>
                        {photoUrl ? (
                          <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
                        ) : (
                          <Text style={styles.avatarText}>{getInitials(name)}</Text>
                        )}
                      </View>

                      <View style={styles.chatterInfo}>
                        <Text style={styles.chatterName} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={styles.startChatHint}>Connected • Tap to start chat</Text>
                      </View>

                      <View style={styles.startChatActionBadge}>
                        <Ionicons
                          name="chatbubble-ellipses"
                          size={16}
                          color={Colors.dashboard.bg}
                        />
                        <Text style={styles.startChatActionText}>Chat</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      <InviteParentModal
        visible={inviteVisible}
        code={inviteCode}
        generating={inviting}
        error={inviteError}
        onRetry={() => {
          const current = getCurrentUser();
          if (current) void generateInvitation(current.uid);
        }}
        onClose={() => setInviteVisible(false)}
      />
    </SafeAreaView>
  );
}

function getTimestampMs(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === 'object' && 'toMillis' in ts) return ts.toMillis();
  if (typeof ts === 'number') return ts;
  return new Date(ts).getTime() || 0;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dashboard.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.alpha.white08,
  },
  headerTitleWrap: {
    gap: 2,
  },
  headerTitle: {
    color: Colors.dashboard.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: Colors.alpha.white45,
    fontSize: 12,
    fontWeight: '700',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
  },
  newChatBtnText: {
    color: Colors.dashboard.bg,
    fontSize: 13,
    fontWeight: '900',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 22,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: Colors.alpha.white55,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  introBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.dashboard.accentSoftBg,
    borderWidth: 1,
    borderColor: Colors.dashboard.accentSoftBorder,
    borderRadius: 18,
    padding: 16,
    marginBottom: 4,
  },
  introTextWrap: {
    flex: 1,
    gap: 3,
  },
  introTitle: {
    color: Colors.dashboard.text,
    fontSize: 15,
    fontWeight: '800',
  },
  introSub: {
    color: Colors.alpha.white70,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  cardList: {
    backgroundColor: Colors.dashboard.surface,
    borderWidth: 1,
    borderColor: Colors.dashboard.border,
    borderRadius: 22,
    overflow: 'hidden',
  },
  chatterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.alpha.white06,
  },
  startChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.alpha.white06,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 16,
    fontWeight: '900',
  },
  chatterInfo: {
    flex: 1,
    gap: 4,
  },
  chatterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chatterName: {
    color: Colors.dashboard.text,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  chatterTime: {
    color: Colors.alpha.white45,
    fontSize: 11,
    fontWeight: '700',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  micIcon: {
    marginRight: 2,
  },
  lastMessageText: {
    color: Colors.alpha.white70,
    fontSize: 13,
    fontWeight: '500',
  },
  lastMessageAudio: {
    color: Colors.dashboard.accent,
    fontWeight: '700',
  },
  startChatHint: {
    color: Colors.dashboard.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  startChatActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
  },
  startChatActionText: {
    color: Colors.dashboard.bg,
    fontSize: 12,
    fontWeight: '900',
  },
});
