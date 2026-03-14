import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, ChevronRight, Clock, Users } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

export default function TestSeriesDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { seriesKey } = useLocalSearchParams<{ seriesKey: string }>();

  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTests = async () => {
    try {
      const res = await apiService.testSeries.getTestsBySeriesType(seriesKey);
      if (res.data?.success) {
        setTests(res.data.data?.tests || res.data.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTests(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTests();
    setRefreshing(false);
  };

  const handleTestPress = (test: any) => {
    if (test.testType || test.typeKey) {
      router.push({
        pathname: '/(auth)/tests/[seriesKey]/[typeKey]',
        params: { seriesKey, typeKey: test.testType || test.typeKey },
      } as any);
    } else {
      router.push({
        pathname: '/(auth)/test/session/[attemptId]',
        params: { attemptId: test._id },
      } as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>
            {seriesKey?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Test Series'}
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
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={90} borderRadius={12} />)}
          </View>
        ) : tests.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <FileText size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No tests available</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Check back later for new tests.</Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 12 }}>
            {tests.map((test: any, i: number) => (
              <Pressable key={test._id || i} onPress={() => handleTestPress(test)}>
                <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.warning + '15' }}>
                    <FileText size={20} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                      {test.title || test.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      {test.duration && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} color={colors.mutedForeground} />
                          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{test.duration} min</Text>
                        </View>
                      )}
                      {test.totalQuestions && <Badge variant="outline">{test.totalQuestions} Qs</Badge>}
                      {test.isFree && <Badge variant="success">Free</Badge>}
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.mutedForeground} />
                </GlassCard>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
