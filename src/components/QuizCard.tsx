import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Clock, ArrowRight, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { gradients, gradientProps } from '@/theme/gradients';

interface QuizCardProps {
  topic: string;
  duration: number;
  questionsCount: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

const QuizCard = ({ topic, duration, questionsCount, difficulty = 'medium' }: QuizCardProps) => {
  const { colors } = useTheme();
  const router = useRouter();

  const difficultyConfig = {
    easy: { text: colors.success, bg: colors.success + '20', label: 'Easy', xp: '+50 XP' },
    medium: { text: colors.warning, bg: colors.warning + '20', label: 'Medium', xp: '+100 XP' },
    hard: { text: colors.primary, bg: colors.primary + '20', label: 'Hard', xp: '+200 XP' },
  };

  const config = difficultyConfig[difficulty];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400, delay: 100 }}
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
      }}
    >
      {/* Header: badges + XP */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flex: 1, gap: 8 }}>
          {/* Badge row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: colors.primary + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
                Current Topic
              </Text>
            </View>
            <View style={{ backgroundColor: config.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: config.text, fontFamily: 'Inter_600SemiBold' }}>
                {config.label}
              </Text>
            </View>
          </View>
          {/* Topic title */}
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
            {topic}
          </Text>
        </View>

        {/* XP counter */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 4,
          backgroundColor: colors.warning + '20', borderRadius: 8,
          paddingHorizontal: 8, paddingVertical: 4,
        }}>
          <Sparkles size={14} color={colors.warning} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warning, fontFamily: 'Inter_700Bold' }}>
            {config.xp}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Clock size={16} color={colors.mutedForeground} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>
            {duration} min
          </Text>
        </View>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>
          {questionsCount} questions
        </Text>
      </View>

      {/* Start button */}
      <Pressable
        onPress={() => router.push('/(auth)/quiz' as any)}
        style={{ opacity: 1 }}
      >
        <LinearGradient
          colors={[...gradients.primary]}
          start={gradientProps.start}
          end={gradientProps.end}
          style={{
            minHeight: 48, borderRadius: 12, alignItems: 'center',
            justifyContent: 'center', flexDirection: 'row', gap: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>
            Start Quiz
          </Text>
          <ArrowRight size={20} color="#fff" />
        </LinearGradient>
      </Pressable>
    </MotiView>
  );
};

export default QuizCard;
