import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  Flame, Star, Trophy, Zap, BookOpen, Brain, Upload, Target,
  Sparkles, FileText, Wand2, BookMarked, Crown, ChevronRight, Lightbulb,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadDueQuestions } from '@/store/slices/neuronzSlice';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatIcon } from '@/components/ui/StatIcon';
import { GlowOrb } from '@/components/ui/GlowOrb';
import ThemeToggle from '@/components/ThemeToggle';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import RevisionWidget from '@/components/RevisionWidget';
import DailyChallengeCard from '@/components/DailyChallengeCard';
import ActiveChallenges from '@/components/ActiveChallenges';
import { gradients, gradientProps } from '@/theme/gradients';

interface TodayProgressStats {
  studyTimeMinutes: number;
  questionsAttempted: number;
  accuracy: number;
  formattedStudyTime?: string;
  chaptersCovered?: number;
  resourcesViewedToday?: number;
  topperStudyMinutes?: number;
}

interface TodayQuestStats {
  hasQuest: boolean;
  challengeId?: string;
  title: string;
  xpReward: number;
  completedQuizzes: number;
  targetQuizzes: number;
  progressPercentage: number;
  stats: {
    minutesStudied: number;
    questions: number;
    accuracy: number;
  };
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
  const [todayQuest, setTodayQuest] = useState<TodayQuestStats>({
    hasQuest: false,
    title: "Today's Quest",
    xpReward: 0,
    completedQuizzes: 0,
    targetQuizzes: 0,
    progressPercentage: 0,
    stats: { minutesStudied: 0, questions: 0, accuracy: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dueCount = dueQuestions?.total || 0;
  const l2Count = dueQuestions?.byLevel?.L2?.length || 0;

  const fetchData = async () => {
    try {
      const [rankRes, profileRes, progressRes, questRes] = await Promise.allSettled([
        apiService.leaderboard.getUserRank(),
        apiService.auth.getProfile(),
        apiService.auth.getTodayProgress(),
        apiService.auth.getTodayQuest(),
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
      if (questRes.status === 'fulfilled' && questRes.value.data?.success) {
        setTodayQuest(questRes.value.data.data);
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

  // Same order as web dashboard
  const quickActions = [
    { icon: Brain, label: 'Revise', sub: dueCount > 0 ? `${dueCount} due (L2: ${l2Count})` : 'Spaced', path: '/(auth)/revision', color: colors.success },
    { icon: Sparkles, label: 'Learn', sub: 'AI Path', path: '/(auth)/learning-paths', color: colors.warning },
    { icon: Upload, label: 'Mock', sub: 'Analyze', path: '/(auth)/mock-analyzer', color: colors.secondary },
    { icon: BookOpen, label: 'NCERT', sub: 'Search', path: '/(auth)/ncert/search', color: colors.primary },
    { icon: FileText, label: 'Mock Tests', sub: 'Series', path: '/(auth)/(tabs)/tests', color: colors.warning },
    { icon: Wand2, label: 'AI Quiz', sub: 'Generate', path: '/(auth)/quiz/generator', color: colors.primary },
    { icon: Target, label: 'Analytics', sub: 'My Stats', path: '/(auth)/analytics', color: colors.secondary },
    { icon: BookMarked, label: 'Formulas', sub: 'Cards', path: '/(auth)/formula-cards', color: colors.primary },
    { icon: Star, label: 'Doubts', sub: 'Forum', path: '/(auth)/doubts', color: colors.success },
  ];

  // Same items as web dashboard (4 items)
  const studyResources = [
    { icon: BookOpen, title: 'Question Bank', desc: 'Biology · Chemistry · Physics topics', color: colors.success, path: '/(auth)/curriculum/browser' },
    { icon: BookMarked, title: 'PYQ Marked Notes', desc: 'Physics, Biology, Chemistry', color: colors.primary, path: '/(auth)/pyq' },
    { icon: Lightbulb, title: 'Important Topics', desc: 'Chapter-wise essentials', color: colors.warning, path: '' },
    { icon: Crown, title: "Toppers' Essentials", desc: 'Expert study guides', color: colors.success, path: '' },
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
                Let's crush today's goals 💪
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
      <GlowOrb color="#0080ff" size={400} top={-200} right={-100} opacity={0.07} />
      <GlowOrb color="#4a42d1" size={300} top={150} left={-100} opacity={0.05} />
      <GlowOrb color="#0080ff" size={250} bottom={150} right={-50} opacity={0.05} />

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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 15 }}>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 }}>
                NEETFORGE
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2, fontFamily: 'Inter_400Regular' }}>
                Let's crush today's goals 💪
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ThemeToggle />
              <Pressable
                onPress={() => router.push('/(auth)/profile' as any)}
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              >
                <LinearGradient
                  colors={[...gradients.primary]}
                  start={gradientProps.start}
                  end={gradientProps.end}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...(shadows?.glowPrimary ?? {}),
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>A</Text>
                </LinearGradient>
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
            { icon: Flame, value: String(userStreak || userRank?.streak || 0), label: t('dashboard.streak'), color: colors.warning },
            { icon: Star, value: String(userRank?.totalXP || 0), label: t('dashboard.score'), color: colors.secondary },
            { icon: Trophy, value: `#${userRank?.rank || '—'}`, label: 'Rank', color: colors.primary },
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
              <Zap size={20} color={colors.warning} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
                Today's Progress
              </Text>
            </View>
            {/* Primary stats */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
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
            {/* Secondary stats row — chapters + resources + toppers */}
            {((todayProgress.chaptersCovered ?? 0) > 0 || (todayProgress.resourcesViewedToday ?? 0) > 0 || (todayProgress.topperStudyMinutes ?? 0) > 0) && (
              <View style={{ flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                {(todayProgress.chaptersCovered ?? 0) > 0 && (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary + '14', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <BookOpen size={14} color={colors.primary} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{todayProgress.chaptersCovered}</Text>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground }}>chapters</Text>
                    </View>
                  </View>
                )}
                {(todayProgress.resourcesViewedToday ?? 0) > 0 && (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warning + '14', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Crown size={14} color={colors.warning} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.warning }}>{todayProgress.resourcesViewedToday}</Text>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground }}>resources</Text>
                    </View>
                  </View>
                )}
                {(todayProgress.topperStudyMinutes ?? 0) > 0 && (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.success + '14', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Star size={14} color={colors.success} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>{todayProgress.topperStudyMinutes}m</Text>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground }}>toppers</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
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

        {/* Quick Actions */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 300, duration: 400, type: 'timing' }}
          style={{ marginBottom: 24 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Zap size={20} color={colors.warning} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Quick Actions
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {quickActions.map((action) => (
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

        {/* Today's Quest */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 350, duration: 400, type: 'timing' }}
          style={{ marginBottom: 24 }}
        >
          <GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Target size={18} color={colors.primary} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {todayQuest.title || "Today's Quest"}
                </Text>
              </View>
              <View style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
                backgroundColor: colors.primary + '18',
                borderWidth: 1, borderColor: colors.primary + '30',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>+{todayQuest.xpReward || 0} XP</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={{ height: 8, borderRadius: 99, overflow: 'hidden', backgroundColor: colors.muted, marginBottom: 10 }}>
              <MotiView
                from={{ width: '0%' }}
                animate={{ width: `${todayQuest.progressPercentage || 0}%` }}
                transition={{ delay: 500, duration: 1200, type: 'timing' }}
                style={{ height: '100%', borderRadius: 99 }}
              >
                <LinearGradient
                  colors={[...gradients.primary]}
                  start={gradientProps.start}
                  end={gradientProps.end}
                  style={{ flex: 1 }}
                />
              </MotiView>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                {todayQuest.completedQuizzes || 0}/{todayQuest.targetQuizzes || 0} quizzes completed
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                {todayQuest.progressPercentage || 0}%
              </Text>
            </View>

            <View style={{ flexDirection: 'row', paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
              {[
                { val: String(todayQuest.stats?.minutesStudied || 0), label: 'mins studied', highlight: false },
                { val: String(todayQuest.stats?.questions || 0), label: 'questions', highlight: false },
                { val: `${todayQuest.stats?.accuracy || 0}%`, label: 'accuracy', highlight: true },
              ].map((item, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: item.highlight ? colors.success : colors.foreground, fontFamily: 'Inter_800ExtraBold' }}>
                    {item.val}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 2 }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </MotiView>

        {/* Study Resources */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 400, duration: 400, type: 'timing' }}
          style={{ marginBottom: 24 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BookMarked size={20} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
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

        {/* Active Challenges */}
        <View style={{ marginBottom: 16 }}>
          <ActiveChallenges />
        </View>

        {/* Revision Widget */}
        <View style={{ marginBottom: 16 }}>
          <RevisionWidget />
        </View>
      </ScrollView>
    </View>
  );
}
