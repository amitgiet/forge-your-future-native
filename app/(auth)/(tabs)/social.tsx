import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { Users, MessageCircle, Trophy, UserPlus, Bell, ChevronRight, Crown, Medal, Award, Check, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/lib/apiService';
import { useSocket } from '@/hooks/useSocket';
import { gradients, gradientProps } from '@/theme/gradients';
import { LinearGradient } from 'expo-linear-gradient';

const tabs = [
  { key: 'friends', label: 'Friends', icon: Users },
  { key: 'requests', label: 'Requests', icon: Bell },
  { key: 'chats', label: 'Chats', icon: MessageCircle },
  { key: 'leaderboard', label: 'Rank', icon: Trophy },
] as const;

type TabKey = typeof tabs[number]['key'];

const Social = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // NOTE: Assuming useSocket handles mobile socket correctly
  const { onFriendsListUpdated, onFriendRequestReceived } = useSocket(user?._id || '');

  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => { loadData(); loadRequests(); }, [activeTab]);

  useEffect(() => {
    const unsubscribe = onFriendsListUpdated(() => { if (activeTab === 'friends') loadFriends(); });
    return unsubscribe;
  }, [activeTab]);

  useEffect(() => {
    const unsubscribe = onFriendRequestReceived(() => { loadRequests(); });
    return unsubscribe;
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'friends') await loadFriends();
      else if (activeTab === 'requests') await loadRequests();
      else if (activeTab === 'chats') await loadChats();
      else if (activeTab === 'leaderboard') await loadLeaderboard();
    } catch (error) { console.error('Error loading data:', error); }
    finally { setLoading(false); }
  };

  const loadFriends = async () => { try { const r = await apiService.social.getFriends(); setFriends(r.data?.data || []); } catch (e) { } };
  const loadRequests = async () => { try { const r = await apiService.social.getFriendRequests(); setRequests(r.data?.data || []); } catch (e) { } };
  const loadChats = async () => { try { const r = await apiService.social.getChats(); setChats(r.data?.data || []); } catch (e) { } };
  const loadLeaderboard = async () => { try { const r = await apiService.social.getFriendsLeaderboard(); setLeaderboard(r.data?.data || []); } catch (e) { } };

  const handleChatClick = (chatId: string) => router.push(`/(auth)/chat/${chatId}`);
  const handleStartChat = async (friendId: string) => {
    try { const r = await apiService.social.createDirectChat(friendId); router.push(`/(auth)/chat/${r.data?.data?._id}`); } catch (e) { console.error(e); }
  };

  const handleAcceptRequest = async (friendId: string) => {
    setAcceptingId(friendId);
    try {
      await apiService.social.acceptFriendRequest(friendId);
      setRequests(requests.filter(req => req.userId?._id !== friendId));
      loadFriends();
    } catch (e) { console.error(e); }
    finally { setAcceptingId(null); }
  };

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={16} color={colors.warning} />;
    if (rank === 2) return <Medal size={16} color={colors.mutedForeground} />;
    if (rank === 3) return <Award size={16} color={colors.warning} />;
    return <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>#{rank}</Text>;
  };

  const emptyMessages = {
    friends: { icon: Users, text: 'No friends yet', action: 'Add your first friend!' },
    requests: { icon: Bell, text: 'No pending requests', action: 'All caught up 🎉' },
    chats: { icon: MessageCircle, text: 'No chats yet', action: 'Start chatting with friends!' },
    leaderboard: { icon: Trophy, text: 'No rankings yet', action: 'Add friends to compete!' },
  };

  const isEmpty = (activeTab === 'friends' && friends.length === 0) ||
    (activeTab === 'requests' && requests.length === 0) ||
    (activeTab === 'chats' && chats.length === 0) ||
    (activeTab === 'leaderboard' && leaderboard.length === 0);

  const EmptyIcon = emptyMessages[activeTab].icon;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.foreground, fontFamily: 'Inter_900Black' }}>👥 Social</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>Connect & compete with friends</Text>
          </View>
          <Pressable onPress={() => router.push('/(auth)/add-friend')} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <LinearGradient colors={[...gradients.primary]} start={gradientProps.start} end={gradientProps.end} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 12 }}>
              <UserPlus size={16} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Add</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: colors.muted, borderRadius: 12, padding: 4 }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, backgroundColor: isActive ? colors.card : 'transparent' }}
              >
                <Icon size={14} color={isActive ? colors.primary : colors.mutedForeground} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? colors.primary : colors.mutedForeground }} numberOfLines={1}>{tab.label}</Text>
                {tab.key === 'requests' && requests.length > 0 && (
                  <View style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.destructive, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{requests.length}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Loading...</Text>
          </View>
        ) : isEmpty ? (
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
            <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <EmptyIcon size={32} color={colors.mutedForeground} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{emptyMessages[activeTab].text}</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>{emptyMessages[activeTab].action}</Text>
            {activeTab === 'friends' && (
              <Pressable onPress={() => router.push('/(auth)/add-friend')} style={{ marginTop: 16 }}>
                <LinearGradient colors={[...gradients.primary]} start={gradientProps.start} end={gradientProps.end} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, height: 36, borderRadius: 12 }}>
                  <UserPlus size={14} color="#fff" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Find Friends</Text>
                </LinearGradient>
              </Pressable>
            )}
          </MotiView>
        ) : (
          <View style={{ gap: 10 }}>
            <AnimatePresence>
              {/* ===== FRIENDS ===== */}
              {activeTab === 'friends' && friends.map((friend: any, index: number) => (
                <MotiView key={friend._id} from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: index * 50 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                  {friend.avatar ? (
                    <Image source={{ uri: friend.avatar }} style={{ width: 44, height: 44, borderRadius: 12 }} />
                  ) : (
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={20} color={colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{friend.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>{friend.email}</Text>
                  </View>
                  <Pressable onPress={() => handleStartChat(friend._id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.primary + '1A' }}>
                    <MessageCircle size={14} color={colors.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Chat</Text>
                  </Pressable>
                </MotiView>
              ))}

              {/* ===== REQUESTS ===== */}
              {activeTab === 'requests' && requests.map((request: any, index: number) => (
                <MotiView key={request._id} from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: index * 50 }} style={{ padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary + '33' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    {request.userId?.avatar ? (
                      <Image source={{ uri: request.userId.avatar }} style={{ width: 44, height: 44, borderRadius: 12 }} />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
                        <UserPlus size={20} color={colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{request.userId?.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.primary }}>Wants to be friends</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable disabled={acceptingId === request.userId?._id} onPress={() => handleAcceptRequest(request.userId?._id)} style={{ flex: 1 }}>
                      <LinearGradient colors={[...gradients.success]} start={gradientProps.start} end={gradientProps.end} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: 12, opacity: acceptingId === request.userId?._id ? 0.5 : 1 }}>
                        <Check size={14} color="#fff" />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Accept</Text>
                      </LinearGradient>
                    </Pressable>
                    <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: 12, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border }}>
                      <X size={14} color={colors.mutedForeground} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground }}>Decline</Text>
                    </Pressable>
                  </View>
                </MotiView>
              ))}

              {/* ===== CHATS ===== */}
              {activeTab === 'chats' && chats.map((chat: any, index: number) => {
                const other = chat.type === 'direct' ? chat.participants?.find((p: any) => p._id !== user?._id) : null;
                return (
                  <MotiView key={chat._id} from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: index * 50 }}>
                    <Pressable onPress={() => handleChatClick(chat._id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                      {chat.type === 'group' ? (
                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.secondary + '1A', alignItems: 'center', justifyContent: 'center' }}>
                          <Users size={20} color={colors.secondary} />
                        </View>
                      ) : other?.avatar ? (
                        <Image source={{ uri: other.avatar }} style={{ width: 44, height: 44, borderRadius: 12 }} />
                      ) : (
                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.secondary + '1A', alignItems: 'center', justifyContent: 'center' }}>
                          <MessageCircle size={20} color={colors.secondary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{chat.type === 'group' ? chat.name : other?.name}</Text>
                        {chat.lastMessage && (
                          <Text style={{ fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>
                            {chat.lastMessage.sender?._id === user?._id ? 'You: ' : ''}{chat.lastMessage.text}
                          </Text>
                        )}
                      </View>
                      <ChevronRight size={16} color={colors.mutedForeground} />
                    </Pressable>
                  </MotiView>
                );
              })}

              {/* ===== LEADERBOARD ===== */}
              {activeTab === 'leaderboard' && leaderboard.map((u: any, index: number) => (
                <MotiView key={u.userId} from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: index * 50 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: u.isCurrentUser ? colors.primary + '0D' : colors.card, borderWidth: 1, borderColor: u.isCurrentUser ? colors.primary + '66' : colors.border }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: u.rank === 1 ? colors.warning + '26' : u.rank === 2 ? colors.muted : u.rank === 3 ? colors.warning + '1A' : colors.muted + '80', alignItems: 'center', justifyContent: 'center' }}>
                    {rankIcon(u.rank)}
                  </View>
                  {u.avatar ? (
                    <Image source={{ uri: u.avatar }} style={{ width: 40, height: 40, borderRadius: 12 }} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={16} color={colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>
                      {u.name} {u.isCurrentUser && <Text style={{ fontSize: 12, color: colors.primary }}>(You)</Text>}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{u.xp} XP</Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>•</Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>🔥 {u.streak}d streak</Text>
                    </View>
                  </View>
                  {u.rank === 1 && <Trophy size={20} color={colors.warning} />}
                </MotiView>
              ))}
            </AnimatePresence>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default Social;
