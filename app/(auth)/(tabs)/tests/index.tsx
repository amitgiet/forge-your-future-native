import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, ChevronRight, Clock, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';

export default function TestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<any[]>([]);
  const [tab, setTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchTests = async () => {
    try {
      const res = await apiService.testSeries.getSeriesCatalog();
      if (res.data?.success) {
        setSeries(res.data.data || []);
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
          Test Series
        </Text>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 4 }}>
          Practice with mock tests and custom tests
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Button variant="outline" onPress={() => router.push('/(auth)/test/custom-create' as any)}>
          <Text style={{ color: colors.foreground, fontWeight: '600' }}>+ Create Custom Test</Text>
        </Button>
      </View>

      <FlatList
        data={series}
        keyExtractor={(item) => item._id || item.seriesType}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} height={100} borderRadius={12} />)}
            </View>
          ) : (
            <Text style={{ textAlign: 'center', color: colors.mutedForeground, marginTop: 40 }}>
              No test series available yet
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(auth)/tests/${item.seriesType || item._id}` as any)}>
            <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{item.seriesType || item.title}</Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                  {item.testCount || item.count || 0} tests
                </Text>
              </View>
              <ChevronRight size={20} color={colors.mutedForeground} />
            </GlassCard>
          </Pressable>
        )}
      />
    </View>
  );
}
