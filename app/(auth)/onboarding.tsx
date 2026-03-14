import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

const SUBJECTS = ['Physics', 'Chemistry', 'Biology'];
const STUDY_STYLES = [
  { label: 'Visual Learner', value: 'visual', desc: 'Prefer diagrams, charts & videos' },
  { label: 'Read/Write', value: 'readwrite', desc: 'Prefer notes & textbooks' },
  { label: 'Practice Heavy', value: 'practice', desc: 'Learn by solving problems' },
  { label: 'Mixed', value: 'mixed', desc: 'Combination of all styles' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [targetYear, setTargetYear] = useState('2026');
  const [studyHours, setStudyHours] = useState('4');

  // Step 2
  const [mockScore, setMockScore] = useState('');
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);

  // Step 3
  const [studyStyle, setStudyStyle] = useState('mixed');

  const toggleWeakSubject = (subject: string) => {
    setWeakSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const handleNext = async () => {
    if (step < 3) {
      try {
        await apiService.auth.updateOnboarding({
          step,
          data: step === 1
            ? { name, targetYear, studyHours: Number(studyHours) }
            : { mockScore: Number(mockScore), weakSubjects },
        });
      } catch {}
      setStep(step + 1);
      return;
    }

    setSaving(true);
    try {
      await apiService.auth.updateOnboarding({
        step: 3,
        completed: true,
        data: { studyStyle },
      });
      router.replace('/(auth)/(tabs)' as any);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={handleBack} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Set Up Your Profile
          </Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
            {step}/3
          </Text>
        </View>
        <Progress value={(step / 3) * 100} style={{ marginBottom: 8 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View style={{ gap: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
              Tell us about yourself
            </Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 22 }}>
              Help us personalize your NEET preparation journey.
            </Text>
            <Input
              label="Your Name"
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
            />
            <Select
              label="Target NEET Year"
              options={[
                { label: '2025', value: '2025' },
                { label: '2026', value: '2026' },
                { label: '2027', value: '2027' },
                { label: '2028', value: '2028' },
              ]}
              value={targetYear}
              onValueChange={setTargetYear}
            />
            <Select
              label="Daily Study Hours"
              options={[
                { label: '1-2 hours', value: '2' },
                { label: '3-4 hours', value: '4' },
                { label: '5-6 hours', value: '6' },
                { label: '7-8 hours', value: '8' },
                { label: '8+ hours', value: '10' },
              ]}
              value={studyHours}
              onValueChange={setStudyHours}
            />
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
              Your current level
            </Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 22 }}>
              This helps us calibrate your study plan and recommendations.
            </Text>
            <Input
              label="Last Mock Score (out of 720)"
              placeholder="e.g. 450"
              value={mockScore}
              onChangeText={setMockScore}
              keyboardType="number-pad"
            />
            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.foreground, marginBottom: 10, fontFamily: 'Inter_500Medium' }}>
                Weak Subjects (select all that apply)
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {SUBJECTS.map((subject) => {
                  const selected = weakSubjects.includes(subject);
                  return (
                    <Pressable
                      key={subject}
                      onPress={() => toggleWeakSubject(subject)}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary + '10' : colors.card,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {selected && <Check size={16} color={colors.primary} />}
                      <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? colors.primary : colors.foreground }}>
                        {subject}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
              Your study style
            </Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 22 }}>
              We'll tailor content delivery to your preferred learning style.
            </Text>
            <View style={{ gap: 12 }}>
              {STUDY_STYLES.map((s) => {
                const selected = studyStyle === s.value;
                return (
                  <Pressable key={s.value} onPress={() => setStudyStyle(s.value)}>
                    <GlassCard
                      style={{
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? colors.primary : colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: selected ? colors.primary : colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {selected && (
                          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                          {s.label}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                          {s.desc}
                        </Text>
                      </View>
                    </GlassCard>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 16,
          paddingTop: 12,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button onPress={handleNext} loading={saving} disabled={saving}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>
              {step === 3 ? 'Get Started' : 'Continue'}
            </Text>
            {step < 3 && <ArrowRight size={18} color="#fff" />}
          </View>
        </Button>
      </View>
    </View>
  );
}
