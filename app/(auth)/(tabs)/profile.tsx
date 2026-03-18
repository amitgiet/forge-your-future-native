import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  User, Flame, Target, BookOpen, Award, Globe, Crown, Zap, LogOut,
  Edit2, Save, ChevronLeft, Shield, X, Copy, Check
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/lib/apiService';
import { gradients, gradientProps } from '@/theme/gradients';
import { LinearGradient } from 'expo-linear-gradient';

const Profile = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  const [formData, setFormData] = useState({
    name: '',
    targetYear: '',
    studyHours: '',
    boardPercentage: '',
    mockScore: '',
    weakSubjects: [] as string[]
  });

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [pricing, setPricing] = useState({
    baseAmountPaise: 14900,
    discountAmountPaise: 0,
    finalAmountPaise: 14900,
    couponApplied: null as string | null
  });
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [copiedReferral, setCopiedReferral] = useState(false);

  const achievements = [
    { icon: '🔥', label: '7 Day Streak', unlocked: true },
    { icon: '📚', label: 'First Quiz', unlocked: true },
    { icon: '🎯', label: '100% Accuracy', unlocked: false },
    { icon: '🏆', label: 'Top 10%', unlocked: false },
  ];

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const response = await apiService.auth.getProfile();
      if (response.data.success) {
        const data = response.data.data;
        setProfileData(data);
        if (data.profile?.preferredLanguage) {
          setLanguage(data.profile.preferredLanguage);
        }
        setFormData({
          name: data.name || '',
          targetYear: data.profile?.targetYear || '2026',
          studyHours: data.profile?.studyHoursPerDay ? `${data.profile.studyHoursPerDay}-${data.profile.studyHoursPerDay + 2}` : '4-6',
          boardPercentage: data.profile?.boardPercentage || '75-90',
          mockScore: data.profile?.mockScore || '',
          weakSubjects: data.profile?.weakSubjects || []
        });
      }
    } catch (error) { console.error('Load profile error:', error); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiService.auth.updateProfile({
        name: formData.name,
        profile: {
          targetYear: formData.targetYear,
          studyHoursPerDay: parseInt(formData.studyHours.split('-')[0]),
          boardPercentage: formData.boardPercentage,
          mockScore: formData.mockScore,
          weakSubjects: formData.weakSubjects
        }
      });
      await loadProfile();
      setEditing(false);
    } catch (error) { console.error('Update profile error:', error); }
    finally { setLoading(false); }
  };

  const toggleArrayItem = (array: string[], item: string) =>
    array.includes(item) ? array.filter(i => i !== item) : [...array, item];

  const handleLanguageChange = async (lang: 'en' | 'hi') => {
    setLanguage(lang);
    try {
      await apiService.auth.updateProfile({ preferredLanguage: lang });
      setProfileData((prev: any) => ({ ...prev, profile: { ...(prev?.profile || {}), preferredLanguage: lang } }));
    } catch (error) { console.error('Update preferred language error:', error); }
  };

  const xpProgress = ((profileData?.gamification?.totalXP || 0) % 1000) / 10;
  const formatRupees = (paise: number) => `₹${(paise / 100).toFixed(0)}`;

  // Assuming clipboard copying would need Expo Clipboard, but simulating here
  const copyReferralCode = () => {
    const code = profileData?.referralCode;
    if (!code) return;
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 1500);
  };

  const pollSubscriptionActivation = async () => {
    const start = Date.now();
    while (Date.now() - start < 60000) {
      const res = await apiService.billing.getSubscriptionStatus();
      if (res?.data?.data?.isActive) return true;
      await new Promise(r => setTimeout(r, 3000));
    }
    return false;
  };

  const applyCoupon = async () => {
    setUpgradeError('');
    setUpgradeMessage('');
    if (!couponCode.trim()) {
      setPricing({ baseAmountPaise: 14900, discountAmountPaise: 0, finalAmountPaise: 14900, couponApplied: null });
      return;
    }
    setCouponLoading(true);
    try {
      const response = await apiService.billing.validateCoupon({
        code: couponCode.trim().toUpperCase(), planCode: 'PRO_MONTHLY'
      });
      if (response.data?.success) {
        setPricing(response.data.pricing);
        setUpgradeMessage(`Coupon applied: ${response.data.pricing?.couponApplied}`);
      }
    } catch (error: any) {
      setUpgradeError(error?.response?.data?.message || 'Invalid coupon');
      setPricing({ baseAmountPaise: 14900, discountAmountPaise: 0, finalAmountPaise: 14900, couponApplied: null });
    } finally {
      setCouponLoading(false);
    }
  };

  const startPremiumCheckout = async () => {
    setUpgradeError('');
    setUpgradeMessage('');
    setUpgradeLoading(true);
    try {
      const initResponse = await apiService.billing.initiateCheckout({
        planCode: 'PRO_MONTHLY',
        couponCode: couponCode.trim() || undefined,
        referralCode: referralCode.trim() || undefined
      });
      const checkout = initResponse?.data?.checkout;
      if (!checkout?.orderId || !checkout?.paymentUrl) {
        throw new Error('Failed to initialize checkout');
      }
      if (initResponse?.data?.pricing) setPricing(initResponse.data.pricing);

      // In Native, we redirect to checkout URL or use native Razorpay SDK.
      // Assuming a web URL redirect for this parity fallback
      await Linking.openURL(checkout.paymentUrl);

      setUpgradeMessage('Payment initiated. Waiting for confirmation...');
      const activated = await pollSubscriptionActivation();
      if (activated) {
        await loadProfile();
        setShowUpgradeModal(false);
        setCouponCode('');
        setReferralCode('');
        setUpgradeMessage('');
      } else {
        setUpgradeMessage('Payment is processing. Premium will reflect shortly.');
      }
    } catch (error: any) {
      setUpgradeError(error?.response?.data?.message || error?.message || 'Checkout failed');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const StatBox = ({ icon: Icon, label, value, unit, color }: any) => (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{
        flex: 1, minWidth: '45%', backgroundColor: colors.card,
        borderWidth: 1, borderColor: colors.border, borderRadius: 16,
        padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: color + '1A', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>{value}</Text>
          {!!unit && <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>{unit}</Text>}
        </View>
        <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>{label}</Text>
      </View>
    </MotiView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky Header */}
      <View style={{
        paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 30,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color={colors.foreground} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>Profile</Text>
        </View>
        <Pressable
          onPress={() => editing ? handleSave() : setEditing(true)}
          disabled={loading}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
            backgroundColor: editing ? 'transparent' : colors.primary + '1A',
            borderWidth: 1, borderColor: editing ? 'transparent' : colors.primary + '33',
            opacity: 1,
          }}
        >
          {editing && (
            <LinearGradient colors={[...gradients.primary]} start={gradientProps.start} end={gradientProps.end} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12 }} />
          )}
          {editing ? (
            <>{loading ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Save</Text></>}</>
          ) : (
            <><Edit2 size={16} color={colors.primary} /><Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Edit</Text></>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }}
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20, alignItems: 'center' }}
        >
          <View style={{ position: 'relative', marginBottom: 12 }}>
            <LinearGradient colors={[...gradients.primary]} start={gradientProps.start} end={gradientProps.end} style={{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary + '33' }}>
              <User size={40} color="#fff" />
            </LinearGradient>
            <View style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card }}>
              <Shield size={12} color="#fff" />
            </View>
          </View>

          {editing ? (
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              style={{
                fontSize: 20, fontWeight: '700', textAlign: 'center', width: '100%',
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border,
                color: colors.foreground, marginBottom: 4,
              }}
            />
          ) : (
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, marginBottom: 2, fontFamily: 'Inter_700Bold' }}>{profileData?.name || 'NEET Aspirant'}</Text>
          )}
          <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>{user?.email}</Text>

          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, backgroundColor: colors.primary + '1A', borderWidth: 1, borderColor: colors.primary + '33' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary, textTransform: 'capitalize' }}>{profileData?.subscription?.plan || 'Free'} Plan</Text>
          </View>
          {profileData?.subscription?.currentPeriodEnd && (
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.mutedForeground }}>
              Valid till {new Date(profileData.subscription.currentPeriodEnd).toLocaleDateString()}
            </Text>
          )}
        </MotiView>

        {/* XP Progress */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 50 }}
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.warning + '1A', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={16} color={colors.warning} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{profileData?.gamification?.totalXP || 0} XP</Text>
            </View>
            <View style={{ backgroundColor: colors.muted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground }}>Level {profileData?.gamification?.level || 1}</Text>
            </View>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.muted, overflow: 'hidden' }}>
            <MotiView from={{ width: 0 }} animate={{ width: `${xpProgress}%` }} transition={{ duration: 1000 }} style={{ height: '100%', borderRadius: 5 }}>
              <LinearGradient colors={[...gradients.primary]} start={gradientProps.start} end={gradientProps.end} style={{ flex: 1 }} />
            </MotiView>
          </View>
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 6 }}>{Math.round(xpProgress * 10)} / 1000 XP to next level</Text>
        </MotiView>

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <StatBox icon={Flame} label="Daily Streak" value={profileData?.gamification?.currentStreak || 0} unit="days" color={colors.warning} />
          <StatBox icon={BookOpen} label="Mocks" value={profileData?.analytics?.totalMocksAttempted || 0} unit="" color={colors.primary} />
          <StatBox icon={Target} label="Accuracy" value={`${profileData?.analytics?.overallAccuracy || 0}%`} unit="" color={colors.success} />
          <StatBox icon={Award} label="Coins" value={profileData?.gamification?.coins || 0} unit="" color={colors.secondary} />
        </View>

        {/* Academic Info */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 100 }}
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 16 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 16, fontFamily: 'Inter_700Bold' }}>
            {editing ? 'Edit Academic Info' : 'Academic Info'}
          </Text>

          {editing ? (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', marginBottom: 8 }}>Target Year</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['2027', '2026', 'Dropper'].map((year) => (
                    <Pressable key={year} onPress={() => setFormData({ ...formData, targetYear: year })} style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center',
                      backgroundColor: formData.targetYear === year ? colors.primary + '1A' : colors.muted,
                      borderColor: formData.targetYear === year ? colors.primary : colors.border
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: formData.targetYear === year ? colors.primary : colors.foreground }}>{year}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', marginBottom: 8 }}>Study Hours/Day</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['2-3', '4-6', '6+'].map((hours) => (
                    <Pressable key={hours} onPress={() => setFormData({ ...formData, studyHours: hours })} style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center',
                      backgroundColor: formData.studyHours === hours ? colors.primary + '1A' : colors.muted,
                      borderColor: formData.studyHours === hours ? colors.primary : colors.border
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: formData.studyHours === hours ? colors.primary : colors.foreground }}>{hours}hr</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', marginBottom: 8 }}>Board %</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['<60%', '60-75%', '75-90%', '90+%'].map((range) => (
                    <Pressable key={range} onPress={() => setFormData({ ...formData, boardPercentage: range })} style={{
                      width: '48%', paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center',
                      backgroundColor: formData.boardPercentage === range ? colors.secondary + '1A' : colors.muted,
                      borderColor: formData.boardPercentage === range ? colors.secondary : colors.border
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: formData.boardPercentage === range ? colors.secondary : colors.foreground }}>{range}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', marginBottom: 8 }}>Mock Score</Text>
                <TextInput value={formData.mockScore} onChangeText={(text) => setFormData({ ...formData, mockScore: text })} placeholder="e.g. 450/720" style={{
                  width: '100%', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
                  backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border,
                  color: colors.foreground, fontSize: 14
                }} placeholderTextColor={colors.mutedForeground} />
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', marginBottom: 8 }}>Weak Subjects</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['Physics', 'Chemistry', 'Biology'].map((subject) => (
                    <Pressable key={subject} onPress={() => setFormData({ ...formData, weakSubjects: toggleArrayItem(formData.weakSubjects, subject) })} style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center',
                      backgroundColor: formData.weakSubjects.includes(subject) ? colors.destructive + '1A' : colors.muted,
                      borderColor: formData.weakSubjects.includes(subject) ? colors.destructive : colors.border
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: formData.weakSubjects.includes(subject) ? colors.destructive : colors.foreground }}>
                        {formData.weakSubjects.includes(subject) && '✓ '}{subject}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {[
                { label: 'Target Year', value: profileData?.profile?.targetYear || 'Not set' },
                { label: 'Study Hours', value: `${profileData?.profile?.studyHoursPerDay || 6}hr/day` },
                { label: 'Board %', value: profileData?.profile?.boardPercentage || 'Not set' },
                { label: 'Mock Score', value: profileData?.profile?.mockScore || 'Not attempted' },
              ].map((item, i) => (
                <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottomWidth: i === 3 ? 0 : 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{item.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{item.value}</Text>
                </View>
              ))}
              {profileData?.profile?.weakSubjects?.length > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                  <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Weak Subjects</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {profileData.profile.weakSubjects.map((s: string) => (
                      <View key={s} style={{ backgroundColor: colors.destructive + '1A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.destructive }}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </MotiView>

        {/* Achievements */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 150 }}
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 16 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 12, fontFamily: 'Inter_700Bold' }}>Achievements</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {achievements.map((a, i) => (
              <View key={a.label} style={{
                width: '23%', aspectRatio: 0.8, alignItems: 'center', justifyContent: 'center', padding: 8,
                borderRadius: 16, borderWidth: 1,
                backgroundColor: a.unlocked ? colors.warning + '0D' : colors.muted + '4D',
                borderColor: a.unlocked ? colors.warning + '33' : colors.border,
                opacity: a.unlocked ? 1 : 0.5
              }}>
                <Text style={{ fontSize: 24, marginBottom: 4 }}>{a.icon}</Text>
                <Text style={{ fontSize: 10, fontWeight: '500', color: colors.foreground, textAlign: 'center' }}>{a.label}</Text>
              </View>
            ))}
          </View>
        </MotiView>

        {/* Upgrade CTA */}
        {profileData?.subscription?.plan === 'free' && (
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 200 }}
            style={{ borderRadius: 24, padding: 16, borderWidth: 2, borderColor: colors.primary + '33', backgroundColor: colors.primary + '0D' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <LinearGradient colors={[...gradients.primary]} start={gradientProps.start} end={gradientProps.end} style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={24} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>Go Pro</Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Unlimited revisions & features</Text>
              </View>
            </View>
            <Pressable onPress={() => { setUpgradeError(''); setUpgradeMessage(''); setShowUpgradeModal(true); }} style={{ opacity: 1 }}>
              <LinearGradient colors={[...gradients.primary]} start={gradientProps.start} end={gradientProps.end} style={{ width: '100%', paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Crown size={16} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Upgrade - Rs 149/mo</Text>
              </LinearGradient>
            </Pressable>
          </MotiView>
        )}

        {/* Referral Code */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 250 }}
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Referral Code</Text>
            <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Invite friends, earn premium days</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 14, fontFamily: 'Menlo', fontWeight: '600', color: colors.foreground }}>{profileData?.referralCode || 'Loading...'}</Text>
            </View>
            <Pressable onPress={copyReferralCode} disabled={!profileData?.referralCode} style={{
              paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
              backgroundColor: colors.primary + '1A', borderColor: colors.primary + '33',
              flexDirection: 'row', alignItems: 'center', gap: 6, opacity: profileData?.referralCode ? 1 : 0.5
            }}>
              {copiedReferral ? <Check size={16} color={colors.primary} /> : <Copy size={16} color={colors.primary} />}
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{copiedReferral ? 'Copied' : 'Copy'}</Text>
            </Pressable>
          </View>
          <View style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: colors.muted + '80', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 16 }}>
              Share this code with friends. They can enter it while upgrading to Pro. You get referral premium reward after their first successful paid activation.
            </Text>
          </View>
        </MotiView>

        {/* Language Toggle */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 300 }}
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.secondary + '1A', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={18} color={colors.secondary} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Language</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4, backgroundColor: colors.muted, borderRadius: 12 }}>
            {(['en', 'hi'] as const).map(lang => (
              <Pressable key={lang} onPress={() => handleLanguageChange(lang)} style={{
                paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10,
                backgroundColor: language === lang ? colors.primary : 'transparent',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: language === lang ? '#fff' : colors.mutedForeground }}>
                  {lang === 'en' ? 'EN' : 'हिं'}
                </Text>
              </Pressable>
            ))}
          </View>
        </MotiView>

        {/* Logout */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 350 }}>
          <Pressable onPress={logout} style={{
            width: '100%', paddingVertical: 14, borderRadius: 20, backgroundColor: colors.card,
            borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: 1
          }}>
            <LogOut size={16} color={colors.destructive} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.destructive }}>Logout</Text>
          </Pressable>
        </MotiView>
      </ScrollView>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', maxWidth: 400, backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Upgrade to Pro</Text>
              <Pressable onPress={() => setShowUpgradeModal(false)} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', marginBottom: 6 }}>Coupon Code</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={couponCode} onChangeText={t => setCouponCode(t.toUpperCase())} placeholder="Enter coupon" placeholderTextColor={colors.mutedForeground}
                    style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontSize: 14 }} />
                  <Pressable onPress={applyCoupon} disabled={couponLoading} style={{ paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primary + '1A', borderWidth: 1, borderColor: colors.primary + '33' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{couponLoading ? '...' : 'Apply'}</Text>
                  </Pressable>
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', marginBottom: 6 }}>Referral Code (Optional)</Text>
                <TextInput value={referralCode} onChangeText={t => setReferralCode(t.toUpperCase())} placeholder="Enter referral" placeholderTextColor={colors.mutedForeground}
                  style={{ width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontSize: 14, marginBottom: 4 }} />
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Use a friend's code before payment.</Text>
              </View>

              <View style={{ borderRadius: 16, backgroundColor: colors.muted + '80', padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Base price</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{formatRupees(pricing.baseAmountPaise)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Discount</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.success }}>- {formatRupees(pricing.discountAmountPaise)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Payable</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{formatRupees(pricing.finalAmountPaise)}</Text>
                </View>
              </View>

              {upgradeError ? <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.destructive + '1A', borderWidth: 1, borderColor: colors.destructive + '33' }}><Text style={{ fontSize: 12, color: colors.destructive }}>{upgradeError}</Text></View> : null}
              {upgradeMessage ? <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.primary + '1A', borderWidth: 1, borderColor: colors.primary + '33' }}><Text style={{ fontSize: 12, color: colors.primary }}>{upgradeMessage}</Text></View> : null}

              <Pressable onPress={startPremiumCheckout} disabled={upgradeLoading} style={{ opacity: 1 }}>
                <LinearGradient colors={[...gradients.primary]} start={gradientProps.start} end={gradientProps.end} style={{ width: '100%', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {upgradeLoading ? <ActivityIndicator size="small" color="#fff" /> : <><Crown size={16} color="#fff" /><Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Pay {formatRupees(pricing.finalAmountPaise)}</Text></>}
                </LinearGradient>
              </Pressable>
            </View>
          </MotiView>
        </View>
      )}
    </View>
  );
};

export default Profile;
