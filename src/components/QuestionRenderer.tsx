import React, { useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { QuizOption } from '@/components/ui/QuizOption';
import { GlassCard } from '@/components/ui/GlassCard';
import { CheckCircle, XCircle } from 'lucide-react-native';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QuestionData {
  _id?: string;
  id?: string;
  question: string;
  type: 'mcq' | 'fill-blank' | 'numeric' | 'numerical';
  options?: { A?: string; B?: string; C?: string; D?: string };
  correctAnswer?: string | number;
  explanation?: string;
  tolerance?: number; // for numerical tolerance checking
}

interface QuestionRendererProps {
  question: QuestionData;
  onAnswer?: (answer: string | number | null) => void;
  showResult?: boolean;
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const QuestionRenderer = ({
  question,
  onAnswer,
  showResult = false,
  disabled = false,
}: QuestionRendererProps) => {
  const { colors } = useTheme();

  const [selected, setSelected] = useState<string | null>(null);
  const [textValue, setTextValue] = useState('');

  // Reset state when question changes
  useEffect(() => {
    setSelected(null);
    setTextValue('');
  }, [question._id, question.id]);

  /* ---- MCQ ---- */

  const handleMCQSelect = (option: string) => {
    if (disabled) return;
    const next = selected === option ? null : option;
    setSelected(next);
    onAnswer?.(next);
  };

  const getMCQState = (
    optionKey: string,
  ): 'default' | 'selected' | 'correct' | 'incorrect' => {
    if (showResult) {
      const isCorrect =
        typeof question.correctAnswer === 'string' &&
        question.correctAnswer === optionKey;
      const isSelected = selected === optionKey;
      if (isCorrect) return 'correct';
      if (isSelected && !isCorrect) return 'incorrect';
      return 'default';
    }
    return selected === optionKey ? 'selected' : 'default';
  };

  /* ---- Fill-blank ---- */

  const handleFillBlank = (text: string) => {
    setTextValue(text);
    onAnswer?.(text || null);
  };

  const isFillCorrect = () => {
    if (!showResult || !question.correctAnswer) return null;
    return (
      textValue.trim().toLowerCase() ===
      String(question.correctAnswer).trim().toLowerCase()
    );
  };

  /* ---- Numerical ---- */

  const handleNumerical = (text: string) => {
    setTextValue(text);
    const num = parseFloat(text);
    onAnswer?.(isNaN(num) ? null : num);
  };

  const isNumericalCorrect = () => {
    if (!showResult || question.correctAnswer == null) return null;
    const userNum = parseFloat(textValue);
    if (isNaN(userNum)) return false;
    const correct = Number(question.correctAnswer);
    const tolerance = question.tolerance ?? 0;
    return Math.abs(userNum - correct) <= tolerance;
  };

  /* ---- Render ---- */

  const qType = question.type;

  return (
    <View style={{ gap: 12 }}>
      {/* Question text */}
      <GlassCard>
        <Text
          style={{
            fontSize: 16,
            color: colors.foreground,
            fontFamily: 'Inter_500Medium',
            lineHeight: 24,
          }}
        >
          {question.question}
        </Text>
      </GlassCard>

      {/* MCQ Options */}
      {qType === 'mcq' && question.options && (
        <View style={{ gap: 10 }}>
          {OPTION_LABELS.map((label) => {
            const text = question.options?.[label];
            if (!text) return null;
            return (
              <QuizOption
                key={label}
                label={label}
                text={text}
                state={getMCQState(label)}
                disabled={disabled || showResult}
                onPress={() => handleMCQSelect(label)}
              />
            );
          })}
        </View>
      )}

      {/* Fill-in-the-blank */}
      {qType === 'fill-blank' && (
        <View style={{ gap: 8 }}>
          <TextInput
            value={textValue}
            onChangeText={handleFillBlank}
            placeholder="Type your answer"
            placeholderTextColor={colors.mutedForeground}
            editable={!disabled && !showResult}
            style={{
              minHeight: 48,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              fontFamily: 'Inter_400Regular',
              backgroundColor: colors.input,
              color: colors.foreground,
              borderWidth: showResult ? 2 : 1,
              borderColor: showResult
                ? isFillCorrect()
                  ? colors.success
                  : colors.destructive
                : colors.border,
            }}
          />
          {showResult && question.correctAnswer != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isFillCorrect() ? (
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
                Correct answer: {String(question.correctAnswer)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Numerical */}
      {(qType === 'numeric' || qType === 'numerical') && (
        <View style={{ gap: 8 }}>
          <TextInput
            value={textValue}
            onChangeText={handleNumerical}
            placeholder="Enter numerical answer"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            editable={!disabled && !showResult}
            style={{
              minHeight: 48,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              fontFamily: 'Inter_400Regular',
              backgroundColor: colors.input,
              color: colors.foreground,
              borderWidth: showResult ? 2 : 1,
              borderColor: showResult
                ? isNumericalCorrect()
                  ? colors.success
                  : colors.destructive
                : colors.border,
            }}
          />
          {showResult && question.correctAnswer != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isNumericalCorrect() ? (
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
                Correct answer: {String(question.correctAnswer)}
                {question.tolerance ? ` (±${question.tolerance})` : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Explanation (shown in result mode) */}
      {showResult && question.explanation && (
        <GlassCard
          style={{
            backgroundColor: colors.success + '08',
            borderColor: colors.success + '30',
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
            {question.explanation}
          </Text>
        </GlassCard>
      )}
    </View>
  );
};

export default QuestionRenderer;
