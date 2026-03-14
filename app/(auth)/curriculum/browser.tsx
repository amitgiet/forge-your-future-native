import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';

const SUBJECT_TABS = [
  { key: 'biology', label: 'Biology' },
  { key: 'chemistry', label: 'Chemistry' },
  { key: 'physics', label: 'Physics' },
];

export default function CurriculumBrowserScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [activeSubject, setActiveSubject] = useState('biology');
  const [chapters, setChapters] = useState<any[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [topics, setTopics] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChapters = async () => {
    try {
      const res = await apiService.curriculum.getChapters(activeSubject);
      if (res.data?.success) {
        setChapters(res.data.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setChapters([]);
    setExpandedChapter(null);
    fetchChapters();
  }, [activeSubject]);

  const handleExpandChapter = async (chapterId: string) => {
    if (expandedChapter === chapterId) {
      setExpandedChapter(null);
      return;
    }
    setExpandedChapter(chapterId);
    if (!topics[chapterId]) {
      try {
        const res = await apiService.curriculum.getTopics(activeSubject, chapterId);
        if (res.data?.success) {
          setTopics((prev) => ({ ...prev, [chapterId]: res.data.data || [] }));
        }
      } catch {}
    }
  };

  const handleTopicPress = (chapter: any, topic: any) => {
    router.push({
      pathname: '/(auth)/curriculum/quiz-instructions',
      params: {
        subject: activeSubject,
        chapterId: chapter._id || chapter.id || chapter.chapterId,
        topic: topic.name || topic.title || topic,
      },
    } as any);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChapters();
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
            Question Bank
          </Text>
        </View>
        <Tabs tabs={SUBJECT_TABS} activeKey={activeSubject} onTabChange={setActiveSubject} style={{ marginBottom: 12 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={70} borderRadius={12} />)}
          </View>
        ) : chapters.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <BookOpen size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No chapters found</Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 10 }}>
            {chapters.map((chapter: any, i: number) => {
              const chId = chapter._id || chapter.id || chapter.chapterId || String(i);
              const isExpanded = expandedChapter === chId;
              const chapterTopics = topics[chId] || [];
              return (
                <View key={chId}>
                  <Pressable onPress={() => handleExpandChapter(chId)}>
                    <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.success + '15' }}>
                        <BookOpen size={18} color={colors.success} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                          {chapter.name || chapter.title || chapter.chapterName}
                        </Text>
                        {chapter.topicCount && (
                          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                            {chapter.topicCount} topics
                          </Text>
                        )}
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={18} color={colors.mutedForeground} />
                      ) : (
                        <ChevronDown size={18} color={colors.mutedForeground} />
                      )}
                    </GlassCard>
                  </Pressable>

                  {isExpanded && (
                    <View style={{ marginLeft: 20, marginTop: 8, gap: 6 }}>
                      {chapterTopics.length === 0 ? (
                        <Text style={{ fontSize: 13, color: colors.mutedForeground, paddingVertical: 8, paddingLeft: 12 }}>
                          Loading topics...
                        </Text>
                      ) : (
                        chapterTopics.map((topic: any, ti: number) => (
                          <Pressable key={ti} onPress={() => handleTopicPress(chapter, topic)}>
                            <View style={{
                              flexDirection: 'row', alignItems: 'center', gap: 8,
                              paddingVertical: 10, paddingHorizontal: 12,
                              backgroundColor: colors.card, borderRadius: 8,
                              borderWidth: 1, borderColor: colors.border,
                            }}>
                              <Text style={{ flex: 1, fontSize: 13, color: colors.foreground }}>
                                {typeof topic === 'string' ? topic : (topic.name || topic.title)}
                              </Text>
                              <ChevronRight size={16} color={colors.mutedForeground} />
                            </View>
                          </Pressable>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
