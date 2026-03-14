import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Play, ChevronRight, Clock, Lock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function TestTypeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { seriesKey, typeKey } = useLocalSearchParams<{ seriesKey: string; typeKey: string }>();

  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTests = async () => {
    try {
      const res = await apiService.testSeries.getTestsBySeriesType(seriesKey, { testType: typeKey });
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

  const handleStartTest = async (testId: string) => {
    setStarting(testId);
    try {
      const res = await apiService.tests.startTest(testId);
      if (res.data?.success) {
        router.push({
          pathname: '/(auth)/test/session/[attemptId]',
          params: { attemptId: res.data.data?._id || res.data.data?.attemptId },
        } as any);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to start test');
    } finally {
      setStarting(null);
    }
  };

  const displayName = typeKey?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>
            {displayName || 'Tests'}
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
            {[1, 2, 3].map((i) => <Skeleton key={i} height={100} borderRadius={12} />)}
          </View>
        ) : tests.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <FileText size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No tests found</Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 12 }}>
            {tests.map((test: any, i: number) => (
              <GlassCard key={test._id || i} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.primary + '15' }}>
                    <FileText size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                      {test.title || test.name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      {test.duration && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} color={colors.mutedForeground} />
                          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{test.duration} min</Text>
                        </View>
                      )}
                      {test.totalQuestions && <Badge variant="outline">{test.totalQuestions} Qs</Badge>}
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {test.isFree !== false ? (
                    <Button size="sm" onPress={() => handleStartTest(test._id)} loading={starting === test._id} disabled={!!starting} style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Play size={14} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Start Test</Text>
                      </View>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Lock size={14} color={colors.mutedForeground} />
                        <Text style={{ color: colors.mutedForeground, fontSize: 14, fontWeight: '600' }}>Pro Only</Text>
                      </View>
                    </Button>
                  )}
                  {test.pdfUrl && (
                    <Button size="sm" variant="outline" onPress={() => router.push({
                      pathname: '/(auth)/tests/pdf-viewer',
                      params: { url: test.pdfUrl, title: test.title },
                    } as any)}>
                      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>PDF</Text>
                    </Button>
                  )}
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
