import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import NTATestPlayer, { type QuestionMeta, type NTASubmitData } from '@/components/NTATestPlayer';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { QuizOption } from '@/components/ui/QuizOption';
import { Skeleton } from '@/components/ui/Skeleton';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function PracticeSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();

  const [run, setRun] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadRun = async () => {
      if (!challengeId) {
        setLoadError('Missing run id.');
        setLoading(false);
        return;
      }
      try {
        setLoadError(null);
        const res = await apiService.curriculum.getRun(String(challengeId));
        if (res.data?.success) {
          const payload = res.data.data || {};
          const runData = payload.run || payload;
          const questionsData = Array.isArray(payload.questions) ? payload.questions : [];
          const initialAnswers = Array.isArray(runData.answers)
            ? runData.answers.map((a: any) => (typeof a === 'number' && a >= 0 ? a : null))
            : new Array(questionsData.length).fill(null);

          setRun({ ...runData, questions: questionsData });
          setAnswers(initialAnswers.length > 0 ? initialAnswers : new Array(questionsData.length).fill(null));
          setCurrentIndex(Number(runData.currentIndex || 0));
          setElapsed(Number(runData.elapsedSeconds || 0));
        } else {
          setLoadError('Unable to load test run.');
        }
      } catch (err: any) {
        setLoadError(err?.response?.data?.message || 'Unable to load test run.');
      } finally {
        setLoading(false);
      }
    };
    loadRun();
  }, []);

  const questions = run?.questions || [];
  const currentQ = questions[currentIndex];
  const isPracticeMode = run?.mode === 'practice';
  const isTestMode = run?.mode === 'test';

  useEffect(() => {
    if (!isPracticeMode) return;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPracticeMode]);

  const getOptions = (q: any): string[] => {
    const raw = q?.options;
    if (Array.isArray(raw)) return raw.map((o) => (typeof o === 'string' ? o : String(o?.text || o?.value || o || '')));
    if (raw && typeof raw === 'object') return ['A', 'B', 'C', 'D'].map((k) => String(raw[k] || ''));
    return [];
  };

  const getCorrectIndex = (q: any): number => {
    if (typeof q?.correctOption === 'number') return q.correctOption;
    if (typeof q?.answer === 'number') return q.answer;
    const key = String(q?.correct_option || q?.correctAnswer || '').trim().toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(key)) return key.charCodeAt(0) - 65;
    return -1;
  };

  const handleSelectAnswer = (optionIndex: number) => {
    if (showResult && isPracticeMode) return;
    const updated = [...answers];
    updated[currentIndex] = optionIndex;
    setAnswers(updated);

    if (isPracticeMode) {
      setShowResult(true);
    }

    // Save progress
    apiService.curriculum.saveRunProgress(challengeId, {
      currentIndex,
      answers: [...updated],
      elapsedSeconds: elapsed,
    }).catch(() => {});
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setShowResult(false);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setShowResult(false);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const res = await apiService.curriculum.submitRun(challengeId, {
        answers,
        elapsedSeconds: elapsed,
      });
      if (res.data?.success) {
        const result = res.data.data;
        router.replace({
          pathname: '/(auth)/quiz/results',
          params: {
            score: String(result?.correctAnswers || 0),
            total: String(questions.length),
            timeTaken: String(elapsed),
          },
        } as any);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAbandon = () => {
    Alert.alert('Quit Practice?', 'Your progress will be lost.', [
      { text: 'Cancel' },
      {
        text: 'Quit', style: 'destructive', onPress: async () => {
          if (timerRef.current) clearInterval(timerRef.current);
          try { await apiService.curriculum.abandonRun(challengeId); } catch {}
          router.back();
        },
      },
    ]);
  };

  const buildInitialMeta = (): QuestionMeta[] => {
    const runAnswers: (number | null)[] = Array.isArray(run?.answers)
      ? run.answers.map((a: any) => (typeof a === 'number' && a >= 0 ? a : null))
      : [];
    return (questions || []).map((_: any, idx: number) => {
      const selected = runAnswers[idx] ?? null;
      return {
        state: selected === null ? 'not-answered' : 'answered',
        selectedOption: selected,
        bookmarked: false,
        note: '',
        timeSpent: 0,
      } as QuestionMeta;
    });
  };

  const handleNtaAnswerChange = async (questionIndex: number, answer: number | null, meta: QuestionMeta) => {
    if (!challengeId) return;
    const updated = Array.isArray(answers) ? [...answers] : new Array(questions.length).fill(null);
    updated[questionIndex] = answer;
    setAnswers(updated);
    try {
      await apiService.curriculum.saveRunProgress(String(challengeId), {
        currentIndex: questionIndex,
        answers: updated,
        elapsedSeconds: elapsed,
      });
    } catch {}
  };

  const handleNtaSubmit = async (data: NTASubmitData) => {
    if (!challengeId) return;
    setSubmitting(true);
    let correct = 0;
    let incorrect = 0;
    const total = questions.length;

    questions.forEach((q: any, i: number) => {
      const selected = data.answers[i];
      if (selected === null) return;
      const correctIdx = getCorrectIndex(q);
      if (correctIdx !== -1 && selected === correctIdx) correct++;
      else incorrect++;
    });
    const skipped = total - correct - incorrect;

    const reviewQuestions = questions.map((q: any, i: number) => ({
      _id: q._id || q.id || i,
      question: q.question || q.text || '',
      options: Array.isArray(q.options) ? q.options : (q.options || {}),
      correctAnswer: getCorrectIndex(q),
      explanation: q.explanation || '',
      userAnswer: data.answers[i],
    }));

    const subjectWise = [{
      subject: run?.subject || 'General',
      correct,
      total,
      accuracy: total > 0 ? (correct / total) * 100 : 0,
    }];

    const chapterWise = [{
      chapter: run?.topic || 'General',
      subject: run?.subject || 'General',
      correct,
      total,
      accuracy: total > 0 ? (correct / total) * 100 : 0,
    }];

    try {
      const res = await apiService.curriculum.submitRun(String(challengeId), {
        answers: data.answers,
        elapsedSeconds: data.timeTaken,
      });
      if (res.data?.success) {
        router.replace({
          pathname: '/(auth)/quiz/results',
          params: {
            title: String(run?.subTopic || run?.topic || 'Curriculum Test'),
            score: String(correct),
            correct: String(correct),
            incorrect: String(incorrect),
            skipped: String(skipped),
            total: String(total),
            timeTaken: String(data.timeTaken),
            totalMarks: String(total * 4),
            marksObtained: String(correct * 4 - incorrect),
            subjectWise: JSON.stringify(subjectWise),
            chapterWise: JSON.stringify(chapterWise),
            reviewQuestions: JSON.stringify(reviewQuestions),
            ntaMeta: JSON.stringify(data.meta),
            weakAreas: JSON.stringify([]),
          },
        } as any);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const getOptionState = (optionIndex: number) => {
    if (!showResult || !isPracticeMode) {
      return answers[currentIndex] === optionIndex ? 'selected' : 'default';
    }
    const correctIndex = getCorrectIndex(currentQ);
    if (optionIndex === correctIndex) return 'correct';
    if (answers[currentIndex] === optionIndex) return 'incorrect';
    return 'default';
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={40} borderRadius={8} />
          <Skeleton height={200} borderRadius={12} />
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={60} borderRadius={12} />)}
        </View>
      </View>
    );
  }

  if (loadError || !run) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground }}>Test Session</Text>
        </View>
        <GlassCard style={{ marginTop: 16, alignItems: 'center', gap: 10 }}>
          <Text style={{ color: colors.destructive, fontSize: 14, textAlign: 'center' }}>
            {loadError || 'Unable to load test run.'}
          </Text>
          <Button variant="outline" onPress={() => router.back()}>
            Back
          </Button>
        </GlassCard>
      </View>
    );
  }

  if (isTestMode) {
    const ntaQuestions = (questions || []).map((q: any) => ({
      id: String(q?._id || q?.questionId || q?.id || ''),
      question: q?.question || q?.text || '',
      options: Array.isArray(q?.options) ? q.options : (q?.options || {}),
      correctAnswer: getCorrectIndex(q),
      explanation: q?.explanation || '',
    }));
    const duration = Number(run?.remainingSeconds || run?.totalQuestions * 90 || 5400);

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <NTATestPlayer
          questions={ntaQuestions}
          title={String(run?.subTopic || run?.topic || 'Curriculum Test')}
          duration={duration > 0 ? duration : 5400}
          initialMeta={buildInitialMeta()}
          onAnswerChange={handleNtaAnswerChange}
          onSubmit={handleNtaSubmit}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={handleAbandon} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>
              Q {currentIndex + 1}/{questions.length}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color={colors.warning} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.warning }}>{formatTime(elapsed)}</Text>
          </View>
        </View>
        <Progress value={questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0} style={{ marginBottom: 8 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {currentQ && (
          <>
            <GlassCard style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.foreground, lineHeight: 24, fontFamily: 'Inter_500Medium' }}>
                {currentQ.question || currentQ.text}
              </Text>
            </GlassCard>

            <View style={{ gap: 10 }}>
              {getOptions(currentQ).map((opt: any, i: number) => (
                <QuizOption
                  key={i}
                  label={OPTION_LABELS[i]}
                  text={typeof opt === 'string' ? opt : (opt.text || opt.value || String(opt))}
                  state={getOptionState(i) as any}
                  onPress={() => handleSelectAnswer(i)}
                  disabled={showResult && isPracticeMode}
                />
              ))}
            </View>

            {showResult && isPracticeMode && currentQ.explanation && (
              <GlassCard style={{ marginTop: 16, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Explanation
                </Text>
                <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>
                  {currentQ.explanation}
                </Text>
              </GlassCard>
            )}
          </>
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingHorizontal: 16, paddingBottom: insets.bottom + 16, paddingTop: 12,
          backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
          flexDirection: 'row', gap: 12,
        }}
      >
        <Pressable onPress={handlePrev} disabled={currentIndex === 0}
          style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, opacity: currentIndex === 0 ? 0.4 : 1 }}>
          <ChevronLeft size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          {currentIndex === questions.length - 1 ? (
            <Button onPress={handleSubmit} loading={submitting}>Submit</Button>
          ) : isPracticeMode && showResult ? (
            <Button onPress={handleNext}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Next</Text>
                <ChevronRight size={18} color="#fff" />
              </View>
            </Button>
          ) : !isPracticeMode ? (
            <Button onPress={handleNext}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Next</Text>
                <ChevronRight size={18} color="#fff" />
              </View>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Select an answer</Text>
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}
