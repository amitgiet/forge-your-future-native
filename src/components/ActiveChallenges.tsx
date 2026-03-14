import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Calendar, Flame, Target, Lock, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiService } from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';

interface ChallengeSchedule {
  completed?: number;
  target?: number;
  locked?: boolean;
}

interface Challenge {
  _id: string;
  title: string;
  subject?: string;
  status: string;
  duration?: number;
  currentDay?: number;
  streak?: number;
  progress?: number;
  todaySchedule?: ChallengeSchedule;
}

export const ActiveChallenges = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      try {
        const res = await apiService.challenges.getUserChallenges();
        const all: Challenge[] = res.data?.data || res.data || [];
        if (mounted) {
          setChallenges(all.filter((c) => c.status === 'active'));
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };

    fetch();
    return () => { mounted = false; };
  }, []);

  if (loading || challenges.length === 0) {
    return null;
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400 }}
    >
      <View style={{ gap: 12 }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '700',
            color: colors.foreground,
            fontFamily: 'Inter_700Bold',
          }}
        >
          Active Challenges
        </Text>

        {challenges.map((challenge) => {
          const progressPercent =
            challenge.progress ??
            (challenge.duration && challenge.currentDay
              ? Math.round((challenge.currentDay / challenge.duration) * 100)
              : 0);

          const schedule = challenge.todaySchedule;
          const isLocked = schedule?.locked === true;

          return (
            <Pressable
              key={challenge._id}
              onPress={() =>
                router.push(`/(auth)/practice/session/${challenge._id}` as any)
              }
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <GlassCard>
                {/* Title + Subject */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: colors.foreground,
                        fontFamily: 'Inter_600SemiBold',
                      }}
                      numberOfLines={1}
                    >
                      {challenge.title}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {challenge.subject && (
                      <Badge variant="secondary">{challenge.subject}</Badge>
                    )}
                    <ChevronRight size={18} color={colors.mutedForeground} />
                  </View>
                </View>

                {/* Day + Streak Row */}
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 16,
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} color={colors.primary} />
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.mutedForeground,
                        fontFamily: 'Inter_400Regular',
                      }}
                    >
                      Day {challenge.currentDay ?? 1}
                      {challenge.duration ? `/${challenge.duration}` : ''}
                    </Text>
                  </View>

                  {challenge.streak != null && challenge.streak > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Flame size={14} color={colors.warning} />
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.mutedForeground,
                          fontFamily: 'Inter_400Regular',
                        }}
                      >
                        {challenge.streak} streak
                      </Text>
                    </View>
                  )}
                </View>

                {/* Progress Bar */}
                <Progress value={progressPercent} style={{ marginBottom: 10 }} />

                {/* Today's Schedule */}
                {schedule && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isLocked ? (
                      <>
                        <Lock size={14} color={colors.mutedForeground} />
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.mutedForeground,
                            fontFamily: 'Inter_400Regular',
                          }}
                        >
                          Locked
                        </Text>
                      </>
                    ) : (
                      <>
                        <Target size={14} color={colors.success} />
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.mutedForeground,
                            fontFamily: 'Inter_400Regular',
                          }}
                        >
                          {schedule.completed ?? 0}/{schedule.target ?? 0} quizzes
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </GlassCard>
            </Pressable>
          );
        })}
      </View>
    </MotiView>
  );
};

export default ActiveChallenges;
