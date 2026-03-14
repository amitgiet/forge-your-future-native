import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Zap, Clock, Trophy } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { QuizOption } from '@/components/ui/QuizOption';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function DailyChallengeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [challenge, setChallenge] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [challengeRes, completedRes] = await Promise.allSettled([
          apiService.dailyChallenge.getTodaysChallenge(),
          apiService.dailyChallenge.hasCompletedToday(),
        ]);
        if (completedRes.status === 'fulfilled' && completedRes.value.data?.data?.completed) {
          setCompleted(true);
        }
        if (challengeRes.status === 'fulfilled' && challengeRes.value.data?.success) {
          const data = challengeRes.value.data.data;
          setChallenge(data);
          setAnswers(new Array(data.questions?.length || 0).fill(-1));
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!completed && !loading) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [loading, completed]);

  const questions = challenge?.questions || [];
  const currentQ = questions[currentIndex];

  const handleSelect = (optionIndex: number) => {
    const updated = [...answers];
    updated[currentIndex] = optionIndex;
    setAnswers(updated);
  };

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const res = await apiService.dailyChallenge.submitChallenge({
        challengeId: challenge._id,
        answers,
      });
      if (res.data?.success) {
        setResult(res.data.data);
        setCompleted(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={40} borderRadius={8} />
          <Skeleton height={200} borderRadius={12} />
          <Skeleton height={60} borderRadius={12} />
        </View>
      </View>
    );
  }

  if (completed && !result) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
            <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={24} color={colors.foreground} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Daily Challenge
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <GlassCard style={{ alignItems: 'center', gap: 12, paddingVertical: 32, width: '100%' }}>
            <Trophy size={48} color={colors.warning} />
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Already Completed!
            </Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center' }}>
              You've already completed today's challenge. Come back tomorrow!
            </Text>
            <Button variant="outline" onPress={() => router.push('/(auth)/leaderboard' as any)} style={{ marginTop: 8 }}>
              View Leaderboard
            </Button>
          </GlassCard>
        </View>
      </View>
    );
  }

  if (result) {
    const score = result.score || 0;
    const total = questions.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
            <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={24} color={colors.foreground} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Challenge Results
            </Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}>
          <GlassCard style={{ alignItems: 'center', paddingVertical: 32, gap: 12, marginBottom: 16 }}>
            <Trophy size={48} color={colors.warning} />
            <Text style={{ fontSize: 36, fontWeight: '800', color: pct >= 60 ? colors.success : colors.warning, fontFamily: 'Inter_800ExtraBold' }}>
              {pct}%
            </Text>
            <Text style={{ fontSize: 16, color: colors.foreground, fontWeight: '600' }}>
              {score}/{total} correct
            </Text>
            {result.xpEarned && <Badge variant="success">+{result.xpEarned} XP</Badge>}
          </GlassCard>
          <View style={{ gap: 12 }}>
            <Button onPress={() => router.push('/(auth)/leaderboard' as any)}>View Leaderboard</Button>
            <Button variant="outline" onPress={() => router.back()}>Back to Home</Button>
          </View>
        </ScrollView>
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
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Zap size={18} color={colors.warning} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>
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

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {currentQ && (
          <>
            <GlassCard style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.foreground, lineHeight: 24 }}>
                {currentQ.question || currentQ.text}
              </Text>
            </GlassCard>
            <View style={{ gap: 10 }}>
              {(currentQ.options || []).map((opt: any, i: number) => (
                <QuizOption
                  key={i}
                  label={OPTION_LABELS[i]}
                  text={typeof opt === 'string' ? opt : (opt.text || String(opt))}
                  state={answers[currentIndex] === i ? 'selected' : 'default'}
                  onPress={() => handleSelect(i)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 16, paddingBottom: insets.bottom + 16, paddingTop: 12,
        backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
        flexDirection: 'row', gap: 12,
      }}>
        {currentIndex > 0 && (
          <Button variant="outline" onPress={() => setCurrentIndex(currentIndex - 1)} style={{ paddingHorizontal: 16 }}>
            Prev
          </Button>
        )}
        <View style={{ flex: 1 }}>
          {currentIndex === questions.length - 1 ? (
            <Button onPress={handleSubmit} loading={submitting}>Submit Challenge</Button>
          ) : (
            <Button onPress={() => setCurrentIndex(currentIndex + 1)}>Next</Button>
          )}
        </View>
      </View>
    </View>
  );
}
