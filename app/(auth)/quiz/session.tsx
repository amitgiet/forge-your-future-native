import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { QuizOption } from '@/components/ui/QuizOption';
import { Badge } from '@/components/ui/Badge';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuizSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ topicId?: string; questions?: string; quizId?: string }>();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (params.questions) {
      try {
        const parsed = JSON.parse(params.questions);
        setQuestions(parsed);
        setAnswers(new Array(parsed.length).fill(null));
      } catch {}
    }
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const currentQ = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleSelectAnswer = (option: string) => {
    if (showResult) return;
    const updated = [...answers];
    updated[currentIndex] = option;
    setAnswers(updated);
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

  const handleCheckAnswer = () => {
    if (!answers[currentIndex]) {
      Alert.alert('Select an answer', 'Please choose an option before checking.');
      return;
    }
    setShowResult(true);
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      if (params.topicId) {
        const formattedAnswers = questions.map((q: any, i: number) => ({
          questionId: q._id,
          selectedOption: answers[i],
        }));
        await apiService.ncertSearch.submitTopicQuiz(params.topicId, {
          questionIds: questions.map((q: any) => q._id),
          answers: formattedAnswers,
          timeTaken: elapsed,
        });
      }
      const correct = questions.filter((q: any, i: number) => answers[i] === q.correctAnswer || answers[i] === q.answer).length;
      router.replace({
        pathname: '/(auth)/quiz/results',
        params: {
          score: String(correct),
          total: String(questions.length),
          timeTaken: String(elapsed),
          topicId: params.topicId || '',
        },
      } as any);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getOptionState = (optionKey: string) => {
    if (!showResult) {
      return answers[currentIndex] === optionKey ? 'selected' : 'default';
    }
    const correct = currentQ?.correctAnswer || currentQ?.answer;
    if (optionKey === correct) return 'correct';
    if (answers[currentIndex] === optionKey) return 'incorrect';
    return 'default';
  };

  if (questions.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.mutedForeground }}>Loading questions...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => {
            Alert.alert('Quit Quiz?', 'Your progress will be lost.', [
              { text: 'Cancel' },
              { text: 'Quit', style: 'destructive', onPress: () => router.back() },
            ]);
          }} style={{ padding: 8 }}>
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
        <Progress value={progress} style={{ marginBottom: 8 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: colors.foreground, lineHeight: 24, fontFamily: 'Inter_500Medium' }}>
            {currentQ?.question || currentQ?.text || 'Question'}
          </Text>
        </GlassCard>

        <View style={{ gap: 12 }}>
          {(currentQ?.options || []).map((option: any, i: number) => {
            const optionKey = option.key || OPTION_LABELS[i];
            const optionText = typeof option === 'string' ? option : (option.text || option.value || option);
            return (
              <QuizOption
                key={i}
                label={OPTION_LABELS[i]}
                text={String(optionText)}
                state={getOptionState(optionKey) as any}
                onPress={() => handleSelectAnswer(optionKey)}
                disabled={showResult}
              />
            );
          })}
        </View>

        {showResult && currentQ?.explanation && (
          <GlassCard style={{ marginTop: 16, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Explanation
            </Text>
            <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>
              {currentQ.explanation}
            </Text>
          </GlassCard>
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 16,
          paddingTop: 12,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <Pressable
          onPress={handlePrev}
          disabled={currentIndex === 0}
          style={{
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: currentIndex === 0 ? 0.4 : 1,
          }}
        >
          <ChevronLeft size={20} color={colors.foreground} />
        </Pressable>

        <View style={{ flex: 1 }}>
          {!showResult ? (
            <Button onPress={handleCheckAnswer}>Check Answer</Button>
          ) : currentIndex === questions.length - 1 ? (
            <Button onPress={handleSubmitQuiz} loading={submitting}>Submit Quiz</Button>
          ) : (
            <Button onPress={handleNext}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Next</Text>
                <ChevronRight size={18} color="#fff" />
              </View>
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}
