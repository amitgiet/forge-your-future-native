import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, Star, EyeOff, CheckCircle, BookMarked } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Progress } from '@/components/ui/Progress';

const FILTER_TABS = [
  { key: 'all', label: 'All Formulae', icon: BookOpen, color: '#3B82F6' },
  { key: 'revision', label: 'Need Revision', icon: Star, color: '#F59E0B' },
  { key: 'bookmarks', label: 'Bookmarks', icon: BookMarked, color: '#8B5CF6' },
  { key: 'unseen', label: 'Not Seen', icon: EyeOff, color: '#EF4444' },
  { key: 'memorized', label: 'Memorized', icon: CheckCircle, color: '#10B981' },
];

export default function ChapterFormulaCardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { chapterId, title } = useLocalSearchParams<{ chapterId: string; title?: string }>();

  const [topics, setTopics] = useState<any[]>([]);
  const [progressSummary, setProgressSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchData = async () => {
    try {
      const [topicsRes, progRes] = await Promise.all([
        apiService.formulas.getTopics(title || chapterId),
        apiService.formulas.getChapterProgress(title || chapterId),
      ]);
      if (topicsRes.data?.success) setTopics(topicsRes.data.data || []);
      if (progRes.data?.success) setProgressSummary(progRes.data.data || []);
    } catch (error) {
      console.error('Formula chapter fetch error', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const topicStats = topics.reduce((acc: Record<string, any>, topic) => {
    const topicTitle = topic.title || topic.name || topic;
    const topicProgress = progressSummary.filter((p: any) => p.topicTitle === topicTitle);
    const memorized = topicProgress.filter((p: any) => p.status === 'memorized').length;
    const revision = topicProgress.filter((p: any) => p.status === 'need_revision').length;
    const bookmarks = topicProgress.filter((p: any) => p.isBookmarked).length;
    const unseen = (topic.cardsCount || 0) - topicProgress.length + topicProgress.filter((p: any) => p.status === 'unseen').length;
    acc[topic._id || topicTitle] = { memorized, revision, bookmarks, unseen };
    return acc;
  }, {} as Record<string, any>);

  const filteredTopics = topics.filter((topic) => {
    if (activeFilter === 'all') return true;
    const key = topic._id || topic.title || topic.name || topic;
    const stats = topicStats[key] || { memorized: 0, revision: 0, bookmarks: 0, unseen: 0 };
    if (activeFilter === 'revision') return stats.revision > 0;
    if (activeFilter === 'bookmarks') return stats.bookmarks > 0;
    if (activeFilter === 'unseen') return stats.unseen > 0;
    if (activeFilter === 'memorized') return stats.memorized > 0;
    return true;
  });

  const totalCards = topics.reduce((sum, t) => sum + (t.cardsCount || 0), 0);
  const mastered = progressSummary.filter((p: any) => p.status === 'mastered').length;
  const progressPct = totalCards > 0 ? Math.round((mastered / totalCards) * 100) : 0;

  const openCardViewer = (topicTitle: string) => {
    router.push({ pathname: '/(auth)/formula-cards/viewer', params: { topicTitle, chapterTitle: title || chapterId } } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}><ArrowLeft size={24} color={colors.foreground} /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>{title || 'Chapter Formulas'}</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{totalCards} Formula Cards</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Topics</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>{filteredTopics.length} Topics</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeFilter === tab.key;
            return (
              <Pressable key={tab.key} onPress={() => setActiveFilter(tab.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '20' : colors.card, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8 }}>
                <Icon size={14} color={active ? colors.primary : tab.color} />
                <Text style={{ fontSize: 10, color: active ? colors.primary : colors.foreground }}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={80} borderRadius={12} />)}
          </View>
        ) : filteredTopics.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40 }}><Text style={{ color: colors.mutedForeground }}>No topics match the selected filter.</Text></GlassCard>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginHorizontal: -4 }}>
            {filteredTopics.map((topic: any, idx: number) => {
              const topicTitle = topic.title || topic.name || topic;
              const cardCount = topic.cardsCount || topic.cards?.length || 0;
              const stats = topicStats[topic._id || topicTitle] || { memorized: 0, revision: 0 };
              const percentMemorized = cardCount > 0 ? (stats.memorized / cardCount) * 100 : 0;
              return (
                <Pressable key={`${topicTitle}-${idx}`} onPress={() => openCardViewer(topicTitle)} style={{ width: '48%', marginBottom: 10, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ height: 80, backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center' }}><BookOpen size={26} color={colors.primary} /></View>
                  <View style={{ padding: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground, lineHeight: 16 }} numberOfLines={2}>{topicTitle}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
                      <Badge variant="secondary" style={{ paddingHorizontal: 8, paddingVertical: 2 }} textStyle={{ fontSize: 10 }}>{stats.revision || 0}</Badge>
                      <Badge variant="outline" style={{ paddingHorizontal: 8, paddingVertical: 2 }} textStyle={{ fontSize: 10 }}>{cardCount}</Badge>
                    </View>
                    <View style={{ marginTop: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 8, color: colors.mutedForeground }}>{stats.memorized || 0} memorized</Text>
                        <Text style={{ fontSize: 8, color: colors.mutedForeground }}>{Math.round(percentMemorized)}%</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 100, overflow: 'hidden', marginTop: 3 }}>
                        <View style={{ width: `${Math.round(percentMemorized)}%`, height: '100%', backgroundColor: colors.success }} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
