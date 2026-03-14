import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trophy, Target, Clock, RotateCcw, Home } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';

export default function QuizResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ score?: string; total?: string; timeTaken?: string; quizId?: string; topicId?: string }>();

  const [quizData, setQuizData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const score = Number(params.score || 0);
  const total = Number(params.total || 0);
  const timeTaken = Number(params.timeTaken || 0);
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  useEffect(() => {
    if (params.quizId) {
      setLoading(true);
      apiService.quizGenerator.getQuizStats(params.quizId)
        .then((res) => {
          if (res.data?.success) setQuizData(res.data.data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const getScoreColor = () => {
    if (percentage >= 80) return colors.success;
    if (percentage >= 50) return colors.warning;
    return colors.destructive;
  };

  const getScoreLabel = () => {
    if (percentage >= 90) return 'Excellent!';
    if (percentage >= 80) return 'Great job!';
    if (percentage >= 60) return 'Good effort!';
    if (percentage >= 40) return 'Keep practicing!';
    return 'Needs improvement';
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: 16, gap: 16 }}>
          <Skeleton height={200} borderRadius={16} />
          <Skeleton height={100} borderRadius={12} />
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
            Quiz Results
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Score Card */}
        <GlassCard style={{ alignItems: 'center', paddingVertical: 32, marginBottom: 16 }}>
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              borderWidth: 6,
              borderColor: getScoreColor(),
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 36, fontWeight: '800', color: getScoreColor(), fontFamily: 'Inter_800ExtraBold' }}>
              {percentage}%
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 4 }}>
            {getScoreLabel()}
          </Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
            {score} out of {total} correct
          </Text>
        </GlassCard>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <GlassCard small style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Target size={20} color={colors.primary} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>{score}/{total}</Text>
            <Text style={{ fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 }}>Correct</Text>
          </GlassCard>
          <GlassCard small style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Clock size={20} color={colors.warning} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>{formatTime(timeTaken)}</Text>
            <Text style={{ fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 }}>Time</Text>
          </GlassCard>
          <GlassCard small style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Trophy size={20} color={getScoreColor()} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: getScoreColor() }}>{percentage}%</Text>
            <Text style={{ fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 }}>Score</Text>
          </GlassCard>
        </View>

        {/* Performance Bar */}
        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 12, fontFamily: 'Inter_600SemiBold' }}>
            Performance
          </Text>
          <Progress value={percentage} color={getScoreColor()} height={12} style={{ marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>0%</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>100%</Text>
          </View>
        </GlassCard>

        {/* Actions */}
        <View style={{ gap: 12 }}>
          <Button onPress={() => router.replace('/(auth)/quiz/start' as any)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RotateCcw size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Try Another Quiz</Text>
            </View>
          </Button>
          <Button variant="outline" onPress={() => router.replace('/(auth)/(tabs)' as any)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Home size={18} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600' }}>Back to Home</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
