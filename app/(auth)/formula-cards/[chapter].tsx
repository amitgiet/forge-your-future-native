/**
 * FormulaChapterDetail - Topics list for a given chapter.
 * Maps exactly to web's: src/pages/FormulaChapterDetail.tsx
 *
 * Flow: FormulaCards (subjects+chapters) → HERE (topics per chapter) → [topic].tsx (card viewer)
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ArrowLeft, BookOpen, Star, EyeOff, CheckCircle, Bookmark } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { getImageUrl } from '@/lib/utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2-col grid with 16px padding + 16px gap

const FILTER_TABS = [
  { key: 'all', label: 'All', Icon: BookOpen, color: '#3b82f6' },
  { key: 'revision', label: 'Revision', Icon: Star, color: '#eab308' },
  { key: 'bookmarks', label: 'Bookmarks', Icon: Bookmark, color: '#a855f7' },
  { key: 'unseen', label: 'Not Seen', Icon: EyeOff, color: '#ef4444' },
  { key: 'memorized', label: 'Memorized', Icon: CheckCircle, color: '#22c55e' },
];

export default function FormulaChapterDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams();

  const chapterTitle = decodeURIComponent(params.chapter as string);
  const subjectTitle = params.subjectTitle as string;
  const chapterColor = params.chapterColor as string;

  const [topics, setTopics] = useState<any[]>([]);
  const [progressSummary, setProgressSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      if (!chapterTitle) return;
      try {
        const [topicsRes, progRes] = await Promise.all([
          apiService.formulas.getTopics(chapterTitle),
          apiService.formulas.getChapterProgress(chapterTitle),
        ]);
        if (topicsRes.data?.success) setTopics(topicsRes.data.data);
        if (progRes.data?.success) setProgressSummary(progRes.data.data);
      } catch (err) {
        console.error('Failed to load chapter data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [chapterTitle]);

  const totalCards = topics.reduce((sum, t) => sum + (t.cardsCount || 0), 0);

  // Per-topic stats
  const topicStats: Record<string, any> = topics.reduce((acc, topic) => {
    const tp = progressSummary.filter(p => p.topicTitle === topic.title);
    const trackedCount = tp.length;
    const unseenCount = (topic.cardsCount || 0) - trackedCount + tp.filter(p => p.status === 'unseen').length;
    acc[topic._id] = {
      memorized: tp.filter(p => p.status === 'memorized').length,
      revision: tp.filter(p => p.status === 'need_revision').length,
      bookmarks: tp.filter(p => p.isBookmarked).length,
      unseen: unseenCount,
    };
    return acc;
  }, {} as Record<string, any>);

  const filteredTopics = topics.filter(topic => {
    if (activeFilter === 'all') return true;
    const s = topicStats[topic._id];
    if (activeFilter === 'revision' && s.revision > 0) return true;
    if (activeFilter === 'bookmarks' && s.bookmarks > 0) return true;
    if (activeFilter === 'unseen' && s.unseen > 0) return true;
    if (activeFilter === 'memorized' && s.memorized > 0) return true;
    return false;
  });

  const openCardViewer = (topic: any) => {
    router.push({
      pathname: '/(auth)/formula-cards/viewer',
      params: {
        topicTitle: topic.title,
        chapterTitle,
        subjectTitle,
        chapterColor,
      }
    } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top, paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 12
      }}>
        <Pressable 
          onPress={() => router.push('/(auth)/formula-cards')} 
          style={{ padding: 8 }}
          hitSlop={15}
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>{chapterTitle}</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>{totalCards} Formula Cards</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {FILTER_TABS.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveFilter(tab.key)}
            style={{
              minWidth: 72, paddingVertical: 8, paddingHorizontal: 10,
              borderRadius: 15, alignItems: 'center', gap: 4,
              backgroundColor: activeFilter === tab.key ? tab.color + '20' : colors.muted,
              borderWidth: 1,
              borderColor: activeFilter === tab.key ? tab.color + '60' : 'transparent',
            }}
          >
            <tab.Icon size={18} color={tab.color} />
            <Text style={{ fontSize: 10, color: colors.mutedForeground, textAlign: 'center' }}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Topics heading */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>Topics</Text>
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{filteredTopics.length} Topics</Text>
      </View>

      {/* Topics Grid */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}>
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Fetching topics...</Text>
          </View>
        ) : filteredTopics.length === 0 ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Text style={{ color: colors.mutedForeground }}>No topics match the selected filter.</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {filteredTopics.map((topic) => {
              const stats = topicStats[topic._id];
              const percentMemorized = topic.cardsCount > 0 ? (stats.memorized / topic.cardsCount) * 100 : 0;

              return (
                <Pressable
                  key={topic._id}
                  onPress={() => openCardViewer(topic)}
                  style={{
                    width: CARD_WIDTH,
                    backgroundColor: colors.card,
                    borderRadius: 19,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  {/* Preview image area — 4:3 */}
                  <View style={{ width: CARD_WIDTH, height: CARD_WIDTH * 0.75, backgroundColor: colors.muted }}>
                    {topic.coverImage ? (
                      <Image
                        source={{ uri: getImageUrl(topic.coverImage) }}
                        style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                      />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={32} color={colors.primary} style={{ opacity: 0.25 }} />
                      </View>
                    )}
                    {/* Overlaid badges */}
                    <View style={{ position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', gap: 4 }}>
                      {stats.revision > 0 && (
                        <View style={{ backgroundColor: 'rgba(239,68,68,0.85)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{stats.revision}</Text>
                        </View>
                      )}
                      <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{topic.cardsCount}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Info */}
                  <View style={{ padding: 10, gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground, lineHeight: 17 }} numberOfLines={2}>{topic.title}</Text>

                    {/* Progress bar */}
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 9, color: colors.mutedForeground }}>{stats.memorized} memorized</Text>
                        <Text style={{ fontSize: 9, color: colors.mutedForeground }}>{Math.round(percentMemorized)}%</Text>
                      </View>
                      <View style={{ height: 4, backgroundColor: colors.muted, borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ width: `${percentMemorized}%`, height: '100%', backgroundColor: '#22c55e', borderRadius: 2 }} />
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
