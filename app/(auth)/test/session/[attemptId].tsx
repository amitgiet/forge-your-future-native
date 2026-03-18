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

function normalizeQuestion(raw: any): NTAQuestion {
  const rawOptions = Array.isArray(raw?.options) ? raw.options : [];
  const options = rawOptions.length > 0
    ? rawOptions.map((opt: any) => {
        if (typeof opt === 'string') return opt;
        if (opt && typeof opt === 'object') {
          if (typeof opt.text === 'string') return opt.text;
          if (opt.text && typeof opt.text === 'object') return String(opt.text.en || opt.text.hi || '');
          if (typeof opt.value === 'string') return opt.value;
        }
        return '';
      })
    : ['A', 'B', 'C', 'D'].map((key) => {
        const value = raw?.options?.[key];
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object') {
          if (typeof value.text === 'string') return value.text;
          if (value.text && typeof value.text === 'object') return String(value.text.en || value.text.hi || '');
        }
        return '';
      });

  return {
    _id: raw?._id ? String(raw._id) : undefined,
    id: raw?.id ? String(raw.id) : undefined,
    question: typeof raw?.question === 'string'
      ? raw.question
      : String(raw?.question?.en || raw?.question?.hi || ''),
    options,
    correctAnswer: raw?.correctAnswer ?? raw?.correct_option ?? null,
    explanation: typeof raw?.explanation === 'string'
      ? raw.explanation
      : String(raw?.explanation?.en || raw?.explanation?.hi || ''),
    subject: raw?.subject,
    chapter: raw?.chapter || raw?.chapterId,
    topic: raw?.topic || raw?.topicId,
    difficulty: raw?.difficulty,
    imageUrl: raw?.imageUrl,
  };
}

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
        const normalizedQuestions: NTAQuestion[] = rawQuestions.map(normalizeQuestion);

        setTest(testData);
        setQuestions(normalizedQuestions);

        const metaArray: QuestionMeta[] = normalizedQuestions.map(() => ({
          state: 'not-visited',
          selectedOption: null,
          bookmarked: false,
          note: '',
          timeSpent: 0,
        }));

        const savedAnswers = Array.isArray(attemptData?.answers) ? attemptData.answers : [];
        savedAnswers.forEach((ans: any) => {
          const answerQuestionId = ans?.questionId?._id || ans?.questionId;
          const index = normalizedQuestions.findIndex((q: any) => String(q._id || q.id) === String(answerQuestionId));
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
      const submitRes = await apiService.tests.submitTest(attemptId);
      const attempt = submitRes?.data?.data || {};

      let correct = 0;
      let incorrect = 0;
      const total = questions.length;

      questions.forEach((q: any, i: number) => {
        const selected = data.answers[i];
        if (selected === null) return;
        const correctIdx = getCorrectIndex(q);
        if (correctIdx !== -1 && selected === correctIdx) correct++;
        else incorrect++;
      });
      const skipped = Math.max(0, total - correct - incorrect);

      const reviewQuestions = questions.map((q: any, i: number) => ({
        _id: q._id || q.id || i,
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options : (q.options || {}),
        correctAnswer: getCorrectIndex(q),
        explanation: q.explanation || '',
        userAnswer: data.answers[i],
      }));

      const subjectWise = Array.isArray(attempt?.results?.subjectWise) && attempt.results.subjectWise.length > 0
        ? attempt.results.subjectWise
        : [{
            subject: 'General',
            correct,
            total,
            accuracy: total > 0 ? (correct / total) * 100 : 0,
          }];

      const chapterWise = Array.isArray(attempt?.results?.chapterWise) && attempt.results.chapterWise.length > 0
        ? attempt.results.chapterWise
        : [{
            chapter: test?.title || 'Mock Test',
            subject: (Array.isArray(test?.config?.subjects) && test.config.subjects[0]) || 'General',
            correct,
            total,
            accuracy: total > 0 ? (correct / total) * 100 : 0,
          }];

      const weakAreas = Array.isArray(attempt?.weakAreas) ? attempt.weakAreas : [];

      router.replace({
        pathname: '/(auth)/quiz/results',
        params: {
          title: String(test?.title || 'Mock Test'),
          score: String(correct),
          correct: String(correct),
          incorrect: String(incorrect),
          skipped: String(skipped),
          total: String(total),
          timeTaken: String(data.timeTaken),
          totalMarks: String(total * 4),
          marksObtained: String(correct * 4 - incorrect),
          subjectWise: JSON.stringify(subjectWise),
          chapterWise: JSON.stringify(chapterWise),
          reviewQuestions: JSON.stringify(reviewQuestions),
          ntaMeta: JSON.stringify(data.meta),
          weakAreas: JSON.stringify(weakAreas),
        },
      } as any);
    } catch (e) {
      console.error('Failed to submit attempt', e);
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
