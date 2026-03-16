import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  ArrowLeft, Trophy, Medal, Flame, Zap, Crown,
  Target, TrendingUp,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { gradients, gradientProps } from '@/theme/gradients';

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  score: number;
  totalXP: number;
  streak: number;
  completedToday: boolean;
}

const Leaderboard = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tab, setTab] = useState<'daily' | 'weekly' | 'allTime'>('daily');
  const [loading, setLoading] = useState(true);
  const [userCompletedToday, setUserCompletedToday] = useState(false);

  useEffect(() => { fetchLeaderboard(); }, [tab]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      let response;
      if (tab === 'daily') response = await apiService.leaderboard.getDailyLeaderboard(10);
      else if (tab === 'weekly') response = await apiService.leaderboard.getWeeklyLeaderboard(10);
      else response = await apiService.leaderboard.getLeaderboard(10);

      if (response.data?.success) {
        const data = response.data.data || [];
        const mapped = data.map((entry: any) => ({
          rank: entry.rank,
          name: entry.name,
          avatar: entry.avatar || entry.name.charAt(0).toUpperCase(),
          score: entry.score || 0,
          totalXP: entry.totalXP || 0,
          streak: entry.streak || 0,
          completedToday: entry.completedToday || false,
        }));
        setLeaderboard(mapped);
        const userEntry = response.data.currentUserEntry || response.data.userRank;
        if (userEntry?.completedToday) setUserCompletedToday(true);
      }
    } catch (e) { console.error(e); setLeaderboard([]); }
    finally { setLoading(false); }
  };

  // Same rank icon logic as web
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={20} color="#EAB308" />;
    if (rank === 2) return <Medal size={20} color="#9CA3AF" />;
    if (rank === 3) return <Medal size={20} color="#D97706" />;
    return <Text style={{ fontSize: 13, fontWeight: '700', color: colors.mutedForeground }}>#{rank}</Text>;
  };

  // Same rank background colors as web
  const getRankBg = (rank: number) => {
    if (rank === 1) return ['#FEF9C3', '#FEF08A']; // yellow-100 to amber-100
    if (rank === 2) return ['#F3F4F6', '#F8FAFC']; // gray-100 to slate-100
    if (rank === 3) return ['#FEF3C7', '#FFEDD5']; // amber-100 to orange-100
    return [colors.card, colors.card];
  };

  const currentUserRank = userCompletedToday ? 1 : 0;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header — same as web */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.card,
            borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Trophy size={20} color={colors.warning} />
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
              Leaderboard
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
            Daily DPP Rankings
          </Text>
        </View>
      </View>

      {/* Tabs — same as web: 3 buttons flex-1 */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
        {(['daily', 'weekly', 'allTime'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={({ pressed }) => ({
              flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12,
              backgroundColor: tab === t ? colors.primary : colors.muted,
              opacity: pressed ? 0.85 : 1,
              alignItems: 'center',
            })}
          >
            <Text style={{
              fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold',
              color: tab === t ? '#fff' : colors.mutedForeground,
            }}>
              {t === 'daily' ? 'Today' : t === 'weekly' ? 'This Week' : 'All Time'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Top 3 Podium ── same order as web: 2nd / 1st / 3rd */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
        {/* 2nd Place */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 100 }}
          style={{ flex: 1, alignItems: 'center' }}
        >
          <View style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: '#9CA3AF',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 4, borderColor: '#fff', marginBottom: 8,
          }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>{leaderboard[1]?.avatar}</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>{leaderboard[1]?.name}</Text>
          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{leaderboard[1]?.totalXP?.toLocaleString()} XP</Text>
          <LinearGradient
            colors={['#D1D5DB', '#E2E8F0']}
            start={gradientProps.start}
            end={{ x: 0.5, y: 0 }}
            style={{ height: 64, width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12, marginTop: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#6B7280' }}>2</Text>
          </LinearGradient>
        </MotiView>

        {/* 1st Place — tallest */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={{ flex: 1, alignItems: 'center' }}
        >
          <View style={{ position: 'relative', alignItems: 'center' }}>
            <Crown size={24} color="#EAB308" style={{ marginBottom: 4 }} />
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: '#F59E0B',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 4, borderColor: '#fff', marginBottom: 8,
            }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>{leaderboard[0]?.avatar}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>{leaderboard[0]?.name}</Text>
          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{leaderboard[0]?.totalXP?.toLocaleString()} XP</Text>
          <LinearGradient
            colors={['#FCD34D', '#FDE68A']}
            start={gradientProps.start}
            end={{ x: 0.5, y: 0 }}
            style={{ height: 96, width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12, marginTop: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 30, fontWeight: '900', color: '#CA8A04' }}>1</Text>
          </LinearGradient>
        </MotiView>

        {/* 3rd Place */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 200 }}
          style={{ flex: 1, alignItems: 'center' }}
        >
          <View style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: '#D97706',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 4, borderColor: '#fff', marginBottom: 8,
          }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>{leaderboard[2]?.avatar}</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>{leaderboard[2]?.name}</Text>
          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{leaderboard[2]?.totalXP?.toLocaleString()} XP</Text>
          <LinearGradient
            colors={['#FCD34D', '#FDE68A']}
            start={gradientProps.start}
            end={{ x: 0.5, y: 0 }}
            style={{ height: 48, width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12, marginTop: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#D97706' }}>3</Text>
          </LinearGradient>
        </MotiView>
      </View>

      {/* Your Position Card — same conditional as web */}
      {currentUserRank > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: colors.primary + '14',
            borderRadius: 16, borderWidth: 1, borderColor: colors.primary + '40',
            padding: 16, marginBottom: 16,
          }}
        >
          <LinearGradient
            colors={[colors.secondary, colors.primary]}
            start={gradientProps.start}
            end={gradientProps.end}
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Y</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
              Your Position
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
              Keep going! You're doing great
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: colors.primary, fontFamily: 'Inter_700Bold' }}>
              #{currentUserRank || '—'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={12} color={colors.success} />
              <Text style={{ fontSize: 11, color: colors.success, fontFamily: 'Inter_400Regular' }}>+3 today</Text>
            </View>
          </View>
        </MotiView>
      )}

      {/* Full list (from rank 4 onwards) — same as web */}
      <View style={{ gap: 8 }}>
        {leaderboard.slice(3).map((entry, index) => (
          <MotiView
            key={entry.rank}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 300, delay: index * 100 }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: colors.card,
              borderRadius: 12, borderWidth: 2, borderColor: colors.border,
              padding: 12,
            }}
          >
            <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
              {getRankIcon(entry.rank)}
            </View>
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: colors.primary + '20',
              borderWidth: 2, borderColor: colors.border,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{entry.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>
                {entry.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Zap size={12} color={colors.warning} />
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{entry.totalXP.toLocaleString()} XP</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Flame size={12} color={colors.primary} />
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{entry.streak} days</Text>
                </View>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                {entry.score}%
              </Text>
              {entry.completedToday && (
                <Text style={{ fontSize: 11, color: colors.success, fontWeight: '500' }}>✓ Done</Text>
              )}
            </View>
          </MotiView>
        ))}
      </View>

      {/* CTA button — same conditional as web */}
      {!userCompletedToday && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={{ marginTop: 24 }}
        >
          <Pressable
            onPress={() => router.push('/(auth)/daily-challenge' as any)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <LinearGradient
              colors={[...gradients.primary]}
              start={gradientProps.start}
              end={gradientProps.end}
              style={{
                minHeight: 52, borderRadius: 12,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Target size={20} color="#fff" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>
                Take Today's DPP
              </Text>
            </LinearGradient>
          </Pressable>
        </MotiView>
      )}
    </ScrollView>
  );
};

export default Leaderboard;
