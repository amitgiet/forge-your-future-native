import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import NTATestPlayer, { NTAQuestion, NTASubmitData, QuestionMeta } from '@/components/NTATestPlayer';

function optionToIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const clean = value.trim().toUpperCase();
    if (/^[A-D]$/.test(clean)) return clean.charCodeAt(0) - 65;
    const num = Number(clean);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

export default function CustomTestSessionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<NTAQuestion[]>([]);
  const [initialMeta, setInitialMeta] = useState<QuestionMeta[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAttempt = async () => {
      try {
        const res = await apiService.tests.getAttempt(attemptId);
        const attemptData = res.data?.data;
        const testData = attemptData?.testId || attemptData?.test || {};
        const rawQuestions: NTAQuestion[] = Array.isArray(testData?.questions)
          ? testData.questions
          : Array.isArray(attemptData?.questions)
            ? attemptData.questions
            : [];

        setTest(testData);
        setQuestions(rawQuestions);

        const metaArray: QuestionMeta[] = rawQuestions.map(() => ({
          state: 'not-visited',
          selectedOption: null,
          bookmarked: false,
          note: '',
          timeSpent: 0,
        }));

        const savedAnswers = Array.isArray(attemptData?.answers) ? attemptData.answers : [];
        savedAnswers.forEach((ans: any) => {
          const answerQuestionId = ans?.questionId?._id || ans?.questionId;
          const index = rawQuestions.findIndex((q: any) => String(q._id || q.id) === String(answerQuestionId));
          if (index === -1) return;
          const selectedIndex = optionToIndex(ans?.selectedOption);
          if (selectedIndex === null || selectedIndex < 0) return;

          metaArray[index] = {
            ...metaArray[index],
            selectedOption: selectedIndex,
            state: ans?.isMarkedForReview ? 'answered-marked' : 'answered',
            timeSpent: Number(ans?.timeSpent || 0),
          };
        });

        setInitialMeta(metaArray);
      } catch (e) {
        console.error('Failed to load custom attempt', e);
        setError('Failed to load custom test attempt.');
      } finally {
        setLoading(false);
      }
    };

    loadAttempt();
  }, [attemptId]);

  const handleSubmit = async (data: NTASubmitData) => {
    try {
      await apiService.tests.submitTest(attemptId);
      router.replace({
        pathname: '/(auth)/test/report/[attemptId]',
        params: { attemptId: String(attemptId) },
      } as any);
    } catch (e) {
      console.error('Failed to submit custom attempt', e);
      setError('Failed to submit test.');
    }
  };

  const handleAnswerChange = async (questionIndex: number, answer: number | null, meta: QuestionMeta) => {
    try {
      const question = questions[questionIndex] as any;
      if (!question?._id) return;

      await apiService.tests.saveAnswer(String(attemptId), {
        questionId: question._id,
        selectedOption: answer !== null ? String.fromCharCode(65 + answer) : '',
        timeSpent: meta.timeSpent,
        isMarkedForReview: meta.state === 'marked-review' || meta.state === 'answered-marked',
      });
    } catch (e) {
      console.error('Failed to save custom answer', e);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.mutedForeground }}>Loading test...</Text>
      </View>
    );
  }

  if (error || questions.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AlertCircle size={56} color={colors.destructive} />
        <Text style={{ marginTop: 12, color: colors.foreground, fontWeight: '700', fontSize: 18 }}>Error loading test</Text>
        <Text style={{ marginTop: 6, color: colors.mutedForeground, textAlign: 'center' }}>{error || 'No questions available.'}</Text>
      </View>
    );
  }

  const durationSeconds = (Number(test?.config?.duration || test?.duration || 180) || 180) * 60;

  return (
    <NTATestPlayer
      questions={questions}
      title={test?.title || 'Custom Test'}
      duration={durationSeconds}
      onSubmit={handleSubmit}
      onAnswerChange={handleAnswerChange}
      initialMeta={initialMeta}
    />
  );
}
