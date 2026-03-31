import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import NTATestPlayer, { NTAQuestion, NTASubmitData, QuestionMeta } from '@/components/NTATestPlayer';
import { AnswerPayload, normalizeQuestions, answerPayloadFromAttempt, isAnswerPayloadAttempted } from '@/lib/questionNormalization';
import { resolveDiagramMediaForQuestions } from '@/lib/questionMedia';
import { setTestReportState } from '@/lib/testReportState';

function getCorrectIndex(q: any): number {
  if (typeof q?.correctAnswer === 'number' && Number.isFinite(q.correctAnswer)) return q.correctAnswer;
  if (typeof q?.correctAnswer === 'string') {
    const v = q.correctAnswer.trim().toUpperCase();
    if (/^[A-D]$/.test(v)) return v.charCodeAt(0) - 65;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return -1;
}

export default function TestSessionScreen() {
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
        const rawQuestions: any[] = Array.isArray(testData?.questions)
          ? testData.questions
          : Array.isArray(attemptData?.questions)
            ? attemptData.questions
            : [];
        const normalizedQuestions: NTAQuestion[] = await resolveDiagramMediaForQuestions(normalizeQuestions(rawQuestions));

        setTest(testData);
        setQuestions(normalizedQuestions);

        const metaArray: QuestionMeta[] = normalizedQuestions.map(() => ({
          state: 'not-visited',
          answerPayload: null,
          bookmarked: false,
          note: '',
          timeSpent: 0,
        }));

        const savedAnswers = Array.isArray(attemptData?.answers) ? attemptData.answers : [];
        savedAnswers.forEach((ans: any) => {
          const answerQuestionId = ans?.questionId?._id || ans?.questionId;
          const index = normalizedQuestions.findIndex((q: any) => String(q._id || q.id) === String(answerQuestionId));
          if (index === -1) return;
          const answerPayload = answerPayloadFromAttempt(normalizedQuestions[index], ans);

          metaArray[index] = {
            ...metaArray[index],
            answerPayload,
            state: answerPayload && isAnswerPayloadAttempted(answerPayload)
              ? (ans?.isMarkedForReview ? 'answered-marked' : 'answered')
              : 'not-answered',
            timeSpent: Number(ans?.timeSpent || 0),
          };
        });

        setInitialMeta(metaArray);
      } catch (e) {
        console.error('Failed to load attempt', e);
        setError('Failed to load test attempt.');
      } finally {
        setLoading(false);
      }
    };

    loadAttempt();
  }, [attemptId]);

  const handleSubmit = async (data: NTASubmitData) => {
    try {
      await apiService.tests.submitTest(attemptId);
      setTestReportState(String(attemptId), {
        questions,
        meta: data.meta,
        timeTaken: data.timeTaken,
        returnTo: '/(auth)/(tabs)/tests',
        returnLabel: 'Back to Tests',
      });
      router.replace({
        pathname: '/(auth)/test/report/[attemptId]',
        params: { attemptId: String(attemptId) },
      } as any);
    } catch (e) {
      console.error('Failed to submit attempt', e);
      setError('Failed to submit test.');
    }
  };

  const handleAnswerChange = async (questionIndex: number, answer: AnswerPayload | null, meta: QuestionMeta) => {
    try {
      const question = questions[questionIndex] as any;
      if (!question?._id) return;

      let selectedOption = '';
      if (answer?.kind === 'mcq' && answer.selectedOption !== null) {
        selectedOption = String.fromCharCode(65 + answer.selectedOption);
      }

      await apiService.tests.saveAnswer(String(attemptId), {
        questionId: question._id,
        answerType: answer?.kind || question.type,
        answerPayload: answer,
        selectedOption: selectedOption || null,
        timeSpent: meta.timeSpent,
        isMarkedForReview: meta.state === 'marked-review' || meta.state === 'answered-marked',
      });
    } catch (e) {
      console.error('Failed to save answer', e);
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
      title={test?.title || 'Mock Test'}
      duration={durationSeconds}
      onSubmit={handleSubmit}
      onAnswerChange={handleAnswerChange}
      initialMeta={initialMeta}
    />
  );
}
