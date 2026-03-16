import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Swords, ChevronRight, Plus, Trash2, Calendar, Clock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Progress } from '@/components/ui/Progress';
import BottomNav from '@/components/BottomNav';

export default function MyChallengesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChallenges = async () => {
    try {
      const res = await apiService.challenges.getUserChallenges();
      if (res.data?.success) {
        setChallenges(res.data.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChallenges(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChallenges();
    setRefreshing(false);
  };

  const handleDelete = (challengeId: string) => {
    Alert.alert('Delete Challenge?', 'This cannot be undone.', [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiService.challenges.deleteChallenge(challengeId);
            setChallenges((prev) => prev.filter((c) => c._id !== challengeId));
          } catch {}
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            My Challenges
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} height={120} borderRadius={12} />)}
          </View>
        ) : challenges.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <Swords size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No active challenges</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
              Create a study challenge to stay consistent with your learning goals.
            </Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 12 }}>
            {challenges.map((challenge: any) => {
              const progress = challenge.progress || 0;
              const completedDays = challenge.completedDays || 0;
              const totalDays = challenge.duration || 7;
              const dayPct = Math.round((completedDays / totalDays) * 100);

              return (
                <GlassCard key={challenge._id} style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.warning + '15' }}>
                      <Swords size={20} color={colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                        {challenge.title}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        {challenge.subject && <Badge variant="primary">{challenge.subject}</Badge>}
                        {challenge.topic && <Badge variant="outline">{challenge.topic}</Badge>}
                      </View>
                    </View>
                    <Pressable onPress={() => handleDelete(challenge._id)} style={{ padding: 8 }}>
                      <Trash2 size={18} color={colors.destructive} />
                    </Pressable>
                  </View>

                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Day {completedDays}/{totalDays}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{dayPct}%</Text>
                    </View>
                    <Progress value={dayPct} height={6} />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} color={colors.mutedForeground} />
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{totalDays} days</Text>
                    </View>
                    {challenge.score !== undefined && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Score: {challenge.score}</Text>
                      </View>
                    )}
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}
