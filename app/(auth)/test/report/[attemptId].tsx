import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Target, Clock, CheckCircle, XCircle, Home, ChevronDown, ChevronUp, RotateCcw, BookOpen, AlertCircle, Timer, Zap, Gauge, BrainCircuit } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { answerPayloadFromAttempt, getCorrectOptionIndex, normalizeQuestions } from '@/lib/questionNormalization';
import { getTestReportState } from '@/lib/testReportState';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const getOptionsArray = (options: any): string[] => {
  if (Array.isArray(options)) return options.map((opt) => String(opt?.text || opt?.value || opt || ''));
  if (options && typeof options === 'object') return OPTION_LABELS.map((key) => String(options[key] ?? ''));
  return [];
};

const getAnswerIndex = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const v = value.trim().toUpperCase();
    if (/^[A-D]$/.test(v)) return v.charCodeAt(0) - 65;
    const num = Number(v);
    if (Number.isFinite(num)) return num;
  }
  return null;
};

export default function TestReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openExplanations, setOpenExplanations] = useState<Record<string, boolean>>({});
  const [retaking, setRetaking] = useState(false);
  const storedState = getTestReportState(String(attemptId));

  useEffect(() => {
    const loadReport = async () => {
      try {
        const existing = getTestReportState(String(attemptId));
        if (existing?.attemptData) {
          setReport(existing.attemptData);
          return;
        }
        const res = await apiService.tests.getAttempt(attemptId);
        if (res.data?.success) setReport(res.data.data);
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [attemptId]);

  const results = report?.results || {};
  const testEntity = report?.testId || report?.test || null;
  const total = results?.totalQuestions ?? report?.totalQuestions ?? report?.questions?.length ?? 0;
  const score = results?.marksObtained ?? report?.score ?? 0;
  const correct = results?.correct ?? report?.correctAnswers ?? 0;
  const incorrect = results?.incorrect ?? report?.incorrectAnswers ?? 0;
  const partial = results?.partial ?? 0;
  const skipped = results?.skipped ?? Math.max(0, total - correct - incorrect);
  const percentage = Math.round(results?.percentage ?? (total > 0 ? (correct / total) * 100 : 0));
  const timeTaken = results?.timeAnalysis?.totalTime ?? storedState?.timeTaken ?? report?.timeTaken ?? 0;
  const weakAreas = Array.isArray(report?.weakAreas) ? report.weakAreas : [];
  const ntaMeta = Array.isArray(storedState?.meta) ? storedState.meta : [];

  const reviewQuestions = useMemo(() => {
    const storedQuestions = Array.isArray(storedState?.questions) ? storedState.questions : null;
    if (storedQuestions?.length) {
      const answers = Array.isArray(report?.answers) ? report.answers : [];
      return storedQuestions.map((q: any, idx: number) => ({
        key: String(q?._id || q?.id || idx),
        question: q?.question || '',
        options: getOptionsArray(q?.typeData?.options || q?.options),
        explanation: String(q?.explanation || ''),
        userAnswer: answers[idx]?.answerPayload ?? answerPayloadFromAttempt(q, answers[idx]),
        correctAnswer: getCorrectOptionIndex(q),
        subject: q?.subject || '',
        chapter: q?.chapter || '',
        q,
      }));
    }

    const testQuestions = Array.isArray(report?.testId?.questions)
      ? report.testId.questions
      : Array.isArray(report?.test?.questions)
        ? report.test.questions
        : Array.isArray(report?.questions)
          ? report.questions
          : [];
    const answers = Array.isArray(report?.answers) ? report.answers : [];
    const answerMap = new Map<string, any>();
    answers.forEach((ans: any) => {
      const qid = String(ans?.questionId?._id || ans?.questionId || '');
      if (qid) answerMap.set(qid, ans);
    });

    return normalizeQuestions(testQuestions).map((q: any, idx: number) => {
      const qid = String(q?._id || q?.id || '');
      const ans = qid ? answerMap.get(qid) : null;
      return {
        key: qid || String(idx),
        question: q?.question || q?.text || '',
        options: getOptionsArray(q?.typeData?.options || q?.options),
        explanation: String(q?.explanation || q?.solution || ''),
        userAnswer: answerPayloadFromAttempt(q, ans),
        correctAnswer: getCorrectOptionIndex(q),
        subject: q?.subject || '',
        chapter: q?.chapter || '',
        q,
      };
    });
  }, [report, storedState]);

  const analytics = useMemo(() => {
    const totalTimeSpent = Number(results?.timeAnalysis?.totalTime ?? timeTaken ?? 0);
    const avgTime = Number(results?.timeAnalysis?.avgTimePerQuestion ?? (total > 0 ? totalTimeSpent / total : 0));
    const fastest = Number(results?.timeAnalysis?.fastestQuestion ?? 0);
    const slowest = Number(results?.timeAnalysis?.slowestQuestion ?? 0);
    const markedReview = Number(results?.markedForReview ?? ntaMeta.filter((m: any) => m?.state === 'marked-review' || m?.state === 'answered-marked').length ?? 0);
    const bookmarked = ntaMeta.filter((m: any) => m?.bookmarked).length;

    const subjectInsights = Array.isArray(results?.subjectWise) ? results.subjectWise : [];
    const chapterBreakdown = Array.isArray(results?.chapterWise) ? [...results.chapterWise].sort((a, b) => Number(a.accuracy || 0) - Number(b.accuracy || 0)) : [];
    const outcomeChartData = [
      { name: 'Correct', value: Number(results?.correct || 0), fill: '#16a34a' },
      { name: 'Incorrect', value: Number(results?.incorrect || 0), fill: '#dc2626' },
      { name: 'Skipped', value: Number(results?.skipped || 0), fill: '#f59e0b' },
      ...(Number(results?.partial || 0) > 0 ? [{ name: 'Partial', value: Number(results?.partial || 0), fill: '#0ea5e9' }] : []),
    ].filter((item) => item.value > 0);

    const weakTopics = (weakAreas.length ? weakAreas : chapterBreakdown).slice(0, 6).map((item: any) => ({
      chapter: String(item.chapter || item.topic || 'General'),
      subject: String(item.subject || 'General'),
      accuracy: Number(item.accuracy || 0),
      questionsWrong: Number(item.questionsWrong || item.incorrect || 0),
    }));

    const strongTopics = [...chapterBreakdown]
      .sort((a, b) => Number(b.accuracy || 0) - Number(a.accuracy || 0))
      .filter((item) => Number(item.total || 0) > 0)
      .slice(0, 6)
      .map((item: any) => ({
        chapter: String(item.chapter || 'General'),
        subject: String(item.subject || 'General'),
        accuracy: Number(item.accuracy || 0),
        questionsWrong: Number(item.incorrect || 0),
      }));

    return { totalTimeSpent, avgTime, fastest, slowest, subjectInsights, chapterBreakdown, outcomeChartData, weakTopics, strongTopics, bookmarked, markedReview };
  }, [results, timeTaken, total, ntaMeta, weakAreas]);

  const handleRetake = async () => {
    if (String(attemptId).startsWith('revision-')) {
      const existing = getTestReportState(String(attemptId));
      router.replace((existing?.returnTo || '/(auth)/revision') as any);
      return;
    }
    const testId = String(testEntity?._id || '');
    if (!testId) return;
    try {
      setRetaking(true);
      const res = await apiService.tests.startTest(testId);
      const newAttemptId = res.data?.data?._id || res.data?.data?.attemptId;
      if (newAttemptId) {
        router.replace({ pathname: '/(auth)/test/session/[attemptId]', params: { attemptId: String(newAttemptId) } } as any);
      }
    } catch (e) {
      console.error('Failed to retake test', e);
    } finally {
      setRetaking(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={200} borderRadius={16} />
          <Skeleton height={100} borderRadius={12} />
          <Skeleton height={80} borderRadius={12} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground }}>Test Report</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <GlassCard style={{ alignItems: 'center', paddingVertical: 28, marginBottom: 16, backgroundColor: colors.primary + '0A' }}>
          <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 8, borderColor: percentage >= 80 ? colors.success : percentage >= 50 ? colors.warning : colors.destructive, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: colors.card }}>
            <Text style={{ fontSize: 36, fontWeight: '800', color: percentage >= 80 ? colors.success : percentage >= 50 ? colors.warning : colors.destructive }}> {percentage}% </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>{testEntity?.title || report?.test?.title || 'Test Report'}</Text>
          <Text style={{ fontSize: 16, color: colors.mutedForeground, marginTop: 6, fontWeight: '600' }}>
            Score: {score} / {results?.totalMarks ?? report?.maxScore ?? total * 4} marks
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' }}>
            {[
              { label: 'Total Questions', value: total, icon: Target },
              { label: 'Correct', value: correct, icon: CheckCircle },
              { label: 'Incorrect', value: incorrect, icon: XCircle },
              { label: 'Skipped', value: skipped, icon: AlertCircle },
              { label: 'Score', value: `${score}/${results?.totalMarks ?? total * 4}`, icon: Target },
              { label: 'Time Taken', value: formatDuration(timeTaken), icon: Clock },
            ].map((item) => (
              <View key={item.label} style={{ width: '47%', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, alignItems: 'center' }}>
                <item.icon size={18} color={colors.primary} />
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.foreground, marginTop: 6, textAlign: 'center' }}>{item.value}</Text>
                <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Accuracy</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: percentage >= 80 ? colors.success : percentage >= 50 ? colors.warning : colors.destructive }}>{percentage}%</Text>
          </View>
          <Progress value={percentage} height={12} color={percentage >= 80 ? colors.success : percentage >= 50 ? colors.warning : colors.destructive} />
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 8 }}>{correct} out of {total} correct</Text>
        </GlassCard>

        <GlassCard style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Time Analysis</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{analytics.bookmarked} bookmarked • {analytics.markedReview} marked</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Total', value: formatDuration(analytics.totalTimeSpent || 0) },
              { label: 'Avg/Q', value: `${Math.round(analytics.avgTime || 0)}s` },
              { label: 'Fastest', value: analytics.fastest ? `${formatDuration(analytics.fastest)}` : 'N/A' },
              { label: 'Slowest', value: analytics.slowest ? `${formatDuration(analytics.slowest)}` : 'N/A' },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1, backgroundColor: colors.muted + '55', borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 10, textTransform: 'uppercase', color: colors.mutedForeground, marginBottom: 4 }}>{item.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Areas for Improvement</Text>
          {analytics.weakTopics.length ? analytics.weakTopics.map((area: any, idx: number) => (
            <GlassCard key={`${area.chapter}-${idx}`} style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: colors.destructive }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{area.chapter}</Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>{area.subject} • {area.questionsWrong} wrong • {Math.round(area.accuracy || 0)}%</Text>
                </View>
                <Pressable onPress={() => router.push({ pathname: '/(auth)/practice/start', params: { subject: String(area.subject || ''), topic: String(area.chapter || '') } } as any)} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Practice</Text>
                </Pressable>
              </View>
            </GlassCard>
          )) : (
            <GlassCard>
              <Text style={{ color: colors.mutedForeground }}>No weak topics were detected in this attempt.</Text>
            </GlassCard>
          )}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Subject Performance</Text>
          {analytics.subjectInsights.length ? analytics.subjectInsights.map((item: any) => (
            <GlassCard key={item.subject} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{item.subject}</Text>
                <Badge variant="secondary">Efficiency {Math.round(item.efficiencyScore || 0)}</Badge>
              </View>
              <View style={{ marginTop: 10 }}>
                <Progress value={Number(item.accuracy || 0)} height={8} color={colors.primary} />
              </View>
              <Text style={{ marginTop: 8, fontSize: 12, color: colors.mutedForeground }}>{item.correct}/{item.total} correct • {Math.round(item.avgTime || 0)}s avg</Text>
            </GlassCard>
          )) : null}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Chapter Breakdown</Text>
          {analytics.chapterBreakdown.length ? analytics.chapterBreakdown.map((chapter: any) => (
            <GlassCard key={`${chapter.subject}-${chapter.chapter}`} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>{chapter.chapter}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>{chapter.subject}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: chapter.accuracy >= 80 ? colors.success : chapter.accuracy >= 50 ? colors.warning : colors.destructive }}>{Math.round(chapter.accuracy || 0)}%</Text>
              </View>
              <View style={{ marginTop: 10 }}>
                <Progress value={Number(chapter.accuracy || 0)} height={8} color={colors.primary} />
              </View>
              <Text style={{ marginTop: 8, fontSize: 11, color: colors.mutedForeground }}>{chapter.correct}/{chapter.total} correct • {chapter.incorrect} wrong</Text>
            </GlassCard>
          )) : null}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Answer Review</Text>
          {reviewQuestions.length ? reviewQuestions.map((item: any, idx: number) => {
            const selectedIdx = item.userAnswer?.kind === 'mcq' ? getAnswerIndex(item.userAnswer.selectedOption) : getAnswerIndex(item.userAnswer);
            const correctIdx = getAnswerIndex(item.correctAnswer);
            const isCorrect = selectedIdx !== null && correctIdx !== null && selectedIdx === correctIdx;
            const isUnattempted = selectedIdx === null;
            const explanationOpen = Boolean(openExplanations[item.key]);
            const hasExplanation = Boolean(String(item.explanation || '').trim());

            return (
              <GlassCard key={item.key} style={{ marginBottom: 14, borderLeftWidth: 4, borderLeftColor: isUnattempted ? colors.mutedForeground : isCorrect ? colors.success : colors.destructive }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', marginBottom: 4 }}>Question {idx + 1} • {item.subject}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, lineHeight: 22 }}>{item.question}</Text>
                  </View>
                  <Badge variant={isUnattempted ? 'outline' : isCorrect ? 'success' : 'warning'}>
                    {isUnattempted ? 'Skipped' : isCorrect ? 'Correct' : 'Incorrect'}
                  </Badge>
                </View>

                {!!ntaMeta[idx]?.timeSpent && (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.muted + '55', marginBottom: 12, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Time: {formatDuration(Number(ntaMeta[idx]?.timeSpent || 0))}</Text>
                  </View>
                )}

                {!!item.options?.length && (
                  <View style={{ gap: 8, marginBottom: 12 }}>
                    {item.options.map((opt: string, optIdx: number) => {
                      const isSelected = selectedIdx === optIdx;
                      const isRight = correctIdx === optIdx;
                      let bg = colors.card;
                      let borderColor = colors.border;
                      let badgeBg = colors.muted + '40';
                      let badgeText = colors.mutedForeground;
                      if (isRight) {
                        bg = colors.success + '15';
                        borderColor = colors.success;
                        badgeBg = colors.success;
                        badgeText = '#fff';
                      } else if (isSelected && !isRight) {
                        bg = colors.destructive + '15';
                        borderColor = colors.destructive;
                        badgeBg = colors.destructive;
                        badgeText = '#fff';
                      }
                      return (
                        <View key={`${item.key}-opt-${optIdx}`} style={{ borderWidth: 1, borderColor, backgroundColor: bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: badgeBg, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: badgeText }}>{OPTION_LABELS[optIdx]}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, color: colors.foreground }}>{opt}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={{ flexDirection: 'row', padding: 10, backgroundColor: colors.muted + '20', borderRadius: 10, marginBottom: hasExplanation ? 10 : 0 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase' }}>Your Answer</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isUnattempted ? colors.mutedForeground : isCorrect ? colors.success : colors.destructive }}>
                      {isUnattempted ? 'Not Attempted' : `Option ${OPTION_LABELS[selectedIdx ?? -1]}`}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase' }}>Correct Answer</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>
                      {correctIdx === null ? 'N/A' : `Option ${OPTION_LABELS[correctIdx]}`}
                    </Text>
                  </View>
                </View>

                {hasExplanation && (
                  <Pressable onPress={() => setOpenExplanations((prev) => ({ ...prev, [item.key]: !prev[item.key] }))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: colors.primary + '10', borderRadius: 10, gap: 6 }}>
                    <BookOpen size={16} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{explanationOpen ? 'Hide Explanation' : 'View Explanation'}</Text>
                    {explanationOpen ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
                  </Pressable>
                )}

                {hasExplanation && explanationOpen && (
                  <View style={{ marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.primary + '30', backgroundColor: colors.card, padding: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 8, textTransform: 'uppercase' }}>Explanation</Text>
                    <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 20 }}>{item.explanation}</Text>
                  </View>
                )}
              </GlassCard>
            );
          }) : null}
        </View>

        <View style={{ gap: 12, marginTop: 8 }}>
          <Button variant="primary" style={{ height: 54, borderRadius: 16 }} onPress={() => router.replace((storedState?.returnTo || '/(auth)/(tabs)/tests') as any)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Home size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{storedState?.returnLabel || 'Return to Dashboard'}</Text>
            </View>
          </Button>
          {testEntity?._id && (
            <Button variant="outline" style={{ height: 54, borderRadius: 16 }} onPress={handleRetake} loading={retaking} disabled={retaking}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <RotateCcw size={18} color={colors.foreground} />
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600' }}>Retake Test</Text>
              </View>
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
