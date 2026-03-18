import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Wand2, Sparkles, ChevronRight, Trophy, Clock, RotateCcw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

export default function QuizGeneratorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, shadows } = useTheme();

  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('2');
  const [numQuestions, setNumQuestions] = useState('10');
  const [quizType, setQuizType] = useState('mcq');
  const [generating, setGenerating] = useState(false);

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuizzes = async () => {
    try {
      const res = await apiService.quizGenerator.getUserQuizzes(1, 10);
      if (res.data?.success) {
        setQuizzes(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQuizzes();
    setRefreshing(false);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      Alert.alert('Enter a topic', 'Please enter a topic to generate a quiz.');
      return;
    }

    setGenerating(true);
    try {
      const res = await apiService.quizGenerator.generateQuiz({
        topic: topic.trim(),
        level: Number(level),
        numberOfQuestions: Number(numQuestions),
        quizType,
      });

      if (res.data?.success) {
        const quiz = res.data.data;
        router.push({
          pathname: '/(auth)/ai-quiz-session',
          params: { quizId: quiz._id },
        } as any);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Sticky Header ── */}
      <View style={{
        paddingTop: insets.top,
        paddingHorizontal: 16,
        paddingBottom: 4,
        backgroundColor: isDark ? colors.background : '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.border + '20' : colors.border,
        zIndex: 10,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 8
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1
              })}
            >
              <ArrowLeft size={20} color={colors.foreground} />
            </Pressable>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                AI Quiz Generator
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: -2, fontFamily: 'Inter_400Regular' }}>
                Create personalized tests
              </Text>
            </View>
          </View>
          <View style={{ padding: 10, borderRadius: 12, backgroundColor: colors.primary + '15' }}>
            <Wand2 size={20} color={colors.primary} />
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Hero */}
        <GlassCard style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 24, gap: 8 }}>
          <View style={{ padding: 16, borderRadius: 20, backgroundColor: colors.secondary + '15', marginBottom: 8 }}>
            <Sparkles size={32} color={colors.secondary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Generate Custom Quiz
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
            Our AI creates NEET-style questions tailored to your chosen topic and difficulty level.
          </Text>
        </GlassCard>

        <View style={{ gap: 20 }}>
          <Input
            label="Topic"
            placeholder="e.g. Cell Division, Organic Chemistry, Optics..."
            value={topic}
            onChangeText={setTopic}
          />

          <Select
            label="Difficulty Level"
            options={[
              { label: 'Easy (Level 1)', value: '1' },
              { label: 'Medium (Level 2)', value: '2' },
              { label: 'Hard (Level 3)', value: '3' },
              { label: 'Expert (Level 4)', value: '4' },
              { label: 'NEET Level (Level 5)', value: '5' },
            ]}
            value={level}
            onValueChange={setLevel}
          />

          <Select
            label="Number of Questions"
            options={[
              { label: '5 Questions', value: '5' },
              { label: '10 Questions', value: '10' },
              { label: '15 Questions', value: '15' },
              { label: '20 Questions', value: '20' },
            ]}
            value={numQuestions}
            onValueChange={setNumQuestions}
          />

          <Select
            label="Quiz Type"
            options={[
              { label: 'Multiple Choice (MCQ)', value: 'mcq' },
              { label: 'Assertion-Reason', value: 'assertion-reason' },
              { label: 'Statement Based', value: 'statement' },
            ]}
            value={quizType}
            onValueChange={setQuizType}
          />

          <Button onPress={handleGenerate} loading={generating} disabled={generating} size="lg">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Wand2 size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                {generating ? 'Generating...' : 'Generate Quiz'}
              </Text>
            </View>
          </Button>
        </View>

        {/* ── My AI Quizzes Section ── */}
        <View style={{ marginTop: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Trophy size={18} color={colors.warning} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                My AI Quizzes
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(auth)/quiz' as any)}>
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>View All</Text>
            </Pressable>
          </View>

          {loadingHistory ? (
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={85} borderRadius={20} />
              ))}
            </View>
          ) : quizzes.length === 0 ? (
            <GlassCard style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.muted + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} color={colors.mutedForeground} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>No AI quizzes yet</Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center' }}>
                Generated quizzes will appear here for you to practice.
              </Text>
            </GlassCard>
          ) : (
            <View style={{ gap: 12 }}>
              {quizzes.map((quiz: any) => (
                <Pressable
                  key={quiz._id}
                  onPress={() => router.push({ pathname: '/(auth)/quiz/results', params: { quizId: quiz._id } } as any)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                >
                  <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, ...shadows.card }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: colors.primary + '10',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Text style={{ fontSize: 18 }}>🎯</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>
                        {quiz.topic || 'Untitled Quiz'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Badge variant="outline" style={{ backgroundColor: colors.background }}>
                          {quiz.numberOfQuestions || 0} Questions
                        </Badge>
                        <Badge variant="primary" style={{ backgroundColor: colors.secondary + '20' }} textStyle={{ color: colors.secondary }}>
                          Level {quiz.level || 2}
                        </Badge>
                      </View>
                    </View>
                    <Pressable 
                      onPress={() => router.push({ pathname: '/(auth)/ai-quiz-session', params: { quizId: quiz._id } } as any)}
                      style={({ pressed }) => ({
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: colors.primary + '10',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.7 : 1
                      })}
                    >
                      <RotateCcw size={18} color={colors.primary} />
                    </Pressable>
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
