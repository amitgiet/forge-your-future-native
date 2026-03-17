import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  Flame, Star, Trophy, Zap, BookOpen, Brain, Upload, Target,
  Sparkles, FileText, Wand2, BookMarked, Crown, ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadDueQuestions } from '@/store/slices/neuronzSlice';
import apiService from '@/lib/apiService';
import ThemeToggle from '@/components/ThemeToggle';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import DailyChallengeCard from '@/components/DailyChallengeCard';
import ActiveChallenges from '@/components/ActiveChallenges';
import RevisionWidget from '@/components/RevisionWidget';
import { gradients, gradientProps } from '@/theme/gradients';
import { GlassCard } from '@/components/ui/GlassCard';

// Matches web TopicSummary interface
interface TopicSummary {
  topicId: string;
  topic: string;
  subject: string;
  totalTracked: number;
  dueNow: number;
  byLevel: { L1: number; L2: number; L3: number; L4: number; L5: number; L6: number; L7: number };
  masteryPercent: number;
  lastActivityAt: string | null;
}

interface TodayProgressStats {
  studyTimeMinutes: number;
  questionsAttempted: number;
  accuracy: number;
  formattedStudyTime?: string;
  chaptersCovered?: number;
  resourcesViewedToday?: number;
  topperStudyMinutes?: number;
}

