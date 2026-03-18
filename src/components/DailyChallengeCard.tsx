import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Target, Clock, Zap, Trophy, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { apiService } from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { gradients, gradientProps } from '@/theme/gradients';

interface DailyChallenge {
  _id: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  xpReward?: number;
  timeLimit?: number;
  icon?: string;
  completed?: boolean;
  userScore?: number;
  score?: number;
  totalQuestions?: number;
}

const MOCK_CHALLENGE: DailyChallenge = {
  _id: 'mock',
  subject: 'Biology',
  topic: 'Cell Division - Mitosis',
  difficulty: 'Medium',
  xpReward: 150,
  timeLimit: 10,
  icon: '🧬',
  completed: false,
};

const getDifficultyColors = (d?: string, colors?: any) => {
  if (!d || !colors) return { text: colors?.mutedForeground, bg: colors?.muted + '80', border: colors?.border };
  const lower = d.toLowerCase();
  if (lower === 'easy') return { text: colors.success, bg: colors.success + '18', border: colors.success + '50' };
  if (lower === 'hard') return { text: colors.destructive, bg: colors.destructive + '18', border: colors.destructive + '50' };
  // Medium
  return { text: colors.warning, bg: colors.warning + '18', border: colors.warning + '50' };
};

export const DailyChallengeCard = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchChallenge = async () => {
      try {
        const res = await apiService.dailyChallenge.getTodaysChallenge();
        if (mounted) {
          const data = res.data?.data || res.data;
          setChallenge(data || MOCK_CHALLENGE);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setChallenge(MOCK_CHALLENGE);
          setLoading(false);
        }
      }
    };
    fetchChallenge();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <GlassCard>
        <View style={{ alignItems: 'center', padding: 20 }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </GlassCard>
    );
  }

  if (!challenge) return null;

  const isCompleted = challenge.completed === true;
  const diffColors = getDifficultyColors(challenge.difficulty, colors);

  return (
    <MotiView
    // from={{ opacity: 0, translateY: 20 }}
    // animate={{ opacity: 1, translateY: 0 }}
    // transition={{ type: 'timing', duration: 400 }}
    >
      <GlassCard>
        {/* Decorative background circle — matches web */}
        <View
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: colors.primary + '10',
          }}
        />

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Icon box matching web: w-8 h-8 rounded-lg bg-primary/10 border-2 border-primary/30 */}
            <View style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: colors.primary + '18',
              borderWidth: 2, borderColor: colors.primary + '50',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Target size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                Daily DPP
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                Same for everyone!
              </Text>
            </View>
          </View>

          {/* Leaderboard link — uses secondary color like web */}
          <Pressable
            onPress={() => router.push('/(auth)/leaderboard')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Trophy size={14} color={colors.secondary} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.secondary, fontFamily: 'Inter_600SemiBold' }}>
              Leaderboard
            </Text>
          </Pressable>
        </View>

        {/* Challenge Info — matches web: bg-muted/50 rounded-xl p-3 mb-3 border border-border */}
        <View style={{
          backgroundColor: colors.muted + '80',
          borderRadius: 16,
          padding: 12,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            {challenge.icon ? (
              <Text style={{ fontSize: 30 }}>{challenge.icon}</Text>
            ) : null}
            <View style={{ flex: 1 }}>
              {/* Difficulty + Subject row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {challenge.difficulty && (
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 16,
                    backgroundColor: diffColors.bg,
                    borderWidth: 1, borderColor: diffColors.border,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: diffColors.text }}>{challenge.difficulty}</Text>
                  </View>
                )}
                {challenge.subject && (
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                    {challenge.subject}
                  </Text>
                )}
              </View>
              {/* Topic as bold title */}
              {challenge.topic && (
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold', lineHeight: 20 }}>
                  {challenge.topic}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          {challenge.timeLimit != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={14} color={colors.mutedForeground} />
              <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                {challenge.timeLimit} min
              </Text>
            </View>
          )}
          {challenge.xpReward != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Zap size={14} color={colors.warning} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warning, fontFamily: 'Inter_700Bold' }}>
                +{challenge.xpReward} XP
              </Text>
            </View>
          )}
        </View>

        {/* Action Button — gradient primary for "Start DPP", outline for "View Details" */}
        <Pressable
          onPress={() => router.push('/(auth)/daily-challenge')}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          {isCompleted ? (
            <View style={{
              minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 8,
              borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent',
            }}>
              <Target size={18} color={colors.foreground} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                View Details
              </Text>
              <ChevronRight size={18} color={colors.foreground} />
            </View>
          ) : (
            <LinearGradient
              colors={[...gradients.primary]}
              start={gradientProps.start}
              end={gradientProps.end}
              style={{
                minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 8,
              }}
            >
              <Target size={18} color="#fff" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>
                Start DPP
              </Text>
              <ChevronRight size={18} color="#fff" />
            </LinearGradient>
          )}
        </Pressable>

        {/* Completed score banner — matches web exactly */}
        {isCompleted && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            padding: 12, borderRadius: 16,
            backgroundColor: colors.success + '18',
            borderWidth: 2, borderColor: colors.success + '50',
            marginTop: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 24, height: 24, borderRadius: 16, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.success, fontFamily: 'Inter_700Bold' }}>
                Completed!
              </Text>
            </View>
            {challenge.userScore != null && (
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.success, fontFamily: 'Inter_800ExtraBold' }}>
                {challenge.userScore}/100
              </Text>
            )}
          </View>
        )}
      </GlassCard>
    </MotiView>
  );
};

export default DailyChallengeCard;
