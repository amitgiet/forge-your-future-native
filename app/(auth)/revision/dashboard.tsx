import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, TrendingUp, Target, Brain, Calendar, Flame } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import BottomNav from '@/components/BottomNav';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Progress } from '@/components/ui/Progress';
import { StatIcon } from '@/components/ui/StatIcon';

export default function RevisionDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [stats, setStats] = useState<any>(null);
  const [mastery, setMastery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, masteryRes] = await Promise.allSettled([
        apiService.neuronz.getUserStats(),
        apiService.neuronz.getMasteryProgress(),
      ]);
      if (statsRes.status === 'fulfilled' && statsRes.value.data?.success) {
        setStats(statsRes.value.data.data);
      }
      if (masteryRes.status === 'fulfilled' && masteryRes.value.data?.success) {
        setMastery(masteryRes.value.data.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
            Revision Dashboard
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={100} borderRadius={12} />)}
          </View>
        ) : (
          <>
            {/* Key Stats */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              {[
                { icon: Brain, value: String(stats?.totalTracked || 0), label: 'Tracked', color: colors.primary },
                { icon: Target, value: String(stats?.mastered || 0), label: 'Mastered', color: colors.success },
                { icon: Flame, value: String(stats?.reviewStreak || 0), label: 'Streak', color: colors.warning },
              ].map((stat, i) => (
                <GlassCard key={i} small style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14 }}>
                  <StatIcon color={stat.color}>
                    <stat.icon size={16} color={stat.color} />
                  </StatIcon>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground, fontFamily: 'Inter_800ExtraBold' }}>
                    {stat.value}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {stat.label}
                  </Text>
                </GlassCard>
              ))}
            </View>

            {/* Overall Mastery */}
            <GlassCard style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TrendingUp size={16} color={colors.primary} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Overall Mastery
                </Text>
              </View>
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Progress</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                    {stats?.totalTracked > 0 ? Math.round(((stats?.mastered || 0) / stats.totalTracked) * 100) : 0}%
                  </Text>
                </View>
                <Progress
                  value={stats?.totalTracked > 0 ? ((stats?.mastered || 0) / stats.totalTracked) * 100 : 0}
                  color={colors.success}
                />
              </View>
            </GlassCard>

            {/* Level Distribution */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Level Distribution
            </Text>
            <GlassCard style={{ marginBottom: 16 }}>
              {mastery?.levels ? (
                Object.entries(mastery.levels).map(([level, count]: [string, any]) => (
                  <View key={level} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Badge variant={Number(level) >= 6 ? 'success' : Number(level) >= 4 ? 'primary' : 'warning'}>
                        L{level}
                      </Badge>
                      <Text style={{ fontSize: 14, color: colors.foreground }}>{count} concepts</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', paddingVertical: 16 }}>
                  No data available yet. Start tracking chapters to see your progress.
                </Text>
              )}
            </GlassCard>

            {/* Recent Activity */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Review Summary
            </Text>
            <GlassCard>
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Total reviews</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>{stats?.totalReviews || 0}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Correct rate</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.success }}>{stats?.correctRate || 0}%</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Avg. time per review</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>{stats?.avgTime || 0}s</Text>
                </View>
              </View>
            </GlassCard>
          </>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}
