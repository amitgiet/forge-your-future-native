import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, TrendingUp, Target, Flame, BarChart3, BookOpen, Zap, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatIcon } from '@/components/ui/StatIcon';
import { Skeleton } from '@/components/ui/Skeleton';
import api from '@/lib/api';
import { MotiView } from 'moti';

// ── Mock / fallback data ────────────────────────────────────────────────

const MOCK_SUBJECT_ACCURACY = [
  { subject: 'Biology', emoji: '\u{1F9EC}', correct: 145, total: 200, accuracy: 72.5 },
  { subject: 'Chemistry', emoji: '\u{2697}\u{FE0F}', correct: 120, total: 180, accuracy: 66.7 },
  { subject: 'Physics', emoji: '\u{269B}\u{FE0F}', correct: 98, total: 160, accuracy: 61.3 },
];

const MOCK_ACCURACY_TREND = [
  { week: 'W1', accuracy: 58 },
  { week: 'W2', accuracy: 62 },
  { week: 'W3', accuracy: 55 },
  { week: 'W4', accuracy: 68 },
  { week: 'W5', accuracy: 71 },
  { week: 'W6', accuracy: 65 },
  { week: 'W7', accuracy: 74 },
  { week: 'W8', accuracy: 78 },
];

const MOCK_WEAKNESS_HEATMAP = [
  { chapter: 'Electrochemistry', subject: 'Chemistry', accuracy: 32, correct: 8, total: 25 },
  { chapter: 'Rotational Motion', subject: 'Physics', accuracy: 38, correct: 6, total: 16 },
  { chapter: 'Genetics', subject: 'Biology', accuracy: 45, correct: 18, total: 40 },
  { chapter: 'Thermodynamics', subject: 'Physics', accuracy: 52, correct: 13, total: 25 },
  { chapter: 'Organic Chemistry', subject: 'Chemistry', accuracy: 55, correct: 22, total: 40 },
  { chapter: 'Human Physiology', subject: 'Biology', accuracy: 63, correct: 19, total: 30 },
  { chapter: 'Optics', subject: 'Physics', accuracy: 70, correct: 14, total: 20 },
  { chapter: 'Plant Physiology', subject: 'Biology', accuracy: 78, correct: 35, total: 45 },
  { chapter: 'Chemical Bonding', subject: 'Chemistry', accuracy: 82, correct: 41, total: 50 },
  { chapter: 'Ecology', subject: 'Biology', accuracy: 88, correct: 22, total: 25 },
];

// ── Types ───────────────────────────────────────────────────────────────

interface SubjectAccuracy {
  subject: string;
  emoji: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface WeekTrend {
  week: string;
  accuracy: number;
}

interface WeakChapter {
  chapter: string;
  subject: string;
  accuracy: number;
  correct: number;
  total: number;
}

// ── Component ───────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [subjectAccuracy, setSubjectAccuracy] = useState<SubjectAccuracy[]>(MOCK_SUBJECT_ACCURACY);
  const [weeklyTrend, setWeeklyTrend] = useState<WeekTrend[]>(MOCK_ACCURACY_TREND);
  const [weakChapters, setWeakChapters] = useState<WeakChapter[]>(MOCK_WEAKNESS_HEATMAP);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [heatmapFilter, setHeatmapFilter] = useState<string>('All');

