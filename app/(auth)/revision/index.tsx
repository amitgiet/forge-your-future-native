import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { ArrowLeft, Brain } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import NeuronzDashboard from '@/components/NeuronzDashboard';
import NTATestPlayer, { NTAQuestion, NTASubmitData } from '@/components/NTATestPlayer';
import BottomNav from '@/components/BottomNav';
import {
  getMasteryProgress,
  loadDueQuestions,
  loadLevelQuestions,
  reviewBatch,
} from '@/store/slices/neuronzSlice';
import { buildLocalReportAttempt } from '@/lib/testReportAnalytics';
import { setTestReportState } from '@/lib/testReportState';

type LevelQuestion = {
  questionId: string;
  question: string;
  options: string[];
  explanation?: string;
  correctIndex: number | null;
};

const getCorrectIndex = (question: any, options: string[]): number | null => {
  const letter = String(question?.correct_option || '').trim().toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(letter)) return letter.charCodeAt(0) - 65;
  const answerText = String(question?.correct_answer || '').trim().toLowerCase();
  if (!answerText) return null;
  const matched = options.findIndex((opt) => String(opt).trim().toLowerCase() === answerText);
  return matched >= 0 ? matched : null;
};

const normalizeLevelQuestions = (rawQuestions: any[] = []): LevelQuestion[] =>
  rawQuestions
    .map((question) => {
      const options = [
        String(question?.options?.A || ''),
        String(question?.options?.B || ''),
        String(question?.options?.C || ''),
        String(question?.options?.D || ''),
      ];
      return {
        questionId: String(question?.questionId || ''),
        question: String(question?.question || ''),
        options,
        explanation: question?.explanation ? String(question.explanation) : undefined,
        correctIndex: getCorrectIndex(question, options),
      };
    })
    .filter((q) => q.questionId && q.question && q.options.some((opt) => opt.trim().length > 0));

const toNTAQuestion = (question: LevelQuestion, level: number): NTAQuestion => {
  const optionMap = ['A', 'B', 'C', 'D'].reduce((acc, key, index) => {
    acc[key] = question.options[index] || '';
    return acc;
  }, {} as Record<string, string>);

  return {
    _id: question.questionId,
    id: question.questionId,
    questionId: question.questionId,
    type: 'mcq',
    question: question.question,
    explanation: question.explanation || '',
    questionDiagramRefs: [],
    explanationDiagramRefs: [],
    resolvedQuestionDiagrams: [],
    resolvedExplanationDiagrams: [],
    subject: 'neuronz',
    chapter: `Level ${level}`,
    topic: 'Spaced Revision',
    difficulty: '',
    imageUrl: null,
    explanationImageUrl: null,
    imageId: null,
    videoUrl: null,
    correctAnswer: question.correctIndex,
    typeData: {
      options: question.options,
      optionMap,
      correctOption: question.correctIndex !== null ? String.fromCharCode(65 + question.correctIndex) : null,
    },
    isSupported: true,
    unsupportedReason: null,
  };
};

