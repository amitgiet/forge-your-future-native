import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { gradients, gradientProps } from '@/theme/gradients';

export interface QuizInstructionScreenProps {
  title: string;
  totalQuestions: number;
  totalMarks: number;
  questionTypes: string[];
  showTimer?: boolean;
  duration?: number;
  onStart: () => void;
}

const INSTRUCTIONS = [
  'Read each question carefully before answering.',
  'For MCQ questions, select one correct answer.',
  'For Multiple Select questions, you can select multiple correct answers.',
  'Use the Question Palette to navigate between questions quickly.',
  'You can mark questions for review and return to them later.',
];

const QuizInstructionScreen: React.FC<QuizInstructionScreenProps> = ({
  title,
  totalQuestions,
  totalMarks,
  questionTypes,
  showTimer = false,
  duration = 0,
  onStart,
}) => {
  const { colors } = useTheme();

  const stats = [
    { label: 'Total Questions', value: String(totalQuestions) },
    { label: 'Total Marks', value: String(totalMarks) },
    ...(showTimer && duration > 0
      ? [{ label: 'Minutes', value: String(Math.floor(duration / 60)) }]
      : []),
    { label: 'Question Types', value: questionTypes.join(', ') },
  ];

  const instructions = [
    ...INSTRUCTIONS,
    ...(showTimer ? ['You have limited time to complete the quiz. Time will be monitored.'] : []),
    'Once submitted, your quiz cannot be edited.',
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        style={{ marginBottom: 24 }}
      >
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
          {title}
        </Text>
      </MotiView>

      {/* Quiz Details Card */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 100 }}
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold', marginBottom: 20 }}>
          Quiz Details
        </Text>

        {/* Stats grid — web-equivalent 2-col layout */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                minWidth: '44%',
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary, fontFamily: 'Inter_700Bold', marginBottom: 4 }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </MotiView>

      {/* Instructions Card */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 200 }}
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold', marginBottom: 16 }}>
          Instructions
        </Text>

        <View style={{ gap: 12 }}>
          {instructions.map((inst, idx) => (
            <View key={idx} style={{ flexDirection: 'row', gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: 'Inter_700Bold' }}>
                {idx + 1}.
              </Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 20 }}>
                {inst}
              </Text>
            </View>
          ))}
        </View>
      </MotiView>

      {/* Start Button */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 300 }}
        style={{ marginBottom: 32 }}
      >
        <Pressable
          onPress={onStart}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <LinearGradient
            colors={[...gradients.primary]}
            start={gradientProps.start}
            end={gradientProps.end}
            style={{
              minHeight: 56,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' }}>
              Start Quiz
            </Text>
          </LinearGradient>
        </Pressable>
      </MotiView>
    </ScrollView>
  );
};

export default QuizInstructionScreen;
