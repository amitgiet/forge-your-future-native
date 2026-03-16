import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MotiView } from 'moti';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QuizOption } from '@/components/ui/QuizOption';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QuizQuestion {
  _id?: string;
  id?: string;
  question: string;
  type: 'mcq' | 'multiple_select' | 'numerical';
  options?: { A?: string; B?: string; C?: string; D?: string };
  correctAnswer?: string | string[] | number;
  explanation?: string;
  difficulty?: string;
  marks?: number;
}

export interface QuizPlayerConfig {
  positiveMarks?: number;
  negativeMarks?: number;
  showDifficulty?: boolean;
  showMarks?: boolean;
  showExplanations?: boolean;
}

export interface QuizPlayerProps {
  questions: QuizQuestion[];
  title?: string;
  onSubmit?: (data: {
    answers: (string | string[] | number | null)[];
    timeSpent: number;
    markedForReview: number[];
  }) => void | Promise<void>;
  showPalette?: boolean;
  showTimer?: boolean;
  duration?: number; // seconds
  allowReviewMarking?: boolean;
  readOnly?: boolean;
  config?: QuizPlayerConfig;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const QuizPlayer = ({
  questions,
  title,
  onSubmit,
  showPalette = true,
  showTimer = true,
  duration,
  allowReviewMarking = true,
  readOnly = false,
  config,
}: QuizPlayerProps) => {
  const { colors } = useTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | string[] | number | null)[]>(
    () => questions.map(() => null),
  );
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(duration ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [numericalInput, setNumericalInput] = useState('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  // Keep numerical input in sync when navigating questions
  useEffect(() => {
    const current = answers[currentIndex];
    if (questions[currentIndex]?.type === 'numerical' && current != null) {
      setNumericalInput(String(current));
    } else {
      setNumericalInput('');
    }
  }, [currentIndex]);

  /* Timer */
  useEffect(() => {
    if (!showTimer || !duration || readOnly) return;
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [showTimer, duration, readOnly]);

  /* ---- Answer handlers ---- */

  const setAnswer = useCallback(
    (index: number, value: string | string[] | number | null) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    [],
  );

  const handleMCQSelect = (option: string) => {
    if (readOnly) return;
    setAnswer(currentIndex, answers[currentIndex] === option ? null : option);
  };

  const handleMultiSelect = (option: string) => {
    if (readOnly) return;
    const current = (answers[currentIndex] as string[] | null) ?? [];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setAnswer(currentIndex, next.length > 0 ? next : null);
  };

  const handleNumericalChange = (text: string) => {
    setNumericalInput(text);
    const num = parseFloat(text);
    setAnswer(currentIndex, isNaN(num) ? null : num);
  };

  const toggleReview = () => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  /* ---- Submit ---- */

  const handleSubmit = async () => {
    if (isSubmitting || !onSubmit) return;
    setIsSubmitting(true);
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      await onSubmit({
        answers,
        timeSpent,
        markedForReview: Array.from(markedForReview),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---- Derived ---- */

  const q = questions[currentIndex];
  if (!q) return null;

  const isAnswered = answers[currentIndex] != null;
  const totalAnswered = answers.filter((a) => a != null).length;

  const getOptionState = (
    optionKey: string,
  ): 'default' | 'selected' | 'correct' | 'incorrect' => {
    if (readOnly) {
      const correct = q.correctAnswer;
      const userAns = answers[currentIndex];
      const isCorrectOption =
        typeof correct === 'string'
          ? correct === optionKey
          : Array.isArray(correct)
          ? correct.includes(optionKey)
          : false;
      const isSelected =
        typeof userAns === 'string'
          ? userAns === optionKey
          : Array.isArray(userAns)
          ? userAns.includes(optionKey)
          : false;

      if (isCorrectOption) return 'correct';
      if (isSelected && !isCorrectOption) return 'incorrect';
      return 'default';
    }

    const userAns = answers[currentIndex];
    if (q.type === 'multiple_select') {
      return Array.isArray(userAns) && userAns.includes(optionKey)
        ? 'selected'
        : 'default';
    }
    return userAns === optionKey ? 'selected' : 'default';
  };

  /* ---- Render ---- */

  return (
    <View style={{ flex: 1 }}>
      {/* Top bar: title + timer */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        {title ? (
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.foreground,
              fontFamily: 'Inter_700Bold',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : (
          <View />
        )}
        {showTimer && duration ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: timeRemaining < 60 ? colors.destructive + '15' : colors.muted,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Clock
              size={14}
              color={timeRemaining < 60 ? colors.destructive : colors.mutedForeground}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: timeRemaining < 60 ? colors.destructive : colors.foreground,
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              {formatTime(timeRemaining)}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Question header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Badge variant="outline">
            {`Q${currentIndex + 1} / ${questions.length}`}
          </Badge>
          {q.difficulty && config?.showDifficulty !== false && (
            <Badge
              variant={
                q.difficulty === 'easy'
                  ? 'success'
                  : q.difficulty === 'hard'
                  ? 'warning'
                  : 'primary'
              }
            >
              {q.difficulty}
            </Badge>
          )}
        </View>

        {/* Question text */}
        <GlassCard style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 16,
              color: colors.foreground,
              fontFamily: 'Inter_500Medium',
              lineHeight: 24,
            }}
          >
            {q.question}
          </Text>
          {q.marks != null && config?.showMarks !== false && (
            <Text
              style={{
                fontSize: 12,
                color: colors.mutedForeground,
                fontFamily: 'Inter_400Regular',
                marginTop: 8,
              }}
            >
              Marks: +{q.marks}{' '}
              {config?.negativeMarks ? `/ -${config.negativeMarks}` : ''}
            </Text>
          )}
        </GlassCard>

        {/* Options: MCQ / Multiple Select */}
        {(q.type === 'mcq' || q.type === 'multiple_select') && q.options && (
          <View style={{ gap: 10, marginBottom: 16 }}>
            {OPTION_LABELS.map((label) => {
              const text = q.options?.[label];
              if (!text) return null;
              return (
                <QuizOption
                  key={label}
                  label={label}
                  text={text}
                  state={getOptionState(label)}
                  disabled={readOnly}
                  onPress={() =>
                    q.type === 'multiple_select'
                      ? handleMultiSelect(label)
                      : handleMCQSelect(label)
                  }
                />
              );
            })}
          </View>
        )}

        {/* Numerical input */}
        {q.type === 'numerical' && (
          <View style={{ marginBottom: 16 }}>
            <TextInput
              value={numericalInput}
              onChangeText={handleNumericalChange}
              placeholder="Enter your answer"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              editable={!readOnly}
              style={{
                minHeight: 48,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                fontFamily: 'Inter_400Regular',
                backgroundColor: colors.input,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            {readOnly && q.correctAnswer != null && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {answers[currentIndex] != null &&
                Number(answers[currentIndex]) === Number(q.correctAnswer) ? (
                  <CheckCircle size={16} color={colors.success} />
                ) : (
                  <XCircle size={16} color={colors.destructive} />
                )}
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.mutedForeground,
                    fontFamily: 'Inter_400Regular',
                  }}
                >
                  Correct answer: {String(q.correctAnswer)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Explanation (read-only mode or forced show) */}
        {(readOnly || config?.showExplanations) && q.explanation && (
          <GlassCard
            style={{
              backgroundColor: colors.success + '08',
              borderColor: colors.success + '30',
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: colors.success,
                fontFamily: 'Inter_600SemiBold',
                marginBottom: 6,
              }}
            >
              Explanation
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.foreground,
                fontFamily: 'Inter_400Regular',
                lineHeight: 22,
              }}
            >
              {q.explanation}
            </Text>
          </GlassCard>
        )}

        {/* Mark for review */}
        {allowReviewMarking && !readOnly && (
          <Pressable
            onPress={toggleReview}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 8,
              marginBottom: 12,
            }}
          >
            <Flag
              size={16}
              color={
                markedForReview.has(currentIndex)
                  ? colors.warning
                  : colors.mutedForeground
              }
              fill={markedForReview.has(currentIndex) ? colors.warning : 'none'}
            />
            <Text
              style={{
                fontSize: 14,
                color: markedForReview.has(currentIndex)
                  ? colors.warning
                  : colors.mutedForeground,
                fontFamily: 'Inter_500Medium',
              }}
            >
              {markedForReview.has(currentIndex) ? 'Marked for Review' : 'Mark for Review'}
            </Text>
          </Pressable>
        )}

        {/* Question Palette */}
        {showPalette && (
          <GlassCard small style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: colors.mutedForeground,
                fontFamily: 'Inter_600SemiBold',
                marginBottom: 10,
              }}
            >
              Question Palette
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {questions.map((_, idx) => {
                const isCurrent = idx === currentIndex;
                const isReviewed = markedForReview.has(idx);
                const isAns = answers[idx] != null;

                let bg = colors.muted;
                let fg = colors.mutedForeground;
                if (isCurrent) {
                  bg = colors.primary;
                  fg = '#ffffff';
                } else if (isReviewed) {
                  bg = colors.warning + '25';
                  fg = colors.warning;
                } else if (isAns) {
                  bg = colors.success + '25';
                  fg = colors.success;
                }

                return (
                  <Pressable
                    key={idx}
                    onPress={() => setCurrentIndex(idx)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: fg,
                        fontFamily: 'Inter_600SemiBold',
                      }}
                    >
                      {idx + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>
        )}
      </ScrollView>

      {/* Bottom navigation */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
          gap: 10,
        }}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex === 0}
          onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={16} color={colors.foreground} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.foreground,
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              Previous
            </Text>
          </View>
        </Button>

        <Text
          style={{
            fontSize: 13,
            color: colors.mutedForeground,
            fontFamily: 'Inter_500Medium',
          }}
        >
          {totalAnswered}/{questions.length}
        </Text>

        {currentIndex < questions.length - 1 ? (
          <Button
            size="sm"
            onPress={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#ffffff',
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                Next
              </Text>
              <ChevronRight size={16} color="#ffffff" />
            </View>
          </Button>
        ) : !readOnly ? (
          <Button
            size="sm"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Send size={14} color="#ffffff" />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#ffffff',
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                Submit
              </Text>
            </View>
          </Button>
        ) : (
          <View />
        )}
      </View>
    </View>
  );
};

export default QuizPlayer;
