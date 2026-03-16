import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { ArrowLeft, CheckCircle2, Brain } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import NeuronzDashboard from '@/components/NeuronzDashboard';
import QuizPlayer, { QuizQuestion } from '@/components/QuizPlayer';
import {
  getMasteryProgress,
  loadDueQuestions,
  loadLevelQuestions,
  reviewBatch,
} from '@/store/slices/neuronzSlice';

// Same helper functions as web — no changes
type LevelQuestion = {
  questionId: string;
  question: string;
  options: string[];
  explanation?: string;
  correctIndex: number | null;
};

type AttemptSummary = {
  attempted: number;
  correct: number;
  total: number;
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

const Revision = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLevelLoading, levelQuestions, error } = useAppSelector((state) => state.neuronz);

  const level = Number(params.level);
  const isLevelMode = Number.isInteger(level) && level >= 1 && level <= 7;
  const [summary, setSummary] = useState<AttemptSummary | null>(null);

  useEffect(() => {
    if (!isLevelMode) return;
    void dispatch(loadLevelQuestions(level));
  }, [dispatch, isLevelMode, level]);

  const normalizedQuestions = useMemo(() => {
    if (!isLevelMode) return [];
    const raw = levelQuestions[level]?.questions || [];
    return normalizeLevelQuestions(raw);
  }, [isLevelMode, levelQuestions, level]);

  const quizQuestions: QuizQuestion[] = useMemo(
    () =>
      normalizedQuestions.map((q) => ({
        id: q.questionId,
        question: q.question,
        type: 'mcq',
        options: q.options,
        correctAnswer: q.correctIndex ?? undefined,
        explanation: q.explanation,
      })),
    [normalizedQuestions]
  );

  const handleSubmitLevelQuiz = async (data: { answers: (number | number[] | null)[]; timeTaken: number }) => {
    if (!isLevelMode || normalizedQuestions.length === 0) return;
    const payload: { questionId: string; wasCorrect: boolean }[] = [];
    let attempted = 0;
    let correct = 0;

    normalizedQuestions.forEach((question, index) => {
      const answer = data.answers[index];
      if (typeof answer !== 'number') return;
      attempted += 1;
      const wasCorrect = question.correctIndex !== null && answer === question.correctIndex;
      if (wasCorrect) correct += 1;
      payload.push({ questionId: question.questionId, wasCorrect });
    });

    if (payload.length > 0) {
      await dispatch(reviewBatch(payload)).unwrap();
      await dispatch(loadDueQuestions());
      await dispatch(getMasteryProgress());
    }

    setSummary({ attempted, correct, total: normalizedQuestions.length });
  };

  /* ── Dashboard view (no level param) — same as web */
  if (!isLevelMode) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
      >
        <NeuronzDashboard />
      </ScrollView>
    );
  }

  /* ── Summary view — same as web */
  if (summary) {
    const pct = summary.attempted > 0 ? Math.round((summary.correct / summary.attempted) * 100) : 0;
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8 }}>
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 300 }}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16, borderWidth: 1, borderColor: colors.border,
              padding: 24, marginTop: 32,
              alignItems: 'center', gap: 16,
            }}
          >
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#22c55e20', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={32} color="#22c55e" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
              Level {level} Complete!
            </Text>

            {/* 3-stat grid — same as web */}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              {[
                { value: summary.correct, label: 'Correct', color: colors.foreground },
                { value: summary.attempted, label: 'Attempted', color: colors.foreground },
                { value: `${pct}%`, label: 'Accuracy', color: colors.primary },
              ].map((s, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: colors.muted + '80', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: s.color, fontFamily: 'Inter_700Bold' }}>{s.value}</Text>
                  <Text style={{ fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => router.replace('/(auth)/revision' as any)}
              style={({ pressed }) => ({
                width: '100%', paddingVertical: 12, borderRadius: 12,
                backgroundColor: colors.primary, alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>
                Back to NeuronZ
              </Text>
            </Pressable>
          </MotiView>
        </ScrollView>
      </View>
    );
  }

  /* ── Loading — same as web */
  if (isLevelLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  /* ── Error — same as web */
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
      </View>
    );
  }

  /* ── Empty — same as web */
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
      </View>
    );
  }

  /* ── Quiz player — same props as web */
  return (
    <QuizPlayer
      title={`NeuronZ Level ${level}`}
      questions={quizQuestions}
      showPalette={false}
      showTimer={false}
      allowReviewMarking={false}
      onSubmit={handleSubmitLevelQuiz}
      config={{ showDifficulty: false, showMarks: false, showExplanations: true }}
    />
  );
};

export default Revision;
