import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { ArrowLeft, FileText, CheckCircle2, Clock, ExternalLink } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, gradientProps } from '@/theme/gradients';

const TYPE_LABELS: Record<string, string> = {
  'part-test': 'Part Test',
  'full-test': 'Full Test',
  'fulllength-test': 'Full Length',
};

const normalizeType = (value: any) => {
  const str = String(value || '').trim().toLowerCase();
  if (!str) return 'unknown';
  if (str === 'chapter_test') return 'part-test';
  if (str === 'full_test') return 'full-test';
  return str;
};

const classLabel: Record<string, string> = {
  all: 'All Classes', '11': 'Class 11', '12': 'Class 12',
  dropper: 'Dropper', mixed: '11 + 12', other: 'Other',
};

const getTestForTokens = (item: any): string[] => {
  const fromSource = Array.isArray(item.source?.testFor) ? item.source!.testFor!.map((v: any) => String(v).toLowerCase()) : [];
  const fromTags = Array.isArray(item.tags) ? item.tags.map((t: any) => String(t).toLowerCase()).filter((t: any) => t.startsWith('for:')).map((t: any) => t.replace('for:', '')) : [];
  return [...new Set([...fromSource, ...fromTags])];
};

const inferClass = (item: any): string => {
  if (item.classCategory && item.classCategory !== 'all') return item.classCategory;
  const testFor = getTestForTokens(item);
  const has11 = testFor.includes('11');
  const has12 = testFor.includes('12');
  const hasDropper = testFor.includes('dropper');
  if (hasDropper) return 'dropper';
  if (has11 && has12) return 'mixed';
  if (has11) return '11';
  if (has12) return '12';
  return 'other';
};

export default function TestListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { seriesKey, typeKey } = useLocalSearchParams<{ seriesKey: string; typeKey: string }>();

  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await apiService.testSeries.getTestsBySeriesType(String(seriesKey), { page: 1, limit: 500 });
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      setTests(items);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTests();
  }, [seriesKey, typeKey]);

  const filtered = useMemo(() => {
    const wanted = normalizeType(typeKey);
    return tests.filter((t) => normalizeType(t.source?.originalTestType || t.testType || t.typeKey) === wanted);
  }, [tests, typeKey]);

  const toggleCompleted = async (item: any) => {
    try {
      const nextCompleted = !Boolean(item.progress?.completed);
      await apiService.mocks.markMockCompleted(item._id, { completed: nextCompleted });
      setTests((prev) =>
        prev.map((t) =>
          t._id === item._id ? { ...t, progress: { completed: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : null } } : t
        )
      );
    } catch (e) {
    }
  };

  const openPdf = (url?: string, title?: string) => {
    if (!url) return;
    router.push(`/tests/pdf-viewer?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || 'Mock PDF')}` as any);
  };

  const displayName = TYPE_LABELS[normalizeType(typeKey)] || String(typeKey || 'Tests');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 20 }}>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{filtered.length} tests</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Loading tests...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 32, alignItems: 'center' }}>
            <FileText size={40} color={colors.mutedForeground} style={{ opacity: 0.4, marginBottom: 8 }} />
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>No tests found</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filtered.map((item: any, i: number) => {
              const testId = String(item._id || item.id || '');
              const title = item.title?.en || item.title?.hi || item.testId;
              const desc = item.description?.en || item.description?.hi || '';
              const completed = Boolean(item.progress?.completed);
              const hasPdfs = item.resources?.questionPdf || item.resources?.answerPdf;

              return (
                <MotiView key={testId} from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: i * 0.025 }}
                  style={{ borderRadius: 16, borderWidth: 1, borderColor: completed ? colors.success + '4D' : colors.border, backgroundColor: colors.card, overflow: 'hidden' }}
                >
                  <View style={{ padding: 16, paddingBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: completed ? colors.success + '1A' : colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
                        {completed ? <CheckCircle2 size={20} color={colors.success} /> : <FileText size={20} color={colors.primary} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, lineHeight: 20 }}>{title}</Text>
                        {desc ? <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={2}>{desc}</Text> : null}
                      </View>
                      {item.accessType === 'FREE' && (
                        <View style={{ backgroundColor: colors.success + '1A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success }}>FREE</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} color={colors.mutedForeground} />
                        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{item.config?.duration || 0} min</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <FileText size={14} color={colors.mutedForeground} />
                        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{item.config?.totalQuestions || 0} Qs</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{classLabel[inferClass(item)]}</Text>
                      {completed && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} color={colors.success} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.success }}>Done</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.muted + '4D', borderTopWidth: 1, borderTopColor: colors.border }}>
                    {hasPdfs && (
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                        <Pressable onPress={() => openPdf(item.resources?.questionPdf, `${title} - Questions`)} disabled={!item.resources?.questionPdf}
                          style={{ flex: 1, height: 32, borderRadius: 8, backgroundColor: colors.primary + '1A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: item.resources?.questionPdf ? 1 : 0.4 }}
                        >
                          <FileText size={12} color={colors.primary} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Questions</Text>
                        </Pressable>
                        <Pressable onPress={() => openPdf(item.resources?.answerPdf, `${title} - Solutions`)} disabled={!item.resources?.answerPdf}
                          style={{ flex: 1, height: 32, borderRadius: 8, backgroundColor: colors.success + '1A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: item.resources?.answerPdf ? 1 : 0.4 }}
                        >
                          <CheckCircle2 size={12} color={colors.success} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.success }}>Solutions</Text>
                        </Pressable>
                      </View>
                    )}

                    {(item.resources?.hindiQuestionPdf || item.resources?.hindiAnswerPdf) && (
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                        <Pressable onPress={() => openPdf(item.resources?.hindiQuestionPdf, `${title} - Hindi Qs`)} disabled={!item.resources?.hindiQuestionPdf}
                          style={{ flex: 1, height: 28, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', opacity: item.resources?.hindiQuestionPdf ? 1 : 0.4 }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>Hindi Qs</Text>
                        </Pressable>
                        <Pressable onPress={() => openPdf(item.resources?.hindiAnswerPdf, `${title} - Hindi Ans`)} disabled={!item.resources?.hindiAnswerPdf}
                          style={{ flex: 1, height: 28, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', opacity: item.resources?.hindiAnswerPdf ? 1 : 0.4 }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>Hindi Ans</Text>
                        </Pressable>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Pressable onPress={() => toggleCompleted(item)} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.9 : 1 })}>
                        {completed ? (
                          <View style={{ height: 36, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground }}>Undo Completion</Text>
                          </View>
                        ) : (
                          <LinearGradient colors={[...gradients.primary]} start={gradientProps.start} end={gradientProps.end} style={{ height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Mark Complete</Text>
                          </LinearGradient>
                        )}
                      </Pressable>
                      <Pressable onPress={() => openPdf(item.resources?.questionPdf || item.resources?.answerPdf, `${title}`)} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                        <ExternalLink size={16} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                  </View>
                </MotiView>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
