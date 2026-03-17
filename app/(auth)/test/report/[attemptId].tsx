import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Target, Clock, CheckCircle, XCircle, Home, ChevronDown, ChevronUp, RotateCcw, BookOpen } from 'lucide-react-native';
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
      const qid = String(q?._id || q?.id || '');
      const ans = qid ? answerMap.get(qid) : null;
      
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
        {/* Score Card */}
        <GlassCard style={{ alignItems: 'center', paddingVertical: 32, marginBottom: 16, backgroundColor: colors.primary + '0A' }}>
          <View style={{
            width: 140, height: 140, borderRadius: 70,
            borderWidth: 8, borderColor: getScoreColor(),
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            backgroundColor: colors.card,
            shadowColor: getScoreColor(), shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6
          }}>
            <Text style={{ fontSize: 36, fontWeight: '800', color: getScoreColor(), fontFamily: 'Inter_800ExtraBold' }}>
              {percentage}%
            </Text>
          </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' }}>
            {testEntity?.title || report?.test?.title || 'Test Report'}
            </Text>
            {score !== undefined && (
              <Text style={{ fontSize: 16, color: colors.mutedForeground, marginTop: 6, fontWeight: '600' }}>
              Score: {score} / {results?.totalMarks ?? report?.maxScore ?? total * 4} marks
              </Text>
            )}
        </GlassCard>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[
            { icon: CheckCircle, value: String(correct), label: 'Correct', color: colors.success },
            { icon: XCircle, value: String(incorrect), label: 'Wrong', color: colors.destructive },
            { icon: Target, value: String(unanswered), label: 'Skipped', color: colors.mutedForeground },
            { icon: Clock, value: formatTime(timeTaken), label: 'Time', color: colors.warning },
          ].map((stat, i) => (
            <GlassCard key={i} small style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12 }}>
              <stat.icon size={20} color={stat.color} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: stat.color, fontFamily: 'Inter_800ExtraBold' }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' }}>
                {stat.label}
              </Text>
            </GlassCard>
          ))}
        </View>

        {/* Accuracy Bar */}
        <GlassCard style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Accuracy</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: getScoreColor() }}>{percentage}%</Text>
          </View>
          <Progress value={percentage} color={getScoreColor()} height={12} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{correct} out of {total} correct</Text>
          </View>
        </GlassCard>

        {/* Weak Areas */}
        {weakAreas.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16, marginLeft: 4 }}>
              Areas for Improvement
            </Text>
            {weakAreas.map((area: any, idx: number) => (
              <GlassCard key={`${area?.chapter || 'weak'}-${idx}`} style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: colors.destructive }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>
                      {area?.chapter || area?.topic || 'Topic'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>
                      {area?.subject || 'Subject'} • {area?.questionsWrong ?? area?.wrong ?? 0} wrong • {Math.round(area?.accuracy || 0)}%
                    </Text>
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
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Practice</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Answer Review Section */}
        {reviewQuestions.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                Answer Review
              </Text>
              <Badge variant="outline">
                {total} Questions
              </Badge>
            </View>

            {reviewQuestions.map((item, idx) => {
              const selectedIdx = getAnswerIndex(item.userAnswer);
              const correctIdx = getAnswerIndex(item.correctAnswer);
              const isCorrect = selectedIdx !== null && correctIdx !== null && selectedIdx === correctIdx;
              const isUnattempted = selectedIdx === null;
              const explanationOpen = !!openExplanations[item.key];
              const hasExplanation = Boolean(item.explanation.trim());

              return (
                <GlassCard key={item.key} style={{ marginBottom: 16, borderLeftWidth: 4, borderLeftColor: isUnattempted ? colors.mutedForeground : isCorrect ? colors.success : colors.destructive }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', marginBottom: 4 }}>
                        Question {idx + 1} • {item.subject}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, lineHeight: 22 }}>
                        {item.question}
                      </Text>
                    </View>
                    <Badge variant={isUnattempted ? 'outline' : isCorrect ? 'success' : 'warning'}>
                      {isUnattempted ? 'Skipped' : isCorrect ? 'Correct' : 'Incorrect'}
                    </Badge>
                  </View>

                  <View style={{ gap: 8, marginBottom: 12 }}>
                    {item.options.map((opt, optIdx) => {
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
                        <View
                          key={`${item.key}-opt-${optIdx}`}
                          style={{
                            borderWidth: 1,
                            borderColor: borderColor,
                            backgroundColor: bg,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <View style={{ 
                            width: 24, height: 24, borderRadius: 12, 
                            backgroundColor: badgeBg, alignItems: 'center', justifyContent: 'center' 
                          }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: badgeText }}>
                              {OPTION_LABELS[optIdx]}
                            </Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, color: colors.foreground }}>{opt}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={{ 
                    flexDirection: 'row', 
                    padding: 10, 
                    backgroundColor: colors.muted + '20', 
                    borderRadius: 10,
                    marginBottom: hasExplanation ? 10 : 0
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase' }}>Your Answer</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isUnattempted ? colors.mutedForeground : isCorrect ? colors.success : colors.destructive }}>
                        {isUnattempted ? 'Not Attempted' : `Option ${OPTION_LABELS[selectedIdx]}`}
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
                    <Pressable
                      onPress={() =>
                        setOpenExplanations((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        paddingVertical: 10,
                        backgroundColor: colors.primary + '10',
                        borderRadius: 10,
                        gap: 6
                      }}
                    >
                      <BookOpen size={16} color={colors.primary} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
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
                        marginTop: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.primary + '30',
                        backgroundColor: colors.card,
                        padding: 12,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 8, textTransform: 'uppercase' }}>
                        Explanation
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 20 }}>{item.explanation}</Text>
                    </View>
                  )}
                </GlassCard>
              );
            })}
          </View>
        )}

        {/* Footer Actions */}
        <View style={{ gap: 12, marginTop: 8 }}>
          <Button variant="primary" style={{ height: 54, borderRadius: 16 }} onPress={() => router.replace('/(auth)/(tabs)/tests' as any)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Home size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Return to Dashboard</Text>
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