const Revision = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { dueQuestions, isLoading, isLevelLoading, levelQuestions, error } = useAppSelector((state) => state.neuronz);

  const level = Number(params.level);
  const isLevelMode = Number.isInteger(level) && level >= 1 && level <= 7;
  const [sessionMode, setSessionMode] = useState<'all' | '50' | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    if (!isLevelMode) {
      setSessionMode(null);
      setQuizStarted(false);
      return;
    }

    setSessionMode(null);
    setQuizStarted(false);
    void dispatch(loadDueQuestions());
  }, [dispatch, isLevelMode, level]);

  const dueCount = useMemo(() => {
    if (!isLevelMode || !dueQuestions) return 0;
    const levelKey = `L${level}` as keyof typeof dueQuestions.byLevel;
    return dueQuestions.byLevel[levelKey]?.length || 0;
  }, [isLevelMode, dueQuestions, level]);

  useEffect(() => {
    if (!isLevelMode || sessionMode !== null) return;
    setSessionMode(dueCount > 50 ? '50' : 'all');
  }, [isLevelMode, dueCount, sessionMode]);

  useEffect(() => {
    if (!isLevelMode || sessionMode === null) return;
    void dispatch(
      loadLevelQuestions({
        level,
        limit: sessionMode === '50' ? 50 : null,
      })
    );
  }, [dispatch, isLevelMode, level, sessionMode]);

  const normalizedQuestions = useMemo(() => {
    if (!isLevelMode) return [];
    const raw = levelQuestions[level]?.questions || [];
    return normalizeLevelQuestions(raw);
  }, [isLevelMode, levelQuestions, level]);

  const quizQuestions: NTAQuestion[] = useMemo(
    () => normalizedQuestions.map((q) => toNTAQuestion(q, level)),
    [normalizedQuestions, level]
  );

  const batchLimit = sessionMode === '50' ? 50 : null;
  const sessionQuestionCount = quizQuestions.length;
  const remainingAfterSession = Math.max(dueCount - sessionQuestionCount, 0);

  const handleSubmitLevelQuiz = async (data: NTASubmitData) => {
    if (!isLevelMode || normalizedQuestions.length === 0) return;
    const payload: { questionId: string; wasCorrect: boolean; timeSpent?: number }[] = [];

    normalizedQuestions.forEach((question, index) => {
      const answer = data.answers[index];
      if (answer?.kind !== 'mcq' || !Number.isInteger(answer.selectedOption)) return;
      const answerIndex = Number(answer.selectedOption);
      const wasCorrect = question.correctIndex !== null && answerIndex === question.correctIndex;
      payload.push({
        questionId: question.questionId,
        wasCorrect,
        timeSpent: Number(data.meta[index]?.timeSpent || 0),
      });
    });

    if (payload.length > 0) {
      await dispatch(reviewBatch(payload)).unwrap();
      await dispatch(loadDueQuestions());
      await dispatch(getMasteryProgress());
    }

    const attemptData = buildLocalReportAttempt(
      quizQuestions,
      data,
      `NeuronZ Level ${level}`
    );

    const localAttemptId = `revision-${level}-${Date.now()}`;
    setTestReportState(localAttemptId, {
      attemptData,
      questions: quizQuestions,
      meta: data.meta,
      timeTaken: data.timeTaken,
      returnTo: '/(auth)/revision',
      returnLabel: 'Back to Revision',
    });

    router.push({
      pathname: '/(auth)/test/report/[attemptId]',
      params: { attemptId: localAttemptId },
    } as any);
  };

  if (!isLevelMode) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            from={{ opacity: 0, translateY: -16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
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
                  NeuronZ
                </Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: -2, fontFamily: 'Inter_400Regular' }}>
                  Spaced Repetition System
                </Text>
              </View>
            </View>
            <View style={{
              width: 44, height: 44, borderRadius: 16,
              backgroundColor: colors.primary,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={24} color="#fff" />
            </View>
          </MotiView>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 112, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <NeuronzDashboard />
        </ScrollView>
        <BottomNav />
      </View>
    );
  }

  if (isLoading || sessionMode === null || (isLevelLoading && dueCount > 0 && normalizedQuestions.length === 0)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: 16, paddingTop: insets.top + 8 }}>
          <Pressable
            onPress={() => router.replace('/(auth)/revision' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}
          >
            <ArrowLeft size={16} color={colors.mutedForeground} />
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Back</Text>
          </Pressable>
          <View style={{
            backgroundColor: colors.destructive + '18',
            borderWidth: 1, borderColor: colors.destructive + '30',
            borderRadius: 12, padding: 16,
          }}>
            <Text style={{ fontSize: 14, color: colors.destructive }}>{error}</Text>
          </View>
        </View>
        <BottomNav />
      </View>
    );
  }

  if (quizQuestions.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: 16, paddingTop: insets.top + 8 }}>
          <Pressable
            onPress={() => router.replace('/(auth)/revision' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}
          >
            <ArrowLeft size={16} color={colors.mutedForeground} />
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Back</Text>
          </Pressable>
          <View style={{
            backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
            padding: 24, alignItems: 'center', gap: 12,
          }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={28} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
              No Due Questions in L{level}
            </Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
              Come back when questions at this level reach their revision time.
            </Text>
          </View>
        </View>
        <BottomNav />
      </View>
    );
  }

  if (!quizStarted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.replace('/(auth)/revision' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}
          >
            <ArrowLeft size={16} color={colors.mutedForeground} />
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Back</Text>
          </Pressable>

          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} style={{ gap: 16 }}>
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 24 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                NeuronZ Level {level}
              </Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: colors.mutedForeground, lineHeight: 22 }}>
                Use the richer test player while keeping the NeuronZ level progression intact.
              </Text>
            </View>

            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, marginBottom: 16, fontFamily: 'Inter_700Bold' }}>
                Session Details
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: 16 }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary, fontFamily: 'Inter_700Bold' }}>{dueCount}</Text>
                  <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Due Questions</Text>
                </View>
                <View style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: 16 }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary, fontFamily: 'Inter_700Bold' }}>{sessionQuestionCount}</Text>
                  <Text style={{ fontSize: 14, color: colors.mutedForeground }}>This Session</Text>
                </View>
              </View>
              {remainingAfterSession > 0 ? (
                <Text style={{ marginTop: 12, fontSize: 12, color: colors.mutedForeground }}>
                  {remainingAfterSession} questions will remain due for the next batch.
                </Text>
              ) : null}
            </View>

            {dueCount > 50 ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => setSessionMode('50')}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: sessionMode === '50' ? colors.primary : colors.border,
                    backgroundColor: sessionMode === '50' ? colors.primary + '14' : colors.card,
                    padding: 16,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>First 50</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: colors.mutedForeground, lineHeight: 18 }}>
                    Finish a smaller batch first, then continue later.
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSessionMode('all')}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: sessionMode === 'all' ? colors.primary : colors.border,
                    backgroundColor: sessionMode === 'all' ? colors.primary + '14' : colors.card,
                    padding: 16,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>All Due</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: colors.mutedForeground, lineHeight: 18 }}>
                    Load every due question in this level.
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, marginBottom: 12, fontFamily: 'Inter_700Bold' }}>
                Level Logic
              </Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 22 }}>
                Correct answers move up to the next NeuronZ level and get their next revision time from the spaced-repetition logic. Wrong answers stay in the same level and are rescheduled from there.
              </Text>
            </View>

            <Pressable onPress={() => setQuizStarted(true)} style={{ opacity: 1 }}>
              <View style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: 'Inter_700Bold' }}>
                  {batchLimit ? `Start First ${Math.min(batchLimit, sessionQuestionCount || dueCount)}` : `Start All ${sessionQuestionCount || dueCount}`}
                </Text>
              </View>
            </Pressable>
          </MotiView>
        </ScrollView>
        <BottomNav />
      </View>
    );
  }

  return (
    <NTATestPlayer
      questions={quizQuestions}
      title={`NeuronZ Level ${level}`}
      duration={12 * 60 * 60}
      onSubmit={handleSubmitLevelQuiz}
    />
  );
};

export default Revision;
