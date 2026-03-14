import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, Flag, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { QuizOption } from '@/components/ui/QuizOption';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function CustomTestSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ attemptId: string }>();

  const [attempt, setAttempt] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadAttempt = async () => {
      try {
        const res = await apiService.tests.getAttempt(params.attemptId);
        if (res.data?.success) {
          const data = res.data.data;
          setAttempt(data);
          setAnswers(new Array(data.questions?.length || 0).fill(null));
          setTimeLeft((data.duration || 30) * 60);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    loadAttempt();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 || loading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  const questions = attempt?.questions || [];
  const currentQ = questions[currentIndex];

  const handleSelectAnswer = async (option: string) => {
    const updated = [...answers];
    updated[currentIndex] = option;
    setAnswers(updated);

    try {
      await apiService.tests.saveAnswer(params.attemptId, {
        questionId: currentQ._id,
        selectedOption: option,
        timeSpent: 0,
        isMarkedForReview: markedForReview.has(currentIndex),
      });
    } catch {}
  };

  const toggleMarkForReview = () => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      await apiService.tests.submitTest(params.attemptId);
      router.replace({
        pathname: '/(auth)/test/report/[attemptId]',
        params: { attemptId: params.attemptId },
      } as any);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={40} borderRadius={8} />
          <Skeleton height={200} borderRadius={12} />
          <Skeleton height={60} borderRadius={12} />
          <Skeleton height={60} borderRadius={12} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => {
            Alert.alert('Quit Test?', 'Your progress will be submitted.', [
              { text: 'Cancel' },
              { text: 'Submit & Exit', style: 'destructive', onPress: handleSubmit },
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
            <Clock size={14} color={timeLeft < 300 ? colors.destructive : colors.warning} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: timeLeft < 300 ? colors.destructive : colors.warning }}>
              {formatTime(timeLeft)}
            </Text>
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
                  state={answers[currentIndex] === (opt.key || OPTION_LABELS[i]) ? 'selected' : 'default'}
                  onPress={() => handleSelectAnswer(opt.key || OPTION_LABELS[i])}
                />
              ))}
            </View>
            <Pressable onPress={toggleMarkForReview} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
              <Badge variant={markedForReview.has(currentIndex) ? 'warning' : 'outline'}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Flag size={12} color={markedForReview.has(currentIndex) ? colors.warning : colors.mutedForeground} />
                  <Text style={{ fontSize: 12, color: markedForReview.has(currentIndex) ? colors.warning : colors.mutedForeground, fontWeight: '600' }}>
                    {markedForReview.has(currentIndex) ? 'Marked' : 'Mark for Review'}
                  </Text>
                </View>
              </Badge>
            </Pressable>
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
        <Pressable onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}
          style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, opacity: currentIndex === 0 ? 0.4 : 1 }}>
          <ChevronLeft size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          {currentIndex === questions.length - 1 ? (
            <Button onPress={() => {
              Alert.alert('Submit Test?', `You answered ${answers.filter(Boolean).length}/${questions.length} questions.`, [
                { text: 'Review', style: 'cancel' },
                { text: 'Submit', onPress: handleSubmit },
              ]);
            }} loading={submitting}>Submit Test</Button>
          ) : (
            <Button onPress={() => setCurrentIndex(currentIndex + 1)}>
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
