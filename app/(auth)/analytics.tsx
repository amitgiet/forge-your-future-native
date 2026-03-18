import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  ArrowLeft, TrendingUp, Target, Flame, BarChart3,
  BookOpen, FlaskConical, Zap, RefreshCw,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import BottomNav from '@/components/BottomNav';

interface SubjectAccuracy {
  subject: string;
  correct: number;
  total: number;
  accuracy: number | null;
}

interface WeekDataPoint {
  week: string;
  label: string;
  correct: number;
  attempted: number;
  accuracy: number | null;
}

interface ChapterHeatmapItem {
  chapterId: string;
  subject: string;
  correct: number;
  total: number;
  accuracy: number | null;
}

const SubjectIcon = ({ subject, size = 20 }: { subject: string; size?: number }) => {
  const { colors } = useTheme();
  const lower = subject?.toLowerCase();
  if (lower === 'physics') return <Zap size={size} color={colors.foreground} />;
  if (lower === 'chemistry') return <FlaskConical size={size} color={colors.foreground} />;
  return <BookOpen size={size} color={colors.foreground} />;
};

const SUBJECT_LABELS: Record<string, string> = {
  biology: 'Biology',
  chemistry: 'Chemistry',
  physics: 'Physics',
};

const Analytics = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [subjectData, setSubjectData] = useState<{ overall: { correct: number; total: number; accuracy: number | null }; subjects: SubjectAccuracy[] } | null>(null);
  const [trendData, setTrendData] = useState<WeekDataPoint[]>([]);
  const [heatmapData, setHeatmapData] = useState<ChapterHeatmapItem[]>([]);
  const [heatSubject, setHeatSubject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for fallback (same as web)
  const MOCK_SUBJECT_DATA = {
    overall: { correct: 342, total: 480, accuracy: 71 },
    subjects: [
      { subject: 'biology', correct: 156, total: 200, accuracy: 78 },
      { subject: 'chemistry', correct: 108, total: 160, accuracy: 68 },
      { subject: 'physics', correct: 78, total: 120, accuracy: 65 },
    ],
  };

  const MOCK_TREND_DATA: WeekDataPoint[] = [
    { week: '2026-W01', label: 'Jan 5', correct: 18, attempted: 30, accuracy: 60 },
    { week: '2026-W02', label: 'Jan 12', correct: 22, attempted: 32, accuracy: 69 },
    { week: '2026-W03', label: 'Jan 19', correct: 20, attempted: 28, accuracy: 71 },
    { week: '2026-W04', label: 'Jan 26', correct: 25, attempted: 35, accuracy: 71 },
    { week: '2026-W05', label: 'Feb 2', correct: 28, attempted: 38, accuracy: 74 },
    { week: '2026-W06', label: 'Feb 9', correct: 24, attempted: 30, accuracy: 80 },
    { week: '2026-W07', label: 'Feb 16', correct: 30, attempted: 40, accuracy: 75 },
    { week: '2026-W08', label: 'Feb 23', correct: 32, attempted: 42, accuracy: 76 },
  ];

  const MOCK_HEATMAP_ALL: ChapterHeatmapItem[] = [
    { chapterId: 'Cell Division', subject: 'biology', correct: 8, total: 20, accuracy: 40 },
    { chapterId: 'Genetics & Evolution', subject: 'biology', correct: 12, total: 22, accuracy: 55 },
    { chapterId: 'Human Physiology', subject: 'biology', correct: 18, total: 30, accuracy: 60 },
    { chapterId: 'Chemical Bonding', subject: 'chemistry', correct: 6, total: 18, accuracy: 33 },
    { chapterId: 'Organic Chemistry', subject: 'chemistry', correct: 10, total: 20, accuracy: 50 },
    { chapterId: 'Mechanics', subject: 'physics', correct: 8, total: 20, accuracy: 40 },
    { chapterId: 'Electrostatics', subject: 'physics', correct: 10, total: 18, accuracy: 56 },
  ];

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, tRes, hRes] = await Promise.all([
        // Using the newly added analytics endpoints
        apiService.analytics.getSubjectAccuracy(),
        apiService.analytics.getAccuracyTrend(8),
        apiService.analytics.getWeaknessHeatmap(heatSubject || undefined),
      ]);
      setSubjectData(sRes.data.data);
      setTrendData(tRes.data.data.weeks);
      setHeatmapData(hRes.data.data.chapters);
    } catch {
      setSubjectData(MOCK_SUBJECT_DATA);
      setTrendData(MOCK_TREND_DATA);
      const filtered = heatSubject ? MOCK_HEATMAP_ALL.filter((c) => c.subject === heatSubject) : MOCK_HEATMAP_ALL;
      setHeatmapData(filtered.sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100)));
    } finally {
      setLoading(false);
    }
  }, [heatSubject]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const maxAccuracy = Math.max(...trendData.map((d) => d.accuracy ?? 0), 1);

  // Heatmap color logic (same as web)
  const getHeatmapColors = (acc: number | null) => {
    if (acc === null) return { bg: colors.muted, text: colors.mutedForeground, border: colors.border };
    if (acc >= 80) return { bg: colors.primary + '1A', text: colors.primary, border: colors.primary + '33' }; // bg-primary/10
    if (acc >= 60) return { bg: colors.secondary + '1A', text: colors.secondary, border: colors.secondary + '33' }; // bg-accent/10
    if (acc >= 40) return { bg: colors.muted, text: colors.foreground, border: colors.border };
    return { bg: colors.destructive + '1A', text: colors.destructive, border: colors.destructive + '33' };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Sticky Header ── */}
      <View style={{
        paddingTop: insets.top,
        paddingHorizontal: 16,
        paddingBottom: 4,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 10,
      }}>
        <MotiView
          // from={{ opacity: 0, translateY: -16 }}
          // animate={{ opacity: 1, translateY: 0 }}
          // transition={{ type: 'timing', duration: 400 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={20} color={colors.foreground} />
            </Pressable>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
                My Analysis
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: -2, fontFamily: 'Inter_400Regular' }}>
                Performance insights & weak areas
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={fetchAll} disabled={loading} style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background,
              alignItems: 'center', justifyContent: 'center',
              opacity: loading ? 0.5 : pressed ? 0.7 : 1,
            })}>
              {loading ? <ActivityIndicator size="small" color={colors.foreground} /> : <RefreshCw size={18} color={colors.foreground} />}
            </Pressable>
            {/* <View style={{
              width: 44, height: 44, borderRadius: 16,
              backgroundColor: colors.primary,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart3 size={24} color="#fff" />
            </View> */}
          </View>
        </MotiView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >

        {error ? (
          <View style={{ backgroundColor: colors.destructive + '1A', borderWidth: 1, borderColor: colors.destructive + '4D', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: colors.destructive }}>{error}</Text>
          </View>
        ) : null}

        {/* ── Overall Stats ── */}
        {subjectData?.overall?.total ? (
          <MotiView
            from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}
            style={{ backgroundColor: colors.primary + '0D', borderWidth: 1, borderColor: colors.primary + '33', borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>Overall Accuracy</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                <Text style={{ fontSize: 32, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>{subjectData.overall.accuracy ?? 0}</Text>
                <Text style={{ fontSize: 18, color: colors.mutedForeground }}>%</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Questions</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, fontFamily: 'Inter_700Bold' }}>{subjectData.overall.correct}</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.mutedForeground }}>/{subjectData.overall.total}</Text>
              </View>
            </View>
          </MotiView>
        ) : null}

        {/* ── Subject Accuracy ── */}
        <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Target size={20} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>Subject Accuracy</Text>
          </View>
          {loading ? (
            <View style={{ gap: 12 }}>{[1, 2, 3].map((i) => <View key={i} style={{ height: 48, backgroundColor: colors.muted, borderRadius: 12 }} />)}</View>
          ) : (
            <View style={{ gap: 16 }}>
              {(subjectData?.subjects || []).map((s, idx) => (
                <MotiView key={s.subject} from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: idx * 50 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <SubjectIcon subject={s.subject} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{SUBJECT_LABELS[s.subject] || s.subject}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{s.accuracy ?? 0}%</Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>({s.correct}/{s.total})</Text>
                    </View>
                  </View>
                  <View style={{ height: 10, backgroundColor: colors.muted, borderRadius: 5, overflow: 'hidden' }}>
                    <MotiView from={{ width: 0 }} animate={{ width: `${s.accuracy ?? 0}%` }} transition={{ type: 'timing', duration: 800 }} style={{ height: '100%', backgroundColor: colors.primary, borderRadius: 5 }} />
                  </View>
                </MotiView>
              ))}
            </View>
          )}
        </MotiView>

        {/* ── Weekly Trend ── */}
        <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 150 }}
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={20} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>Weekly Trend</Text>
          </View>
          {loading ? (
            <View style={{ height: 128, backgroundColor: colors.muted, borderRadius: 12 }} />
          ) : trendData.every((d) => d.accuracy === null) ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 14, color: colors.mutedForeground }}>No test attempts in the last 8 weeks.</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 128 }}>
              {trendData.map((d, i) => {
                const pct = d.accuracy != null ? Math.round((d.accuracy / maxAccuracy) * 100) : 0;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '500', color: colors.mutedForeground }}>{d.accuracy != null ? `${d.accuracy}%` : ''}</Text>
                    <MotiView
                      from={{ height: 0 }} animate={{ height: `${Math.max(4, pct)}%` }} transition={{ delay: i * 50, duration: 600 }}
                      style={{ width: '100%', borderRadius: 8, backgroundColor: d.accuracy != null ? colors.primary : colors.muted, minHeight: 4 }}
                    />
                    <Text style={{ fontSize: 10, color: colors.mutedForeground, textAlign: 'center' }} numberOfLines={1}>{d.label.split(' ')[0]}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </MotiView>

        {/* ── Weakness Heatmap ── */}
        <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 250 }}
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Flame size={20} color={colors.destructive} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>Weak Chapters</Text>
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
            {['', ...Object.keys(SUBJECT_LABELS)].map((s) => (
              <Pressable key={s || 'all'} onPress={() => setHeatSubject(s)} style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
                backgroundColor: heatSubject === s ? colors.primary : colors.card,
                borderColor: heatSubject === s ? colors.primary : colors.border,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: heatSubject === s ? '#fff' : colors.mutedForeground }}>
                  {s ? SUBJECT_LABELS[s] : 'All'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {loading ? (
            <View style={{ gap: 8 }}>{[1, 2, 3, 4].map((i) => <View key={i} style={{ height: 48, backgroundColor: colors.muted, borderRadius: 12 }} />)}</View>
          ) : heatmapData.length === 0 ? (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 40 }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={28} color={colors.mutedForeground} />
              </View>
              <Text style={{ fontSize: 14, color: colors.mutedForeground }}>No chapter data yet.</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Complete tests to see your weaknesses.</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {heatmapData.slice(0, 20).map((c, i) => {
                const heatColors = getHeatmapColors(c.accuracy);
                return (
                  <MotiView key={c.chapterId + i} from={{ opacity: 0, translateX: -8 }} animate={{ opacity: 1, translateX: 0 }} transition={{ delay: i * 30 }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: heatColors.bg, borderColor: heatColors.border }}
                  >
                    <SubjectIcon subject={c.subject} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{c.chapterId}</Text>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground, textTransform: 'capitalize' }}>{c.subject}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: heatColors.text }}>{c.accuracy != null ? `${c.accuracy}%` : '—'}</Text>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground }}>{c.correct}/{c.total}</Text>
                    </View>
                  </MotiView>
                );
              })}
            </View>
          )}
        </MotiView>
      </ScrollView>
      <BottomNav />
    </View>
  );
};

export default Analytics;
