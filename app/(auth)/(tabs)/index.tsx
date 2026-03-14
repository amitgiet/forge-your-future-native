import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  Flame, Star, Trophy, Zap, BookOpen, Brain, Upload, Target,
  Sparkles, FileText, Wand2, BookMarked, Crown, ChevronRight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadDueQuestions } from '@/store/slices/neuronzSlice';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatIcon } from '@/components/ui/StatIcon';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { GlowOrb } from '@/components/ui/GlowOrb';
import ThemeToggle from '@/components/ThemeToggle';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import RevisionWidget from '@/components/RevisionWidget';
import DailyChallengeCard from '@/components/DailyChallengeCard';
import ActiveChallenges from '@/components/ActiveChallenges';

interface TodayProgressStats {
  studyTimeMinutes: number;
  questionsAttempted: number;
  accuracy: number;
  formattedStudyTime?: string;
  chaptersCovered?: number;
  resourcesViewedToday?: number;
  topperStudyMinutes?: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors, shadows, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { dueQuestions } = useAppSelector((state) => state.neuronz);
  const insets = useSafeAreaInsets();

  const [userRank, setUserRank] = useState<any>(null);
  const [userStreak, setUserStreak] = useState(0);
  const [todayProgress, setTodayProgress] = useState<TodayProgressStats>({
    studyTimeMinutes: 0,
    questionsAttempted: 0,
    accuracy: 0,
    formattedStudyTime: '0m',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dueCount = dueQuestions?.total || 0;
  const l2Count = dueQuestions?.byLevel?.L2?.length || 0;

  const fetchData = async () => {
    try {
      const [rankRes, profileRes, progressRes] = await Promise.allSettled([
        apiService.leaderboard.getUserRank(),
        apiService.auth.getProfile(),
        apiService.auth.getTodayProgress(),
      ]);

      if (rankRes.status === 'fulfilled' && rankRes.value.data?.success) {
        setUserRank(rankRes.value.data.data);
      }
      if (profileRes.status === 'fulfilled' && profileRes.value.data?.success) {
        setUserStreak(Number(profileRes.value.data.data?.gamification?.currentStreak || 0));
      }
      if (progressRes.status === 'fulfilled' && progressRes.value.data?.success) {
        setTodayProgress(progressRes.value.data.data);
      }

      dispatch(loadDueQuestions());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const quickActions = [
    { icon: BookMarked, label: 'Formulas', sub: 'Cards', path: '/(auth)/formula-cards', color: colors.primary },
    { icon: FileText, label: 'Mock Test', sub: 'Series', path: '/(auth)/(tabs)/tests', color: colors.warning },
    { icon: Brain, label: 'Revision', sub: dueCount > 0 ? `${dueCount} due` : 'Spaced', path: '/(auth)/revision', color: colors.success },
    { icon: Wand2, label: 'AI Quiz', sub: 'Generate', path: '/(auth)/quiz/generator', color: colors.primary },
    { icon: Target, label: 'Analytics', sub: 'My Stats', path: '/(auth)/analytics', color: colors.secondary },
    { icon: BookOpen, label: 'NCERT', sub: 'Search', path: '/(auth)/ncert/search', color: colors.primary },
    { icon: Upload, label: 'Mock', sub: 'Analyze', path: '/(auth)/mock-analyzer', color: colors.secondary },
    { icon: Sparkles, label: 'Learn', sub: 'AI Path', path: '/(auth)/learning-paths', color: colors.warning },
    { icon: Star, label: 'Doubts', sub: 'Forum', path: '/(auth)/doubts', color: colors.success },
  ];

  const studyResources = [
    { icon: BookOpen, title: 'Question Bank', desc: 'Biology · Chemistry · Physics', color: colors.success, path: '/(auth)/curriculum/browser' },
    { icon: BookMarked, title: 'PYQ Marked Notes', desc: 'Physics, Biology, Chemistry', color: colors.primary, path: '/(auth)/pyq' },
    { icon: Crown, title: "Toppers' Essentials", desc: 'Expert study guides', color: colors.warning, path: '' },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
                NEETFORGE
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
                Let's crush today's goals
              </Text>
            </View>
            <ThemeToggle />
          </View>
          <DashboardSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <GlowOrb color="#0080ff" size={400} top={-200} right={-100} opacity={0.06} />
      <GlowOrb color="#4a42d1" size={300} top={200} left={-100} opacity={0.05} />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 20, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ duration: 400, type: 'timing' }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 }}>
                NEETFORGE
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2, fontFamily: 'Inter_400Regular' }}>
                Let's crush today's goals
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ThemeToggle />
              <Pressable
                onPress={() => router.push('/(auth)/profile' as any)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 16,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...shadows.glowPrimary,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>A</Text>
              </Pressable>
            </View>
          </View>
        </MotiView>

        {/* Stats Row */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 100, duration: 400, type: 'timing' }}
          style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}
        >
          {[
            { icon: Flame, value: String(userStreak || 0), label: t('dashboard.streak'), color: colors.warning },
            { icon: Star, value: String(userRank?.totalXP || 0), label: t('dashboard.score'), color: colors.secondary },
            { icon: Trophy, value: `#${userRank?.rank || '\u2014'}`, label: 'Rank', color: colors.primary },
          ].map((stat, i) => (
            <GlassCard key={i} small style={{ flex: 1, alignItems: 'center', paddingVertical: 12, gap: 6 }}>
              <StatIcon color={stat.color}>
                <stat.icon size={16} color={stat.color} />
              </StatIcon>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground, fontFamily: 'Inter_800ExtraBold' }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 10, color: colors.mutedForeground, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 }}>
                {stat.label}
              </Text>
            </GlassCard>
          ))}
        </MotiView>

        {/* Today's Progress */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200, duration: 400, type: 'timing' }}
        >
          <GlassCard style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Zap size={16} color={colors.warning} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
                Today's Progress
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { value: todayProgress.formattedStudyTime || `${todayProgress.studyTimeMinutes}m`, label: 'Study Time', color: colors.primary },
                { value: String(todayProgress.questionsAttempted || 0), label: 'Questions', color: colors.success },
                { value: `${todayProgress.accuracy || 0}%`, label: 'Accuracy', color: colors.warning },
              ].map((s, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: s.color, fontFamily: 'Inter_800ExtraBold' }}>
                    {s.value}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </MotiView>

        {/* Daily Challenge Card */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 250, duration: 400, type: 'timing' }}
          style={{ marginBottom: 16 }}
        >
          <DailyChallengeCard />
        </MotiView>

        {/* Revision Widget */}
        <View style={{ marginBottom: 16 }}>
          <RevisionWidget />
        </View>

        {/* Active Challenges */}
        <View style={{ marginBottom: 16 }}>
          <ActiveChallenges />
        </View>

        {/* Quick Actions */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 300, duration: 400, type: 'timing' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Zap size={16} color={colors.warning} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Quick Actions
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {quickActions.map((action, i) => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.path as any)}
                style={({ pressed }) => ({
                  width: '30.5%',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <GlassCard small style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <StatIcon color={action.color} style={{ marginBottom: 8 }}>
                    <action.icon size={20} color={action.color} />
                  </StatIcon>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                    {action.label}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 2 }}>
                    {action.sub}
                  </Text>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        </MotiView>

        {/* Study Resources */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 400, duration: 400, type: 'timing' }}
          style={{ marginTop: 24 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BookMarked size={16} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Study Resources
            </Text>
          </View>
          <View style={{ gap: 12 }}>
            {studyResources.map((resource, i) => (
              <Pressable
                key={i}
                onPress={() => resource.path && router.push(resource.path as any)}
                disabled={!resource.path}
                style={({ pressed }) => ({ opacity: !resource.path ? 0.5 : pressed ? 0.85 : 1 })}
              >
                <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 }}>
                  <View
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: resource.color + '20',
                    }}
                  >
                    <resource.icon size={20} color={resource.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                      {resource.title}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 2 }}>
                      {resource.desc}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={colors.mutedForeground} />
                </GlassCard>
              </Pressable>
            ))}
          </View>
        </MotiView>
      </ScrollView>
    </View>
  );
}
