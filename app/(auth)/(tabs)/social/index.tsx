import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
  ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  Users, MessageCircle, Trophy, UserPlus,
  Check, X, Bell, ChevronRight, Crown, Medal, Award,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/lib/apiService';
import { gradients, gradientProps } from '@/theme/gradients';

// Same 4 tabs as web
const tabs = [
  { key: 'friends', label: 'Friends', Icon: Users },
  { key: 'requests', label: 'Requests', Icon: Bell },
  { key: 'chats', label: 'Chats', Icon: MessageCircle },
  { key: 'leaderboard', label: 'Rank', Icon: Trophy },
] as const;

type TabKey = typeof tabs[number]['key'];

export default function SocialScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => { loadData(); loadRequests(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'friends') await loadFriends();
      else if (activeTab === 'requests') await loadRequests();
      else if (activeTab === 'chats') await loadChats();
      else if (activeTab === 'leaderboard') await loadLeaderboard();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadFriends = async () => {
    try { const r = await apiService.social.getFriends(); setFriends(r.data.data || []); } catch (e) { console.error(e); }
  };
  const loadRequests = async () => {
    try { const r = await apiService.social.getFriendRequests(); setRequests(r.data.data || []); } catch (e) { console.error(e); }
  };
  const loadChats = async () => {
    try { const r = await apiService.social.getChats(); setChats(r.data.data || []); } catch (e) { console.error(e); }
  };
  const loadLeaderboard = async () => {
    try { const r = await apiService.social.getFriendsLeaderboard(); setLeaderboard(r.data.data || []); } catch (e) { console.error(e); }
  };

  const handleChatClick = (chatId: string) => router.push(`/(auth)/social/${chatId}` as any);

  const handleStartChat = async (friendId: string) => {
    try {
      const r = await apiService.social.createDirectChat(friendId);
      router.push(`/(auth)/social/${r.data.data._id}` as any);
    } catch (e) { console.error(e); }
  };

  const handleAcceptRequest = async (friendId: string) => {
    setAcceptingId(friendId);
    try {
      await apiService.social.acceptFriendRequest(friendId);
      setRequests(requests.filter(r => r.userId._id !== friendId));
      loadFriends();
    } catch (e) { console.error(e); }
    finally { setAcceptingId(null); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  // Same rank icon logic as web
  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={16} color={colors.warning} />;
    if (rank === 2) return <Medal size={16} color={colors.mutedForeground} />;
    if (rank === 3) return <Award size={16} color={colors.warning} />;
    return <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>#{rank}</Text>;
  };

  const emptyMessages: Record<TabKey, { text: string; action: string }> = {
    friends: { text: 'No friends yet', action: 'Add your first friend!' },
    requests: { text: 'No pending requests', action: 'All caught up 🎉' },
    chats: { text: 'No chats yet', action: 'Start chatting with friends!' },
    leaderboard: { text: 'No rankings yet', action: 'Add friends to compete!' },
  };

  const emptyIcons: Record<TabKey, React.ReactNode> = {
    friends: <Users size={32} color={colors.mutedForeground} />,
    requests: <Bell size={32} color={colors.mutedForeground} />,
    chats: <MessageCircle size={32} color={colors.mutedForeground} />,
    leaderboard: <Trophy size={32} color={colors.mutedForeground} />,
  };

  const currentList =
    activeTab === 'friends' ? friends :
    activeTab === 'requests' ? requests :
    activeTab === 'chats' ? chats : leaderboard;

  const isEmpty = !loading && currentList.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky Header — same as web: bg-card border-b */}
      <View style={{
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingTop: insets.top,
      }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 0 }}>
          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                👥 Social
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                Connect &amp; compete with friends
              </Text>
            </View>
            {/* Add friend button — gradient like web */}
            <Pressable
              onPress={() => router.push('/(auth)/add-friend' as any)}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <LinearGradient
                colors={[...gradients.primary]}
                start={gradientProps.start}
                end={gradientProps.end}
                style={{
                  height: 36, paddingHorizontal: 12, borderRadius: 12,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                }}
              >
                <UserPlus size={16} color="#fff" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Add</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Tab bar — same as web: bg-muted rounded-xl p-1 */}
          <View style={{
            flexDirection: 'row', gap: 4,
            backgroundColor: colors.muted,
            borderRadius: 12, padding: 4,
            marginBottom: 12,
          }}>
            {tabs.map(({ key, label, Icon }) => {
              const isActive = activeTab === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setActiveTab(key)}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 4, paddingVertical: 8, borderRadius: 10,
                    backgroundColor: isActive ? colors.card : 'transparent',
                  }}
                >
                  <Icon size={14} color={isActive ? colors.primary : colors.mutedForeground} />
                  <Text style={{
                    fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold',
                    color: isActive ? colors.primary : colors.mutedForeground,
                  }}>
                    {label}
                  </Text>
                  {/* Requests badge */}
                  {key === 'requests' && requests.length > 0 && (
                    <View style={{
                      position: 'absolute', top: -2, right: -2,
                      width: 16, height: 16, borderRadius: 8,
                      backgroundColor: colors.destructive,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{requests.length}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading */}
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 64, gap: 12 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 16,
              backgroundColor: colors.primary + '18',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>Loading...</Text>
          </View>
        ) : isEmpty ? (
          /* Empty state — same as web */
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 300 }}
            style={{ alignItems: 'center', paddingVertical: 64 }}
          >
            <View style={{
              width: 64, height: 64, borderRadius: 16,
              backgroundColor: colors.muted,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 12,
            }}>
              {emptyIcons[activeTab]}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
              {emptyMessages[activeTab].text}
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, fontFamily: 'Inter_400Regular' }}>
              {emptyMessages[activeTab].action}
            </Text>
            {activeTab === 'friends' && (
              <Pressable
                onPress={() => router.push('/(auth)/add-friend' as any)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginTop: 16 })}
              >
                <LinearGradient
                  colors={[...gradients.primary]}
                  start={gradientProps.start}
                  end={gradientProps.end}
                  style={{ height: 36, paddingHorizontal: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <UserPlus size={14} color="#fff" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Find Friends</Text>
                </LinearGradient>
              </Pressable>
            )}
          </MotiView>
        ) : (
          <>
            {/* ===== FRIENDS TAB ===== */}
            {activeTab === 'friends' && friends.map((friend, idx) => (
              <MotiView
                key={friend._id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 200, delay: idx * 30 }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: colors.card,
                  borderRadius: 12, borderWidth: 1, borderColor: colors.border,
                  padding: 12,
                }}
              >
                {friend.avatar ? (
                  <Image source={{ uri: friend.avatar }} style={{ width: 44, height: 44, borderRadius: 12 }} />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
                    {friend.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                    {friend.email}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleStartChat(friend._id)}
                  style={({ pressed }) => ({
                    height: 32, paddingHorizontal: 12, borderRadius: 10,
                    backgroundColor: colors.primary + '18',
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <MessageCircle size={14} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Chat</Text>
                </Pressable>
              </MotiView>
            ))}

            {/* ===== REQUESTS TAB ===== */}
            {activeTab === 'requests' && requests.map((request, idx) => (
              <MotiView
                key={request._id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 200, delay: idx * 30 }}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12, borderWidth: 2, borderColor: colors.primary + '30',
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  {request.userId?.avatar ? (
                    <Image source={{ uri: request.userId.avatar }} style={{ width: 44, height: 44, borderRadius: 12 }} />
                  ) : (
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
                      <UserPlus size={20} color={colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
                      {request.userId?.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.primary, fontFamily: 'Inter_400Regular' }}>Wants to be friends</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {/* Accept — gradient success */}
                  <Pressable
                    onPress={() => handleAcceptRequest(request.userId?._id)}
                    disabled={acceptingId === request.userId?._id}
                    style={({ pressed }) => ({ flex: 1, opacity: (acceptingId === request.userId?._id || pressed) ? 0.6 : 1 })}
                  >
                    <LinearGradient
                      colors={['#22c55e', '#16a34a']}
                      start={gradientProps.start}
                      end={gradientProps.end}
                      style={{ height: 36, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      {acceptingId === request.userId?._id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Check size={14} color="#fff" />
                      }
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Accept</Text>
                    </LinearGradient>
                  </Pressable>
                  {/* Decline */}
                  <Pressable
                    style={({ pressed }) => ({
                      flex: 1, height: 36, borderRadius: 12,
                      borderWidth: 1, borderColor: colors.border,
                      backgroundColor: colors.muted,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <X size={14} color={colors.mutedForeground} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>Decline</Text>
                  </Pressable>
                </View>
              </MotiView>
            ))}

            {/* ===== CHATS TAB ===== */}
            {activeTab === 'chats' && chats.map((chat, idx) => {
              const other = chat.type === 'direct'
                ? chat.participants?.find((p: any) => p._id !== user?._id)
                : null;
              return (
                <MotiView
                  key={chat._id}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 200, delay: idx * 30 }}
                >
                  <Pressable
                    onPress={() => handleChatClick(chat._id)}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      backgroundColor: colors.card,
                      borderRadius: 12, borderWidth: 1, borderColor: colors.border,
                      padding: 12,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    {chat.type === 'group' ? (
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.secondary + '18', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={20} color={colors.secondary} />
                      </View>
                    ) : other?.avatar ? (
                      <Image source={{ uri: other.avatar }} style={{ width: 44, height: 44, borderRadius: 12 }} />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.secondary + '18', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageCircle size={20} color={colors.secondary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
                        {chat.type === 'group' ? chat.name : other?.name}
                      </Text>
                      {chat.lastMessage && (
                        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                          {chat.lastMessage.sender?._id === user?._id ? 'You: ' : ''}{chat.lastMessage.text}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </Pressable>
                </MotiView>
              );
            })}

            {/* ===== LEADERBOARD TAB ===== */}
            {activeTab === 'leaderboard' && leaderboard.map((u, idx) => (
              <MotiView
                key={u.userId}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 200, delay: idx * 30 }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: u.isCurrentUser ? colors.primary + '0D' : colors.card,
                  borderRadius: 12,
                  borderWidth: u.isCurrentUser ? 1 : 1,
                  borderColor: u.isCurrentUser ? colors.primary + '60' : colors.border,
                  padding: 12,
                }}
              >
                {/* Rank icon */}
                <View style={{
                  width: 36, height: 36, borderRadius: 12,
                  backgroundColor:
                    u.rank === 1 ? colors.warning + '25' :
                    u.rank === 2 ? colors.muted :
                    u.rank === 3 ? colors.warning + '18' :
                    colors.muted + '80',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {rankIcon(u.rank)}
                </View>

                {u.avatar ? (
                  <Image source={{ uri: u.avatar }} style={{ width: 40, height: 40, borderRadius: 12 }} />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={16} color={colors.primary} />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
                    {u.name}
                    {u.isCurrentUser && (
                      <Text style={{ fontSize: 12, color: colors.primary }}> (You)</Text>
                    )}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary, fontFamily: 'Inter_500Medium' }}>
                      {u.xp} XP
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>•</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                      🔥 {u.streak}d streak
                    </Text>
                  </View>
                </View>

                {u.rank === 1 && <Trophy size={20} color={colors.warning} />}
              </MotiView>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