// Web uses color names mapped to theme tokens
const colorMap: Record<string, string> = {
  primary: 'primary',
  secondary: 'secondary',
  warning: 'warning',
  success: 'success',
};

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const dispatch = useAppDispatch();
  const { dueQuestions } = useAppSelector((state) => state.neuronz);
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const ITEM_MARGIN = 12;
  const ITEM_WIDTH = (SCREEN_WIDTH - 32 - (ITEM_MARGIN * 2)) / 3;

  const [topicSummary, setTopicSummary] = useState<TopicSummary[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  const [userStreak, setUserStreak] = useState(0);
  const [todayProgress, setTodayProgress] = useState<TodayProgressStats>({
    studyTimeMinutes: 0,
    questionsAttempted: 0,
    accuracy: 0,
    formattedStudyTime: '0m',
  });
  const [loading, setLoading] = useState(true);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Same computed values as web (topicSummary takes priority)
  const dueCount = topicSummary.length > 0
    ? topicSummary.reduce((sum, t) => sum + t.dueNow, 0)
    : (dueQuestions?.total || 0);
  const l2Count = topicSummary.length > 0
    ? topicSummary.reduce((sum, t) => sum + (t.byLevel?.L2 || 0), 0)
    : (dueQuestions?.byLevel?.L2?.length || 0);

  const fetchUserRank = async () => {
    try {
      setLoading(true);
      const response = await apiService.leaderboard.getUserRank();
      if (response.data?.success) setUserRank(response.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await apiService.auth.getProfile();
      if (response.data?.success && response.data?.data)
        setUserStreak(Number(response.data.data?.gamification?.currentStreak || 0));
    } catch (e) { console.error(e); }
  };

  const fetchTodayProgress = async () => {
    try {
      const response = await apiService.auth.getTodayProgress();
      if (response.data?.success && response.data?.data)
        setTodayProgress(response.data.data);
    } catch (e) { console.error(e); }
    finally { setProgressLoaded(true); }
  };

  // Web's missing call — now added for parity
  const fetchTopicSummary = async () => {
    try {
      const response = await apiService.neuronz.getTopicSummary();
      if (response.data?.success && response.data?.data?.topics)
        setTopicSummary(response.data.data.topics);
    } catch (e) { console.error(e); }
  };

  const fetchAll = () => {
    fetchUserRank();
    fetchUserProfile();
    fetchTodayProgress();
    fetchTopicSummary();
    dispatch(loadDueQuestions());
  };

  useEffect(() => { fetchAll(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    fetchAll();
    setRefreshing(false);
  };

  // Same quick actions as web (same order)
  const quickActions = [
    { Icon: BookMarked, label: 'Formulas', sub: 'Cards', path: '/(auth)/formula-cards', color: colors.primary },
    { Icon: FileText, label: 'Mock Test', sub: 'Series', path: '/(auth)/(tabs)/tests', color: colors.warning },
    { Icon: Brain, label: 'Revision', sub: dueCount > 0 ? `${dueCount} due (L2: ${l2Count})` : 'Spaced', path: '/(auth)/revision', color: colors.success },
    { Icon: Wand2, label: 'AI Quiz', sub: 'Generate', path: '/(auth)/quiz/generator', color: colors.primary },
    { Icon: Target, label: 'Analytics', sub: 'My Stats', path: '/(auth)/analytics', color: colors.secondary },
    { Icon: BookOpen, label: 'NCERT', sub: 'Search', path: '/(auth)/ncert/search', color: colors.primary },
    { Icon: Upload, label: 'Mock', sub: 'Analyze', path: '/(auth)/mock-analyzer', color: colors.secondary },
    { Icon: Sparkles, label: 'Learn', sub: 'AI Path', path: '/(auth)/learning-paths', color: colors.warning },
    { Icon: Star, label: 'Doubts', sub: 'Forum', path: '/(auth)/doubts', color: colors.success },
  ];

  // Same study resources as web
  const studyResources = [
    { Icon: BookOpen, title: 'Question Bank', description: 'Biology · Chemistry · Physics topics', color: colors.success, path: '/(auth)/curriculum/browser' },
    { Icon: BookMarked, title: 'PYQ Marked Notes', description: 'Physics, Biology, Chemistry', color: colors.primary, path: '/(auth)/pyq' },
    { Icon: Crown, title: "Toppers' Essentials", description: 'Expert study guides', color: colors.warning, path: '' },
  ];

  // Skeleton while loading — same as web
  if (loading && !progressLoaded) {
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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 112 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── matches web structure */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={{ marginBottom: 24 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
              NEETFORGE
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2, fontFamily: 'Inter_400Regular' }}>
              Let's crush today's goals 💪
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemeToggle />
            {/* Avatar button — same as web (initials → navigate /profile) */}
            <Pressable
              onPress={() => router.push('/(auth)/(tabs)/profile' as any)}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <LinearGradient
                colors={[...gradients.primary]}
                start={gradientProps.start}
                end={gradientProps.end}
                style={{ width: 40, height: 40, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' }}>A</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* ── Stats Row (3 cols) ── same as web: Streak / Score / Rank */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            { Icon: Flame, value: userStreak || userRank?.streak || 0, label: 'Streak', color: colors.warning },
            { Icon: Star, value: userRank?.totalXP || 0, label: 'Score', color: colors.secondary },
            { Icon: Trophy, value: `#${userRank?.rank || '—'}`, label: 'Rank', color: colors.primary },
          ].map((stat, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 14,
                alignItems: 'center',
                gap: 6,
                ...shadows.card,
              }}
            >
              <View style={{
                width: 38, height: 38, borderRadius: 22,
                backgroundColor: stat.color + '20',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <stat.Icon size={16} color={stat.color} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </MotiView>

      {/* ── Study Stats Overview (Today's Progress) ── same as web */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 200 }}
        style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          marginBottom: 16,
          ...shadows.card,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Zap size={16} color={colors.warning} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 1 }}>
            Today's Progress
          </Text>
        </View>

        {/* Primary 3-stat grid */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          {[
            { value: todayProgress?.formattedStudyTime || `${todayProgress.studyTimeMinutes}m`, label: 'Study Time', color: colors.primary },
            { value: String(todayProgress.questionsAttempted || 0), label: 'Questions', color: colors.success },
            { value: `${todayProgress.accuracy || 0}%`, label: 'Accuracy', color: colors.warning },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: s.color, fontFamily: 'Inter_700Bold' }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Secondary stats row — same conditional as web */}
        {((todayProgress.chaptersCovered ?? 0) > 0 || (todayProgress.resourcesViewedToday ?? 0) > 0) && (
          <View style={{ flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
            {(todayProgress.chaptersCovered ?? 0) > 0 && (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary + '14', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
                <BookOpen size={14} color={colors.primary} />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: 'Inter_700Bold' }}>{todayProgress.chaptersCovered}</Text>
                  <Text style={{ fontSize: 10, color: colors.mutedForeground }}>chapters</Text>
                </View>
              </View>
            )}
            {(todayProgress.resourcesViewedToday ?? 0) > 0 && (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warning + '14', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Crown size={14} color={colors.warning} />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.warning, fontFamily: 'Inter_700Bold' }}>{todayProgress.resourcesViewedToday}</Text>
                  <Text style={{ fontSize: 10, color: colors.mutedForeground }}>resources</Text>
                </View>
              </View>
            )}
            {(todayProgress.topperStudyMinutes ?? 0) > 0 && (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.success + '14', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Star size={14} color={colors.success} />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.success, fontFamily: 'Inter_700Bold' }}>{todayProgress.topperStudyMinutes}m</Text>
                  <Text style={{ fontSize: 10, color: colors.mutedForeground }}>toppers</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </MotiView>

      {/* ── Daily Challenge Card ── same position as web */}
      <DailyChallengeCard />

      {/* ── Quick Actions ── same 3-col grid as web */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 300 }}
        style={{ marginTop: 24 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Zap size={16} color={colors.warning} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 1 }}>
            Quick Actions
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          {quickActions.map((action, index) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.path as any)}
              style={({ pressed }) => ({
                width: ITEM_WIDTH,
                marginBottom: ITEM_MARGIN,
                marginRight: (index + 1) % 3 === 0 ? 0 : ITEM_MARGIN,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <GlassCard
                style={{
                  alignItems: 'center',
                  width: '100%',
                  justifyContent: 'center',
                  minHeight: 110,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: action.color + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                  }}
                >
                  <action.Icon size={18} color={action.color} />
                </View>

                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: colors.foreground,
                    fontFamily: 'Inter_700Bold',
                    textAlign: 'center',
                  }}
                >
                  {action.label}
                </Text>

                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 10,
                    color: colors.mutedForeground,
                    fontFamily: 'Inter_400Regular',
                    textAlign: 'center',
                    marginTop: 2,
                  }}
                >
                  {action.sub}
                </Text>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      </MotiView>

      {/* ── Study Resources ── same card list as web */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 400 }}
        style={{ marginTop: 24 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <BookMarked size={16} color={colors.primary} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 1 }}>
            Study Resources
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          {studyResources.map((resource, idx) => (
            <Pressable
              key={idx}
              onPress={() => resource.path ? router.push(resource.path as any) : null}
              disabled={!resource.path}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <GlassCard style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: resource.color + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14
                }}>
                  <resource.Icon size={22} color={resource.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                    {resource.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                    {resource.description}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </GlassCard>
            </Pressable>
          ))}
        </View>
      </MotiView>

      {/* ── Active Challenges ── same position as web */}
      <View style={{ marginTop: 24 }}>
        <ActiveChallenges />
      </View>

      {/* ── Revision Widget ── same position as web (last item) */}
      <View style={{ marginTop: 16 }}>
        <RevisionWidget />
      </View>
    </ScrollView>
  );
}
