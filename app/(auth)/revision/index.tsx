import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Brain, BarChart3, BookOpen, ChevronRight, Layers } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Progress } from '@/components/ui/Progress';

const LEVELS = [
  { level: 1, label: 'New', color: '#6a7080' },
  { level: 2, label: '24h Review', color: '#df2020' },
  { level: 3, label: '3-Day', color: '#f5a623' },
  { level: 4, label: 'Weekly', color: '#1a8dff' },
  { level: 5, label: 'Bi-Weekly', color: '#4a42d1' },
  { level: 6, label: 'Monthly', color: '#1fad64' },
  { level: 7, label: 'Mastered', color: '#1fad64' },
];

export default function RevisionIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [dueData, setDueData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [dueRes, statsRes] = await Promise.allSettled([
        apiService.neuronz.getDueLines(),
        apiService.neuronz.getUserStats(),
      ]);
      if (dueRes.status === 'fulfilled' && dueRes.value.data?.success) {
        setDueData(dueRes.value.data.data);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data?.success) {
        setStats(statsRes.value.data.data);
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

  const totalDue = dueData?.total || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Spaced Revision
          </Text>
          <Pressable onPress={() => router.push('/(auth)/revision/dashboard' as any)} style={{ padding: 8 }}>
            <BarChart3 size={22} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={120} borderRadius={12} />
            <Skeleton height={80} borderRadius={12} />
            <Skeleton height={80} borderRadius={12} />
          </View>
        ) : (
          <>
            {/* Summary */}
            <GlassCard style={{ marginBottom: 16, alignItems: 'center', gap: 8, paddingVertical: 24 }}>
              <View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.primary + '15' }}>
                <Brain size={28} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.foreground, fontFamily: 'Inter_800ExtraBold' }}>
                {totalDue}
              </Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground }}>concepts due for review</Text>
              {totalDue > 0 && (
                <Button size="sm" onPress={() => router.push('/(auth)/revision/track' as any)} style={{ marginTop: 8 }}>
                  Start Review Session
                </Button>
              )}
            </GlassCard>

            {/* Quick Links */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <Pressable onPress={() => router.push('/(auth)/revision/dashboard' as any)} style={{ flex: 1 }}>
                <GlassCard small style={{ alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={20} color={colors.secondary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Dashboard</Text>
                </GlassCard>
              </Pressable>
              <Pressable onPress={() => router.push('/(auth)/revision/track' as any)} style={{ flex: 1 }}>
                <GlassCard small style={{ alignItems: 'center', gap: 6 }}>
                  <BookOpen size={20} color={colors.success} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Track Chapters</Text>
                </GlassCard>
              </Pressable>
            </View>

            {/* Level Breakdown */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>
              By Level
            </Text>
            <View style={{ gap: 10 }}>
              {LEVELS.map((lvl) => {
                const count = dueData?.byLevel?.[`L${lvl.level}`]?.length || 0;
                return (
                  <Pressable
                    key={lvl.level}
                    onPress={() => {
                      if (count > 0) {
                        router.push({
                          pathname: '/(auth)/revision/track',
                          params: { level: String(lvl.level) },
                        } as any);
                      }
                    }}
                    disabled={count === 0}
                    style={{ opacity: count === 0 ? 0.5 : 1 }}
                  >
                    <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: lvl.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: lvl.color }}>L{lvl.level}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>{lvl.label}</Text>
                        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{count} due</Text>
                      </View>
                      {count > 0 && <Badge variant="warning">{count}</Badge>}
                      <ChevronRight size={18} color={colors.mutedForeground} />
                    </GlassCard>
                  </Pressable>
                );
              })}
            </View>

            {/* Mastery Progress */}
            {stats && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Mastery Progress
                </Text>
                <GlassCard>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Total tracked</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>{stats.totalTracked || 0}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Mastered (L7)</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.success }}>{stats.mastered || 0}</Text>
                  </View>
                  <Progress value={stats.totalTracked > 0 ? ((stats.mastered || 0) / stats.totalTracked) * 100 : 0} color={colors.success} style={{ marginTop: 4 }} />
                </GlassCard>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
