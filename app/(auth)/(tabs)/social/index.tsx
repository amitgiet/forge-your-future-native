import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, UserPlus, Users } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function SocialScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [chatsRes, friendsRes] = await Promise.allSettled([
        apiService.social.getChats(),
        apiService.social.getFriends(),
      ]);
      if (chatsRes.status === 'fulfilled' && chatsRes.value.data?.success) {
        setChats(chatsRes.value.data.data || []);
      }
      if (friendsRes.status === 'fulfilled' && friendsRes.value.data?.success) {
        setFriends(friendsRes.value.data.data || []);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
            Social
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
            {friends.length} friends
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(auth)/add-friend' as any)}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}
        >
          <UserPlus size={20} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12 }}>{[1, 2, 3].map((i) => <Skeleton key={i} height={72} borderRadius={12} />)}</View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={32} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No chats yet</Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Add friends to start chatting</Text>
              <Button onPress={() => router.push('/(auth)/add-friend' as any)}>Add Friends</Button>
            </View>
          )
        }
        renderItem={({ item }) => {
          const otherUser = item.participants?.find((p: any) => p._id !== user?._id);
          return (
            <Pressable onPress={() => router.push(`/(auth)/social/${item._id}` as any)}>
              <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
                <Avatar name={otherUser?.name || item.name} size={44} uri={otherUser?.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>
                    {item.isGroup ? item.name : otherUser?.name || 'Unknown'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>
                    {item.lastMessage?.text || 'No messages yet'}
                  </Text>
                </View>
                {item.unreadCount > 0 && (
                  <Badge variant="primary">
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{item.unreadCount}</Text>
                  </Badge>
                )}
              </GlassCard>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
