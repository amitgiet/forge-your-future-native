import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { MotiView } from 'moti';
import {
  User, Flame, Target, BookOpen, Award, Globe, Crown, Zap,
  LogOut, Edit2, Save, ChevronLeft, Shield, Copy, Check,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { apiService } from '@/lib/apiService';
import { gradients, gradientProps } from '@/theme/gradients';

interface ProfileData {
  name: string;
  email: string;
  avatar?: string;
  subscription?: { plan: string; validUntil?: string };
  xp?: number;
  level?: number;
  xpForNextLevel?: number;
  streak?: number;
  mocksTaken?: number;
  accuracy?: number;
  coins?: number;
  referralCode?: string;
  academicInfo?: {
    targetYear?: string;
    studyHours?: string;
    boardPercentage?: string;
    mockScore?: number;
    weakSubjects?: string[];
  };
  achievements?: { id: string; title: string; emoji: string; unlocked: boolean }[];
}

const TARGET_YEARS = ['2027', '2026', 'Dropper'];
const STUDY_HOURS = ['2-3', '4-6', '6+'];
const BOARD_PERCENTAGES = ['<60%', '60-75%', '75-90%', '90+%'];
const WEAK_SUBJECTS = ['Physics', 'Chemistry', 'Biology'];

const DEFAULT_ACHIEVEMENTS = [
  { id: 'streak7', title: '7 Day Streak', emoji: '\uD83D\uDD25', unlocked: false },
  { id: 'firstQuiz', title: 'First Quiz', emoji: '\uD83D\uDCDA', unlocked: false },
  { id: 'accuracy100', title: '100% Accuracy', emoji: '\uD83C\uDFAF', unlocked: false },
  { id: 'top10', title: 'Top 10%', emoji: '\uD83C\uDFC6', unlocked: false },
];

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    name: user?.name || 'User',
    email: user?.email || '',
    avatar: user?.avatar,
    subscription: user?.subscription || { plan: 'free' },
    xp: 0,
    level: 1,
    xpForNextLevel: 100,
    streak: 0,
    mocksTaken: 0,
    accuracy: 0,
    coins: 0,
    referralCode: '',
    academicInfo: {},
    achievements: DEFAULT_ACHIEVEMENTS,
  });

  // Editable fields
  const [editName, setEditName] = useState(profile.name);
  const [editTargetYear, setEditTargetYear] = useState(profile.academicInfo?.targetYear || '');
  const [editStudyHours, setEditStudyHours] = useState(profile.academicInfo?.studyHours || '');
  const [editBoardPct, setEditBoardPct] = useState(profile.academicInfo?.boardPercentage || '');
  const [editMockScore, setEditMockScore] = useState(String(profile.academicInfo?.mockScore || ''));
  const [editWeakSubjects, setEditWeakSubjects] = useState<string[]>(profile.academicInfo?.weakSubjects || []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.auth.getProfile();
      const d = res.data?.user || res.data || {};
      const p: ProfileData = {
        name: d.name || user?.name || 'User',
        email: d.email || user?.email || '',
        avatar: d.avatar || user?.avatar,
        subscription: d.subscription || user?.subscription || { plan: 'free' },
        xp: d.xp ?? d.experience ?? 0,
        level: d.level ?? 1,
        xpForNextLevel: d.xpForNextLevel ?? 100,
        streak: d.streak ?? d.currentStreak ?? 0,
        mocksTaken: d.mocksTaken ?? d.totalMocks ?? 0,
        accuracy: d.accuracy ?? d.avgAccuracy ?? 0,
        coins: d.coins ?? d.neuronz ?? 0,
        referralCode: d.referralCode ?? '',
        academicInfo: d.academicInfo ?? d.profile?.academicInfo ?? {},
        achievements: d.achievements ?? DEFAULT_ACHIEVEMENTS,
      };
      setProfile(p);
      setEditName(p.name);
      setEditTargetYear(p.academicInfo?.targetYear || '');
      setEditStudyHours(p.academicInfo?.studyHours || '');
      setEditBoardPct(p.academicInfo?.boardPercentage || '');
      setEditMockScore(String(p.academicInfo?.mockScore || ''));
      setEditWeakSubjects(p.academicInfo?.weakSubjects || []);
    } catch {
      // fallback to user context data
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiService.auth.updateProfile({
        name: editName,
        academicInfo: {
          targetYear: editTargetYear,
          studyHours: editStudyHours,
          boardPercentage: editBoardPct,
          mockScore: editMockScore ? Number(editMockScore) : undefined,
          weakSubjects: editWeakSubjects,
        },
      });
      setProfile((prev) => ({
        ...prev,
        name: editName,
        academicInfo: {
          targetYear: editTargetYear,
          studyHours: editStudyHours,
          boardPercentage: editBoardPct,
          mockScore: editMockScore ? Number(editMockScore) : undefined,
          weakSubjects: editWeakSubjects,
        },
      }));
      setIsEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyReferral = async () => {
    if (profile.referralCode) {
      await Clipboard.setStringAsync(profile.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleWeakSubject = (subject: string) => {
    setEditWeakSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const xpProgress = profile.xpForNextLevel
    ? Math.min(100, ((profile.xp || 0) / profile.xpForNextLevel) * 100)
    : 0;

  const plan = profile.subscription?.plan || 'free';
  const isFree = plan === 'free';

  const validUntil = profile.subscription?.validUntil
    ? new Date(profile.subscription.validUntil).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Pressable
          onPress={() => {
            if (isEditing) {
              setIsEditing(false);
              setEditName(profile.name);
            }
          }}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: isEditing ? colors.muted : 'transparent' }}
        >
          {isEditing && <ChevronLeft size={22} color={colors.foreground} />}
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
          Profile
        </Text>
        <Pressable
          onPress={() => {
            if (isEditing) {
              handleSave();
            } else {
              setIsEditing(true);
            }
          }}
          disabled={saving}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: isEditing ? colors.primary + '15' : colors.muted,
          }}
        >
          {isEditing ? (
            <Save size={20} color={colors.primary} />
          ) : (
            <Edit2 size={20} color={colors.mutedForeground} />
          )}
        </Pressable>
      </MotiView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500 }}
        >
          <GlassCard style={{ alignItems: 'center', paddingTop: 0, overflow: 'hidden' }}>
            <LinearGradient
              colors={[...gradients.primary]}
              start={gradientProps.start}
              end={gradientProps.end}
              style={{
                width: '100%',
                height: 80,
                alignItems: 'center',
                justifyContent: 'flex-end',
                marginBottom: 40,
              }}
            >
              <View style={{ position: 'absolute', bottom: -36 }}>
                <Avatar name={profile.name} uri={profile.avatar} size={72} />
              </View>
            </LinearGradient>

            {isEditing ? (
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: colors.foreground,
                  fontFamily: 'PlusJakartaSans_700Bold',
                  textAlign: 'center',
                  borderBottomWidth: 2,
                  borderBottomColor: colors.primary,
                  paddingVertical: 4,
                  paddingHorizontal: 16,
                  minWidth: 150,
                }}
              />
            ) : (
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                {profile.name}
              </Text>
            )}

            <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 4 }}>
              {profile.email}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Badge variant={isFree ? 'outline' : 'primary'}>
                {plan.toUpperCase()}
              </Badge>
              {validUntil && (
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                  Valid till {validUntil}
                </Text>
              )}
            </View>
          </GlassCard>
        </MotiView>

        {/* XP Progress */}
        <MotiView
          from={{ opacity: 0, translateX: -20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 100 }}
          style={{ marginTop: 16 }}
        >
          <GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.warning + '15', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={18} color={colors.warning} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                  {profile.xp || 0} XP
                </Text>
              </View>
              <Badge variant="secondary">Level {profile.level || 1}</Badge>
            </View>
            <Progress value={xpProgress} gradient="primary" height={10} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 6, textAlign: 'right' }}>
              {profile.xpForNextLevel ? `${profile.xpForNextLevel - (profile.xp || 0)} XP to next level` : ''}
            </Text>
          </GlassCard>
        </MotiView>

        {/* Stats Grid */}
        <MotiView
          from={{ opacity: 0, translateX: 20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 200 }}
          style={{ marginTop: 16 }}
        >
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 12 }}>
              <StatCard
                icon={Flame}
                label="Streak"
                value={`${profile.streak || 0} days`}
                iconColor={colors.warning}
                bgColor={colors.warning + '15'}
                colors={colors}
              />
              <StatCard
                icon={Target}
                label="Accuracy"
                value={`${profile.accuracy || 0}%`}
                iconColor={colors.success}
                bgColor={colors.success + '15'}
                colors={colors}
              />
            </View>
            <View style={{ flex: 1, gap: 12 }}>
              <StatCard
                icon={BookOpen}
                label="Mocks"
                value={`${profile.mocksTaken || 0}`}
                iconColor={colors.primary}
                bgColor={colors.primary + '15'}
                colors={colors}
              />
              <StatCard
                icon={Award}
                label="Coins"
                value={`${profile.coins || 0}`}
                iconColor={colors.secondary}
                bgColor={colors.secondary + '15'}
                colors={colors}
              />
            </View>
          </View>
        </MotiView>

        {/* Academic Info */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 300 }}
          style={{ marginTop: 16 }}
        >
          <GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Shield size={18} color={colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                Academic Info
              </Text>
            </View>

            {isEditing ? (
              <View style={{ gap: 16 }}>
                {/* Target Year */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8 }}>
                    Target Year
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {TARGET_YEARS.map((yr) => (
                      <Pressable
                        key={yr}
                        onPress={() => setEditTargetYear(yr)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                          backgroundColor: editTargetYear === yr ? colors.primary : colors.muted,
                        }}
                      >
                        <Text style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: editTargetYear === yr ? '#fff' : colors.foreground,
                        }}>
                          {yr}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Study Hours */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8 }}>
                    Study Hours / Day
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {STUDY_HOURS.map((h) => (
                      <Pressable
                        key={h}
                        onPress={() => setEditStudyHours(h)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                          backgroundColor: editStudyHours === h ? colors.primary : colors.muted,
                        }}
                      >
                        <Text style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: editStudyHours === h ? '#fff' : colors.foreground,
                        }}>
                          {h}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Board Percentage */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8 }}>
                    Board %
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {BOARD_PERCENTAGES.map((p) => (
                      <Pressable
                        key={p}
                        onPress={() => setEditBoardPct(p)}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          borderRadius: 10,
                          alignItems: 'center',
                          backgroundColor: editBoardPct === p ? colors.primary : colors.muted,
                        }}
                      >
                        <Text style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: editBoardPct === p ? '#fff' : colors.foreground,
                        }}>
                          {p}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Mock Score */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8 }}>
                    Last Mock Score
                  </Text>
                  <TextInput
                    value={editMockScore}
                    onChangeText={setEditMockScore}
                    keyboardType="numeric"
                    placeholder="Enter score"
                    placeholderTextColor={colors.mutedForeground}
                    style={{
                      minHeight: 44,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      fontSize: 15,
                      backgroundColor: colors.input,
                      color: colors.foreground,
                      borderWidth: 1,
                      borderColor: colors.border,
                      fontFamily: 'Inter_400Regular',
                    }}
                  />
                </View>

                {/* Weak Subjects */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8 }}>
                    Weak Subjects
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {WEAK_SUBJECTS.map((subj) => {
                      const active = editWeakSubjects.includes(subj);
                      return (
                        <Pressable
                          key={subj}
                          onPress={() => toggleWeakSubject(subj)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 10,
                            alignItems: 'center',
                            backgroundColor: active ? colors.destructive + '20' : colors.muted,
                            borderWidth: active ? 1 : 0,
                            borderColor: colors.destructive,
                          }}
                        >
                          <Text style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: active ? colors.destructive : colors.foreground,
                          }}>
                            {subj}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <AcademicRow label="Target Year" value={profile.academicInfo?.targetYear || 'Not set'} colors={colors} />
                <AcademicRow label="Study Hours" value={profile.academicInfo?.studyHours ? `${profile.academicInfo.studyHours} hrs/day` : 'Not set'} colors={colors} />
                <AcademicRow label="Board %" value={profile.academicInfo?.boardPercentage || 'Not set'} colors={colors} />
                <AcademicRow label="Mock Score" value={profile.academicInfo?.mockScore != null ? String(profile.academicInfo.mockScore) : 'Not set'} colors={colors} />
                <AcademicRow
                  label="Weak Subjects"
                  value={profile.academicInfo?.weakSubjects?.length ? profile.academicInfo.weakSubjects.join(', ') : 'None'}
                  colors={colors}
                />
              </View>
            )}
          </GlassCard>
        </MotiView>

        {/* Achievements */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 400 }}
          style={{ marginTop: 16 }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 12, fontFamily: 'Inter_700Bold' }}>
            Achievements
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {(profile.achievements || DEFAULT_ACHIEVEMENTS).map((ach) => (
              <View
                key={ach.id}
                style={{
                  width: '47%',
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                  backgroundColor: ach.unlocked
                    ? (isDark ? 'rgba(26,141,255,0.1)' : 'rgba(0,128,255,0.06)')
                    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                  borderWidth: 1,
                  borderColor: ach.unlocked ? colors.primary + '30' : colors.border,
                  opacity: ach.unlocked ? 1 : 0.5,
                }}
              >
                <Text style={{ fontSize: 28, marginBottom: 6 }}>{ach.emoji}</Text>
                <Text style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: ach.unlocked ? colors.foreground : colors.mutedForeground,
                  textAlign: 'center',
                  fontFamily: 'Inter_600SemiBold',
                }}>
                  {ach.title}
                </Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                  {ach.unlocked ? 'Unlocked' : 'Locked'}
                </Text>
              </View>
            ))}
          </View>
        </MotiView>

        {/* Upgrade CTA (free plan only) */}
        {isFree && (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 500 }}
            style={{ marginTop: 16 }}
          >
            <LinearGradient
              colors={[...gradients.fun]}
              start={gradientProps.start}
              end={gradientProps.end}
              style={{ borderRadius: 14, padding: 20 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Crown size={24} color="#fff" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Go Pro
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 14 }}>
                Unlimited revisions & features
              </Text>
              <Pressable
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary, fontFamily: 'Inter_700Bold' }}>
                  Upgrade Now
                </Text>
              </Pressable>
            </LinearGradient>
          </MotiView>
        )}

        {/* Referral Code */}
        {profile.referralCode ? (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 550 }}
            style={{ marginTop: 16 }}
          >
            <GlassCard>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 8, fontFamily: 'Inter_600SemiBold' }}>
                Referral Code
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.muted,
                borderRadius: 10,
                padding: 12,
                gap: 10,
              }}>
                <Text style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.primary,
                  letterSpacing: 2,
                  fontFamily: 'Inter_700Bold',
                }}>
                  {profile.referralCode}
                </Text>
                <Pressable
                  onPress={handleCopyReferral}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: copied ? colors.success + '15' : colors.primary + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {copied ? (
                    <Check size={18} color={colors.success} />
                  ) : (
                    <Copy size={18} color={colors.primary} />
                  )}
                </Pressable>
              </View>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 8 }}>
                Share your referral code with friends. Both of you get bonus coins when they sign up!
              </Text>
            </GlassCard>
          </MotiView>
        ) : null}

        {/* Language Toggle */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 600 }}
          style={{ marginTop: 16 }}
        >
          <GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Globe size={18} color={colors.primary} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                {t('profile.language') || 'Language'}
              </Text>
            </View>
            <View style={{
              flexDirection: 'row',
              backgroundColor: colors.muted,
              borderRadius: 10,
              padding: 3,
            }}>
              <Pressable
                onPress={() => setLanguage('en')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: language === 'en' ? colors.primary : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: language === 'en' ? '#fff' : colors.mutedForeground,
                  fontFamily: 'Inter_600SemiBold',
                }}>
                  EN
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setLanguage('hi')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: language === 'hi' ? colors.primary : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: language === 'hi' ? '#fff' : colors.mutedForeground,
                  fontFamily: 'Inter_600SemiBold',
                }}>
                  HI
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </MotiView>

        {/* Logout Button */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 700 }}
          style={{ marginTop: 20 }}
        >
          <Button variant="destructive" onPress={logout}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <LogOut size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                Logout
              </Text>
            </View>
          </Button>
        </MotiView>
      </ScrollView>
    </View>
  );
}

/* ---------- Sub-components ---------- */

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  bgColor,
  colors,
}: {
  icon: any;
  label: string;
  value: string;
  iconColor: string;
  bgColor: string;
  colors: any;
}) {
  return (
    <GlassCard small>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={iconColor} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
          {value}
        </Text>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>
          {label}
        </Text>
      </View>
    </GlassCard>
  );
}

function AcademicRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
        {value}
      </Text>
    </View>
  );
}
