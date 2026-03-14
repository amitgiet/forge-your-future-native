import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';

const SUBJECTS = [
  { key: 'all', label: 'All' },
  { key: 'physics', label: 'Physics' },
  { key: 'chemistry', label: 'Chemistry' },
  { key: 'biology', label: 'Biology' },
];

export default function PYQIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState('all');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = activeTab === 'all'
        ? await apiService.pyqMarkedNCERT.getAllPYQData()
        : await apiService.pyqMarkedNCERT.getTopicsBySubject(activeTab);
      if (res.data?.success) {
        setData(res.data.data || []);
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
            PYQ Marked NCERT
          </Text>
        </View>
        <Tabs tabs={SUBJECTS} activeKey={activeTab} onTabChange={setActiveTab} style={{ marginBottom: 12 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={80} borderRadius={12} />)}
          </View>
        ) : data.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <FileText size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No PYQ data</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center' }}>
              PYQ-marked NCERT topics will appear here.
            </Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 10 }}>
            {data.map((topic: any, i: number) => (
              <Pressable
                key={topic._id || i}
                onPress={() => router.push({
                  pathname: '/(auth)/pyq/[topicId]',
                  params: { topicId: topic._id },
                } as any)}
              >
                <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.primary + '15' }}>
                    <FileText size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                      {topic.topic || topic.title || topic.name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      {topic.subject && <Badge variant="outline">{topic.subject}</Badge>}
                      {topic.yearCount && <Badge variant="warning">{topic.yearCount} years</Badge>}
                      {topic.questionCount && <Badge variant="primary">{topic.questionCount} Qs</Badge>}
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
