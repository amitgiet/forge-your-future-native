import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Wand2, Play, Clock, ChevronRight, Trophy } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

export default function QuizIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuizzes = async () => {
    try {
      const res = await apiService.quizGenerator.getUserQuizzes(1, 20);
      if (res.data?.success) {
        setQuizzes(res.data.data?.quizzes || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQuizzes();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            My Quizzes
          </Text>
          <Button size="sm" onPress={() => router.push('/(auth)/quiz/generator' as any)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Wand2 size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Generate</Text>
            </View>
          </Button>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <Pressable onPress={() => router.push('/(auth)/quiz/start' as any)} style={{ flex: 1 }}>
            <GlassCard style={{ alignItems: 'center', gap: 8 }}>
              <Play size={24} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>Topic Quiz</Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, textAlign: 'center' }}>Choose a topic</Text>
            </GlassCard>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/quiz/generator' as any)} style={{ flex: 1 }}>
            <GlassCard style={{ alignItems: 'center', gap: 8 }}>
              <Wand2 size={24} color={colors.secondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>AI Quiz</Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, textAlign: 'center' }}>AI-generated</Text>
            </GlassCard>
          </Pressable>
        </View>

        {/* Quiz History */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>
          Recent Quizzes
        </Text>

        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={80} borderRadius={12} />
            ))}
          </View>
        ) : quizzes.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <Trophy size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No quizzes yet</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center' }}>
              Generate your first AI quiz or start a topic quiz!
            </Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 12 }}>
            {quizzes.map((quiz: any) => (
              <Pressable
                key={quiz._id}
                onPress={() => router.push({ pathname: '/(auth)/quiz/results', params: { quizId: quiz._id } } as any)}
              >
                <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                      {quiz.topic || 'Quiz'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Badge variant="outline">{quiz.numberOfQuestions || 0} Qs</Badge>
                      {quiz.level && <Badge variant="primary">L{quiz.level}</Badge>}
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.mutedForeground} />
                </GlassCard>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