  const fetchData = useCallback(async () => {
    try {
      const [subjectRes, trendRes, heatmapRes] = await Promise.allSettled([
        api.get('/analytics/subject-accuracy'),
        api.get('/analytics/accuracy-trend?weeks=8'),
        api.get('/analytics/weakness-heatmap'),
      ]);

      if (subjectRes.status === 'fulfilled' && subjectRes.value.data?.data) {
        setSubjectAccuracy(subjectRes.value.data.data);
      }
      if (trendRes.status === 'fulfilled' && trendRes.value.data?.data) {
        setWeeklyTrend(trendRes.value.data.data);
      }
      if (heatmapRes.status === 'fulfilled' && heatmapRes.value.data?.data) {
        setWeakChapters(heatmapRes.value.data.data);
      }
    } catch {
      // keep mock data on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ── Derived values ──────────────────────────────────────────────────

  const totalCorrect = subjectAccuracy.reduce((s, x) => s + x.correct, 0);
  const totalQuestions = subjectAccuracy.reduce((s, x) => s + x.total, 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 10) / 10 : 0;

  const maxTrendAccuracy = Math.max(...weeklyTrend.map((w) => w.accuracy), 1);

  const filteredChapters = weakChapters
    .filter((c) => heatmapFilter === 'All' || c.subject === heatmapFilter)
    .sort((a, b) => a.accuracy - b.accuracy);

  const getHeatmapColor = (accuracy: number) => {
    if (accuracy < 40) return colors.destructive;
    if (accuracy < 60) return colors.mutedForeground;
    if (accuracy < 80) return colors.accent;
    return colors.primary;
  };

  const filterTabs = ['All', 'Biology', 'Chemistry', 'Physics'];

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky Header */}
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 16,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          zIndex: 10,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              padding: 8,
              borderRadius: 10,
              backgroundColor: colors.muted,
            }}
          >
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={18} color={colors.primary} />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: colors.foreground,
                  fontFamily: 'PlusJakartaSans_700Bold',
                }}
              >
                My Analytics
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: colors.mutedForeground,
                marginTop: 2,
                fontFamily: 'Inter_400Regular',
              }}
            >
              Performance insights & weak areas
            </Text>
          </View>

          <Pressable
            onPress={onRefresh}
            style={{
              padding: 8,
              borderRadius: 10,
              backgroundColor: colors.muted,
            }}
          >
            <RefreshCw size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={120} borderRadius={16} />
            ))}
          </View>
        ) : (
          <>
            {/* ── Overall Stats Card ────────────────────────────── */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500 }}
            >
              <View
                style={{
                  backgroundColor: colors.primary + '15',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: colors.primary + '30',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Target size={18} color={colors.primary} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: colors.primary,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      fontFamily: 'PlusJakartaSans_700Bold',
                    }}
                  >
                    Overall Stats
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <View>
                    <Text
                      style={{
                        fontSize: 48,
                        fontWeight: '800',
                        color: colors.primary,
                        fontFamily: 'Inter_800ExtraBold',
                        lineHeight: 52,
                      }}
                    >
                      {overallAccuracy}
                      <Text style={{ fontSize: 22 }}>%</Text>
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.mutedForeground,
                        marginTop: 4,
                        fontFamily: 'Inter_400Regular',
                      }}
                    >
                      Overall Accuracy
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: '700',
                        color: colors.foreground,
                        fontFamily: 'Inter_700Bold',
                      }}
                    >
                      {totalCorrect}/{totalQuestions}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.mutedForeground,
                        fontFamily: 'Inter_400Regular',
                      }}
                    >
                      Questions
                    </Text>
                  </View>
                </View>
              </View>
            </MotiView>

            {/* ── Subject Accuracy ──────────────────────────────── */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 100 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <BookOpen size={16} color={colors.secondary} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.foreground,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontFamily: 'PlusJakartaSans_700Bold',
                  }}
                >
                  Subject Accuracy
                </Text>
              </View>

              <View style={{ gap: 10, marginBottom: 20 }}>
                {subjectAccuracy.map((subject, idx) => (
                  <GlassCard key={subject.subject} style={{ gap: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 18 }}>{subject.emoji}</Text>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '600',
                            color: colors.foreground,
                            fontFamily: 'Inter_600SemiBold',
                          }}
                        >
                          {subject.subject}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: colors.primary,
                            fontFamily: 'Inter_700Bold',
                          }}
                        >
                          {subject.accuracy}%
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.mutedForeground,
                            fontFamily: 'Inter_400Regular',
                          }}
                        >
                          {subject.correct}/{subject.total}
                        </Text>
                      </View>
                    </View>

                    {/* Animated progress bar */}
                    <View
                      style={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.muted,
                        overflow: 'hidden',
                      }}
                    >
                      <MotiView
                        from={{ width: '0%' }}
                        animate={{ width: `${Math.min(subject.accuracy, 100)}%` as any }}
                        transition={{ type: 'timing', duration: 800, delay: 200 + idx * 150 }}
                        style={{
                          height: '100%',
                          borderRadius: 4,
                          backgroundColor: colors.primary,
                        }}
                      />
                    </View>
                  </GlassCard>
                ))}
              </View>
            </MotiView>

            {/* ── Weekly Trend (Bar Chart) ──────────────────────── */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 200 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TrendingUp size={16} color={colors.success} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.foreground,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontFamily: 'PlusJakartaSans_700Bold',
                  }}
                >
                  Weekly Trend
                </Text>
              </View>

              <GlassCard style={{ marginBottom: 20 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    height: 160,
                    gap: 6,
                  }}
                >
                  {weeklyTrend.map((week, idx) => {
                    const barHeight = (week.accuracy / maxTrendAccuracy) * 120;
                    return (
                      <View
                        key={week.week}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '600',
                            color: colors.primary,
                            marginBottom: 4,
                            fontFamily: 'Inter_600SemiBold',
                          }}
                        >
                          {week.accuracy}%
                        </Text>
                        <MotiView
                          from={{ height: 0 }}
                          animate={{ height: barHeight }}
                          transition={{ type: 'timing', duration: 600, delay: 300 + idx * 80 }}
                          style={{
                            width: '80%',
                            borderRadius: 6,
                            backgroundColor: colors.primary,
                            minHeight: 4,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 9,
                            color: colors.mutedForeground,
                            marginTop: 6,
                            fontFamily: 'Inter_400Regular',
                          }}
                        >
                          {week.week}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </GlassCard>
            </MotiView>

            {/* ── Weak Chapters Heatmap ─────────────────────────── */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 300 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Flame size={16} color={colors.warning} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.foreground,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontFamily: 'PlusJakartaSans_700Bold',
                  }}
                >
                  Weak Chapters
                </Text>
              </View>

              {/* Filter Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {filterTabs.map((tab) => {
                  const isActive = heatmapFilter === tab;
                  return (
                    <Pressable
                      key={tab}
                      onPress={() => setHeatmapFilter(tab)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: isActive ? colors.primary : colors.muted,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: isActive ? colors.primaryForeground : colors.mutedForeground,
                          fontFamily: 'Inter_600SemiBold',
                        }}
                      >
                        {tab}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Chapter List */}
              <View style={{ gap: 8 }}>
                {filteredChapters.map((chapter, idx) => {
                  const heatColor = getHeatmapColor(chapter.accuracy);
                  return (
                    <MotiView
                      key={`${chapter.chapter}-${chapter.subject}`}
                      from={{ opacity: 0, translateX: -10 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      transition={{ type: 'timing', duration: 300, delay: idx * 50 }}
                    >
                      <GlassCard
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          borderLeftWidth: 4,
                          borderLeftColor: heatColor,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: colors.foreground,
                              fontFamily: 'Inter_600SemiBold',
                            }}
                            numberOfLines={1}
                          >
                            {chapter.chapter}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.mutedForeground,
                              marginTop: 2,
                              fontFamily: 'Inter_400Regular',
                            }}
                          >
                            {chapter.subject}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: '700',
                              color: heatColor,
                              fontFamily: 'Inter_700Bold',
                            }}
                          >
                            {chapter.accuracy}%
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.mutedForeground,
                              fontFamily: 'Inter_400Regular',
                            }}
                          >
                            {chapter.correct}/{chapter.total}
                          </Text>
                        </View>
                      </GlassCard>
                    </MotiView>
                  );
                })}

                {filteredChapters.length === 0 && (
                  <GlassCard style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                      No data for this subject yet
                    </Text>
                  </GlassCard>
                )}
              </View>
            </MotiView>
          </>
        )}
      </ScrollView>
    </View>
  );
}
