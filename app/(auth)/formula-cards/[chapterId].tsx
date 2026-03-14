import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookMarked, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Progress } from '@/components/ui/Progress';

export default function ChapterFormulaCardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { chapterId, title } = useLocalSearchParams<{ chapterId: string; title?: string }>();

  const [topics, setTopics] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [topicsRes, progressRes] = await Promise.allSettled([
        apiService.formulas.getTopics(title || chapterId),
        apiService.formulas.getChapterProgress(title || chapterId),
      ]);
      if (topicsRes.status === 'fulfilled' && topicsRes.value.data?.success) {
        setTopics(topicsRes.value.data.data || []);
      }
      if (progressRes.status === 'fulfilled' && progressRes.value.data?.success) {
        setProgress(progressRes.value.data.data);
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

  const mastered = progress?.mastered || 0;
  const total = progress?.total || topics.length;
  const progressPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>
            {title || 'Chapter Formulas'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Card */}
        {progress && (
          <GlassCard style={{ marginBottom: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Mastered</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{mastered}/{total}</Text>
            </View>
            <Progress value={progressPct} height={8} />
          </GlassCard>
        )}

        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={70} borderRadius={12} />)}
          </View>
        ) : topics.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <BookMarked size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No topics found</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>No formula cards available for this chapter.</Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 10 }}>
            {topics.map((topic: any, i: number) => {
              const topicTitle = typeof topic === 'string' ? topic : (topic.title || topic.name);
              const cardCount = topic.cardCount || topic.cards?.length || 0;
              return (
                <Pressable
                  key={i}
                  onPress={() => router.push({
                    pathname: '/(auth)/formula-cards/viewer',
                    params: { topicTitle: topicTitle, chapterTitle: title || chapterId },
                  } as any)}
                >
                  <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.primary + '15' }}>
                      <BookMarked size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                        {topicTitle}
                      </Text>
                      {cardCount > 0 && (
                        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                          {cardCount} cards
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={18} color={colors.mutedForeground} />
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
