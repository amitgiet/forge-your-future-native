import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
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
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadRun = async () => {
      try {
        const res = await apiService.curriculum.getRun(challengeId);
        if (res.data?.success) {
          const data = res.data.data;
          setRun(data);
          setAnswers(new Array(data.questions?.length || 0).fill(null));
          setCurrentIndex(data.currentIndex || 0);
          setElapsed(data.elapsedSeconds || 0);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    loadRun();
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const questions = run?.questions || [];
  const currentQ = questions[currentIndex];
  const isPracticeMode = run?.mode === 'practice';

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

  const getOptionState = (optionIndex: number) => {
    if (!showResult || !isPracticeMode) {
      return answers[currentIndex] === optionIndex ? 'selected' : 'default';
    }
    const correctIndex = currentQ?.correctOption ?? currentQ?.answer;
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
              {(currentQ.options || []).map((opt: any, i: number) => (
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
