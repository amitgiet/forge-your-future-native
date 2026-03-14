import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Wand2, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function QuizGeneratorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('2');
  const [numQuestions, setNumQuestions] = useState('10');
  const [quizType, setQuizType] = useState('mcq');
  const [generating, setGenerating] = useState(false);

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
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            AI Quiz Generator
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
      </ScrollView>
    </View>
  );
}
