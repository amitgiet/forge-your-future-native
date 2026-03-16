import React, { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Brain, ArrowRight, Lock, Zap, Trophy } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { loadDueQuestions, getMasteryProgress } from '@/store/slices/neuronzSlice';

// Matches web exactly
const LEVEL_CONFIG = [
  { level: 1, name: 'Temporary Memory', description: 'After 24 hrs', emoji: '🧠', accent: '#3B82F6' },
  { level: 2, name: 'Short Term (Encoding)', description: 'After 3 days', emoji: '⚡', accent: '#6366F1' },
  { level: 3, name: 'Repeating Short (Neurons)', description: 'After 5 days', emoji: '🔗', accent: '#8B5CF6' },
  { level: 4, name: 'Arriving Long Term', description: 'After 7 days', emoji: '🌟', accent: '#D946EF' },
  { level: 5, name: 'Retaining Long Term', description: 'After 10 days', emoji: '💪', accent: '#EC4899' },
  { level: 6, name: 'Permanent Stage', description: 'After 15 days', emoji: '🏆', accent: '#F97316' },
  { level: 7, name: 'Mastered', description: 'After 30 days', emoji: '👑', accent: '#F59E0B', locked: true },
];

const NeuronzDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { colors } = useTheme();
  const { dueQuestions, isLoading } = useAppSelector((state) => state.neuronz);

  useEffect(() => {
    dispatch(loadDueQuestions());
    dispatch(getMasteryProgress());
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={{ alignItems: 'center', padding: 48 }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleLevelClick = (level: number, totalQuestions: number) => {
    if (totalQuestions === 0 || level === 7) return;
    router.push(`/(auth)/revision?level=${level}` as any);
  };

  const totalCompleted = dueQuestions?.masteredTotal || 0;
  const totalTarget = dueQuestions?.allTotal || 0;
  const progressPercent = totalTarget > 0 ? Math.min(100, (totalCompleted / totalTarget) * 100) : 0;

  return (
    <View style={{ gap: 20 }}>
      {/* Header — matches web: w-11 h-11 rounded-2xl bg-primary */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View style={{
          width: 44, height: 44, borderRadius: 16,
          backgroundColor: colors.primary,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Brain size={24} color="#fff" />
        </View>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
            NeuronZ
          </Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
            Spaced Repetition System
          </Text>
        </View>
      </MotiView>

      {/* Info banner — matches web: bg-primary/5 border border-primary/15 */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 100 }}
        style={{
          backgroundColor: colors.primary + '0D',
          borderWidth: 1,
          borderColor: colors.primary + '26',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <Zap size={14} color={colors.primary} style={{ marginTop: 2 }} />
        <Text style={{ fontSize: 12, color: colors.foreground, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 18, opacity: 0.7 }}>
          Practice questions enter Level 1. Answer correctly to move them up the memory ladder.
        </Text>
      </MotiView>

      {/* Progress Card */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 150 }}
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Trophy size={16} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
              Overall Progress
            </Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: 'Inter_700Bold' }}>
            {totalCompleted}
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>/{totalTarget}</Text>
          </Text>
        </View>

        {/* Progress bar */}
        <View style={{ height: 10, width: '100%', backgroundColor: colors.secondary + '40', borderRadius: 9999, overflow: 'hidden' }}>
          <MotiView
            from={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'timing', duration: 1000, delay: 300 }}
            style={{ height: '100%', backgroundColor: colors.primary, borderRadius: 9999 }}
          />
        </View>
        <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 8, fontFamily: 'Inter_400Regular' }}>
          {progressPercent.toFixed(0)}% mastered · Keep practicing to build strong memory
        </Text>
      </MotiView>

      {/* Level Cards */}
      <View style={{ gap: 12 }}>
        {LEVEL_CONFIG.map((conf, idx) => {
          const levelKey = `L${conf.level}`;
          const totalAtLevel = dueQuestions?.totalByLevel?.[levelKey]?.total || 0;
          const isClickable = totalAtLevel > 0 && !conf.locked;

          return (
            <MotiView
              key={conf.level}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 300, delay: idx * 60 }}
            >
              <Pressable
                onPress={() => handleLevelClick(conf.level, totalAtLevel)}
                disabled={!isClickable}
                style={({ pressed }) => ({
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: pressed && isClickable ? colors.primary + '60' : colors.border,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  opacity: isClickable ? 1 : 0.6,
                })}
              >
                {/* Level indicator */}
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: conf.accent,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 20 }}>{conf.emoji}</Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
                      L{conf.level} · {conf.name}
                    </Text>
                    {conf.locked && <Lock size={14} color={colors.mutedForeground} />}
                  </View>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: 'Inter_400Regular' }}>
                    {conf.description}
                  </Text>
                </View>

                {/* Count + Arrow */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                      {totalAtLevel}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Questions
                    </Text>
                  </View>
                  {isClickable && (
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowRight size={16} color={colors.primary} />
                    </View>
                  )}
                </View>
              </Pressable>
            </MotiView>
          );
        })}
      </View>
    </View>
  );
};

export default NeuronzDashboard;
