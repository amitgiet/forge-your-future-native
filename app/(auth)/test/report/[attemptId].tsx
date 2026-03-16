import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Target, Clock, CheckCircle, XCircle, Home, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function getOptionsArray(options: any): string[] {
  if (Array.isArray(options)) {
    return options.map((opt) => {
      if (typeof opt === 'string') return opt;
      if (opt && typeof opt === 'object') return String(opt.text || opt.value || '');
      return String(opt ?? '');
    });
  }
  if (options && typeof options === 'object') {
    return OPTION_LABELS.map((key) => String(options[key] ?? ''));
  }
  return [];
}

function getAnswerIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const v = value.trim().toUpperCase();
    if (/^[A-D]$/.test(v)) return v.charCodeAt(0) - 65;
    const num = Number(v);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

export default function TestReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openExplanations, setOpenExplanations] = useState<Record<string, boolean>>({});
  const [retaking, setRetaking] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const res = await apiService.tests.getAttempt(attemptId);
        if (res.data?.success) {
          setReport(res.data.data);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    loadReport();
  }, []);

  const results = report?.results || {};
  const testEntity = report?.testId || report?.test || null;
  const score = results?.marksObtained ?? report?.score ?? 0;
  const total = results?.totalQuestions ?? report?.totalQuestions ?? report?.questions?.length ?? 0;
  const correct = results?.correct ?? report?.correctAnswers ?? 0;
  const incorrect = results?.incorrect ?? report?.incorrectAnswers ?? 0;
  const unanswered = total - correct - incorrect;
  const percentage = Math.round(results?.percentage ?? (total > 0 ? (correct / total) * 100 : 0));
  const timeTaken = results?.timeAnalysis?.totalTimeSpent ?? report?.timeTaken ?? report?.elapsedSeconds ?? 0;

  const getScoreColor = () => {
    if (percentage >= 80) return colors.success;
    if (percentage >= 50) return colors.warning;
    return colors.destructive;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const weakAreas = Array.isArray(report?.weakAreas) ? report.weakAreas : [];

  const reviewQuestions = useMemo(() => {
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

    return testQuestions.map((q: any, idx: number) => {
      const qid = String(q?._id || q?.id || idx);
      const ans = answerMap.get(qid);
      return {
        key: qid || String(idx),
        question: q?.question || q?.text || '',
        options: getOptionsArray(q?.options),
        explanation: String(q?.explanation || q?.solution || ''),
        userAnswer: ans?.selectedOption ?? null,
        correctAnswer: q?.correctAnswer ?? q?.correct ?? null,
        subject: q?.subject || '',
        chapter: q?.chapter || '',
      };
    });
  }, [report]);

  const handleRetake = async () => {
    const testId = String(testEntity?._id || '');
    if (!testId) return;
    try {
      setRetaking(true);
      const res = await apiService.tests.startTest(testId);
      const newAttemptId = res.data?.data?._id || res.data?.data?.attemptId;
      if (!newAttemptId) return;
      router.replace({
        pathname: '/(auth)/test/session/[attemptId]',
        params: { attemptId: String(newAttemptId) },
      } as any);
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
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Test Report
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Score Circle */}
        <GlassCard style={{ alignItems: 'center', paddingVertical: 32, marginBottom: 16 }}>
          <View style={{
            width: 120, height: 120, borderRadius: 60,
            borderWidth: 6, borderColor: getScoreColor(),
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Text style={{ fontSize: 32, fontWeight: '800', color: getScoreColor(), fontFamily: 'Inter_800ExtraBold' }}>
              {percentage}%
            </Text>
          </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            {testEntity?.title || report?.test?.title || 'Test Report'}
            </Text>
            {score !== undefined && (
              <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 4 }}>
              Score: {score}/{results?.totalMarks ?? report?.maxScore ?? total * 4}
              </Text>
            )}
        </GlassCard>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[
            { icon: CheckCircle, value: String(correct), label: 'Correct', color: colors.success },
            { icon: XCircle, value: String(incorrect), label: 'Wrong', color: colors.destructive },
            { icon: Target, value: String(unanswered), label: 'Skipped', color: colors.mutedForeground },
            { icon: Clock, value: formatTime(timeTaken), label: 'Time', color: colors.warning },
          ].map((stat, i) => (
            <GlassCard key={i} small style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12 }}>
              <stat.icon size={18} color={stat.color} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: stat.color, fontFamily: 'Inter_800ExtraBold' }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 9, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {stat.label}
              </Text>
            </GlassCard>
          ))}
        </View>

        {/* Accuracy Bar */}
        <GlassCard style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 10 }}>Accuracy</Text>
          <Progress value={percentage} color={getScoreColor()} height={12} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{correct} correct</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: getScoreColor() }}>{percentage}%</Text>
          </View>
        </GlassCard>

        {/* Subject Breakdown */}
        {Array.isArray(results?.subjectWise) && results.subjectWise.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Subject Breakdown
            </Text>
            {results.subjectWise.map((row: any, idx: number) => (
              <GlassCard key={`${row.subject}-${idx}`} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{row.subject}</Text>
                  <Badge variant={(row.accuracy || 0) >= 60 ? 'success' : 'warning'}>{Math.round(row.accuracy || 0)}%</Badge>
                </View>
                <Progress value={row.accuracy || 0} height={6} />
              </GlassCard>
            ))}
          </View>
        )}

        {/* Weak Areas */}
        {weakAreas.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Weak Areas
            </Text>
            {weakAreas.map((area: any, idx: number) => (
              <GlassCard key={`${area?.chapter || 'weak'}-${idx}`} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
                      {area?.chapter || area?.topic || 'Topic'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                      {area?.subject || 'Subject'} - {area?.questionsWrong ?? area?.wrong ?? 0} wrong
                    </Text>
                  </View>
                  <Badge variant={(area?.accuracy || 0) < 50 ? 'warning' : 'secondary'}>
                    {Math.round(area?.accuracy || 0)}%
                  </Badge>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/(auth)/practice/start',
                      params: {
                        subject: String(area?.subject || ''),
                        topic: String(area?.chapter || area?.topic || ''),
                      },
                    } as any)
                  }
                  style={{
                    alignSelf: 'flex-start',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    backgroundColor: colors.card,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '700' }}>Fix</Text>
                </Pressable>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Chapter Breakdown */}
        {Array.isArray(results?.chapterWise) && results.chapterWise.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Chapter Breakdown
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {results.chapterWise.map((ch: any, idx: number) => {
                const accuracy = Number(ch?.accuracy || 0);
                const tone = accuracy >= 80 ? colors.success : accuracy >= 50 ? colors.warning : colors.destructive;
                return (
                  <View
                    key={`${ch?.chapter || 'chapter'}-${idx}`}
                    style={{
                      width: '48%',
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      backgroundColor: colors.card,
                      padding: 10,
                    }}
                  >
                    <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                      {ch?.chapter || 'Chapter'}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                      {ch?.subject || 'Subject'}
                    </Text>
                    <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                        {ch?.correct ?? 0}/{ch?.total ?? 0}
                      </Text>
                      <Text style={{ color: tone, fontSize: 12, fontWeight: '700' }}>
                        {Math.round(accuracy)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Answer Review */}
        {reviewQuestions.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Answer Review
            </Text>
            {reviewQuestions.map((item, idx) => {
              const selectedIdx = getAnswerIndex(item.userAnswer);
              const correctIdx = getAnswerIndex(item.correctAnswer);
              const isCorrect = selectedIdx !== null && correctIdx !== null && selectedIdx === correctIdx;
              const explanationOpen = !!openExplanations[item.key];
              const hasExplanation = Boolean(item.explanation.trim());

              return (
                <GlassCard key={item.key} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.foreground, lineHeight: 20 }}>
                      Q{idx + 1}. {item.question}
                    </Text>
                    <Badge variant={isCorrect ? 'success' : 'warning'}>
                      {isCorrect ? 'Correct' : 'Wrong'}
                    </Badge>
                  </View>

                  <View style={{ gap: 8 }}>
                    {item.options.map((opt, optIdx) => {
                      const isSelected = selectedIdx === optIdx;
                      const isRight = correctIdx === optIdx;
                      let bg = colors.card;
                      let border = colors.border;
                      if (isRight) {
                        bg = colors.success + '12';
                        border = colors.success + '55';
                      } else if (isSelected && !isRight) {
                        bg = colors.destructive + '12';
                        border = colors.destructive + '55';
                      }

                      return (
                        <View
                          key={`${item.key}-opt-${optIdx}`}
                          style={{
                            borderWidth: 1,
                            borderColor: border,
                            backgroundColor: bg,
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>{OPTION_LABELS[optIdx]}.</Text>
                          <Text style={{ flex: 1, fontSize: 12, color: colors.foreground }}>{opt}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={{ marginTop: 10, gap: 4 }}>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                      Your Answer:{' '}
                      <Text style={{ color: selectedIdx === null ? colors.mutedForeground : isCorrect ? colors.success : colors.destructive, fontWeight: '700' }}>
                        {selectedIdx === null ? 'Not Attempted' : OPTION_LABELS[selectedIdx] || 'Invalid'}
                      </Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                      Correct Answer:{' '}
                      <Text style={{ color: colors.success, fontWeight: '700' }}>
                        {correctIdx === null ? 'N/A' : OPTION_LABELS[correctIdx] || 'N/A'}
                      </Text>
                    </Text>
                  </View>

                  {hasExplanation && (
                    <Pressable
                      onPress={() =>
                        setOpenExplanations((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                      style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                        {explanationOpen ? 'Hide Explanation' : 'View Explanation'}
                      </Text>
                      {explanationOpen ? (
                        <ChevronUp size={16} color={colors.primary} />
                      ) : (
                        <ChevronDown size={16} color={colors.primary} />
                      )}
                    </Pressable>
                  )}

                  {hasExplanation && explanationOpen && (
                    <View
                      style={{
                        marginTop: 4,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.primary + '44',
                        backgroundColor: colors.primary + '10',
                        padding: 10,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 6 }}>
                        Explanation
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.foreground, lineHeight: 18 }}>{item.explanation}</Text>
                    </View>
                  )}
                </GlassCard>
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={{ gap: 12 }}>
          <Button variant="outline" onPress={() => router.replace('/(auth)/(tabs)/tests' as any)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Home size={18} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600' }}>Back to Tests</Text>
            </View>
          </Button>
          {testEntity?._id && (
            <Button variant="outline" onPress={handleRetake} loading={retaking} disabled={retaking}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={16} color={colors.foreground} />
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '600' }}>Retake Test</Text>
              </View>
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

