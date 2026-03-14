import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Target, Clock, Zap, Trophy, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiService } from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { StatIcon } from '@/components/ui/StatIcon';
import { Button } from '@/components/ui/Button';

interface DailyChallenge {
  _id: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  xpReward?: number;
  timeLimit?: number;
  icon?: string;
  completed?: boolean;
  score?: number;
  totalQuestions?: number;
}

const MOCK_CHALLENGE: DailyChallenge = {
  _id: 'mock',
  subject: 'Physics',
  topic: 'Kinematics',
  difficulty: 'Medium',
  xpReward: 50,
  timeLimit: 15,
  icon: '⚡',
};

const difficultyVariant = (d?: string): 'success' | 'warning' | 'primary' => {
  if (!d) return 'primary';
  const lower = d.toLowerCase();
  if (lower === 'easy') return 'success';
  if (lower === 'hard') return 'warning';
  return 'primary';
};

export const DailyChallengeCard = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchChallenge = async () => {
      try {
        const res = await apiService.dailyChallenge.getTodaysChallenge();
        if (mounted) {
          setChallenge(res.data?.data || res.data);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError(true);
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

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400 }}
    >
      <GlassCard>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <StatIcon color={colors.warning}>
              <Target size={20} color={colors.warning} />
            </StatIcon>
            <View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: colors.foreground,
                  fontFamily: 'Inter_700Bold',
                }}
              >
                Daily DPP
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.mutedForeground,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                Same for everyone!
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/(auth)/leaderboard')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: colors.warning + '12',
            }}
          >
            <Trophy size={14} color={colors.warning} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: colors.warning,
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              Leaderboard
            </Text>
          </Pressable>
        </View>

        {/* Challenge Info */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
          }}
        >
          {challenge.icon ? (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: colors.primary + '12',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 22 }}>{challenge.icon}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1, gap: 4 }}>
            {challenge.subject && (
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: colors.foreground,
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                {challenge.subject}
              </Text>
            )}
            {challenge.topic && (
              <Text
                style={{
                  fontSize: 13,
                  color: colors.mutedForeground,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                {challenge.topic}
              </Text>
            )}
          </View>
          {challenge.difficulty && (
            <Badge variant={difficultyVariant(challenge.difficulty)}>
              {challenge.difficulty}
            </Badge>
          )}
        </View>

        {/* Completed badge */}
        {isCompleted && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: colors.success + '12',
              borderRadius: 10,
              padding: 10,
              marginBottom: 14,
            }}
          >
            <CheckCircle size={18} color={colors.success} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.success,
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              Completed
              {challenge.score != null && challenge.totalQuestions
                ? ` — ${challenge.score}/${challenge.totalQuestions}`
                : ''}
            </Text>
          </View>
        )}

        {/* Stats Row */}
        <View
          style={{
            flexDirection: 'row',
            gap: 16,
            marginBottom: 16,
          }}
        >
          {challenge.timeLimit != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color={colors.mutedForeground} />
              <Text
                style={{
                  fontSize: 13,
                  color: colors.mutedForeground,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                {challenge.timeLimit} min
              </Text>
            </View>
          )}
          {challenge.xpReward != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Zap size={14} color={colors.warning} />
              <Text
                style={{
                  fontSize: 13,
                  color: colors.mutedForeground,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                {challenge.xpReward} XP
              </Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <Button
          variant={isCompleted ? 'outline' : 'primary'}
          onPress={() => router.push('/(auth)/daily-challenge')}
        >
          {isCompleted ? 'View Details' : 'Start DPP'}
        </Button>
      </GlassCard>
    </MotiView>
  );
};

export default DailyChallengeCard;
