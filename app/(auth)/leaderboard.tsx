import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trophy, Medal, Crown } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';

const TABS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'allTime', label: 'All Time' },
];

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState('daily');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const fetcher = activeTab === 'daily'
        ? apiService.leaderboard.getDailyLeaderboard
        : activeTab === 'weekly'
        ? apiService.leaderboard.getWeeklyLeaderboard
        : apiService.leaderboard.getLeaderboard;

      const [lbRes, rankRes] = await Promise.allSettled([
        fetcher(20),
        apiService.leaderboard.getUserRank(),
      ]);
      if (lbRes.status === 'fulfilled' && lbRes.value.data?.success) {
        setLeaderboard(lbRes.value.data.data || []);
      }
      if (rankRes.status === 'fulfilled' && rankRes.value.data?.success) {
        setUserRank(rankRes.value.data.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Leaderboard
          </Text>
        </View>
        <Tabs tabs={TABS} activeKey={activeTab} onTabChange={setActiveTab} style={{ marginBottom: 12 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Your Rank */}
        {userRank && (
          <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, borderWidth: 2, borderColor: colors.primary }}>
            <View style={{
              width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>#{userRank.rank || '—'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Your Rank</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{userRank.totalXP || 0} XP</Text>
            </View>
            <Badge variant="primary">You</Badge>
          </GlassCard>
        )}

        {loading ? (
          <View style={{ gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} height={60} borderRadius={12} />)}
          </View>
        ) : leaderboard.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <Trophy size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No data yet</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Complete challenges to appear on the leaderboard!</Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 8 }}>
            {leaderboard.map((user: any, i: number) => (
              <GlassCard key={user._id || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                {/* Rank */}
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: i < 3 ? (RANK_COLORS[i] + '20') : colors.muted,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {i === 0 ? (
                    <Crown size={18} color={RANK_COLORS[0]} />
                  ) : i < 3 ? (
                    <Medal size={18} color={RANK_COLORS[i]} />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
                      {i + 1}
                    </Text>
                  )}
                </View>

                {/* Avatar & Name */}
                <Avatar size={36} name={user.name || 'User'} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                    {user.name || 'Anonymous'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                    {user.totalXP || user.xp || user.score || 0} XP
                  </Text>
                </View>

                {i < 3 && (
                  <Badge variant={i === 0 ? 'warning' : i === 1 ? 'outline' : 'secondary'}>
                    #{i + 1}
                  </Badge>
                )}
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
