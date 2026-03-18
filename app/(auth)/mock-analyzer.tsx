import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { ArrowLeft, Upload, FileText, TrendingDown, Trophy, Calendar, RotateCcw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import BottomNav from '@/components/BottomNav';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, gradientProps } from '@/theme/gradients';

const mockWeaknesses = [
  { chapter: 'Cell Division', accuracy: 45, questions: 8 },
  { chapter: 'Genetics', accuracy: 52, questions: 12 },
  { chapter: 'Plant Physiology', accuracy: 58, questions: 6 },
  { chapter: 'Human Physiology', accuracy: 61, questions: 10 },
];

export default function MockAnalyzerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();

  const [hasUploaded, setHasUploaded] = useState(false);

  const handleUpload = () => {
    setHasUploaded(true);
  };

  const getAccuracyColors = (accuracy: number) => {
    if (accuracy < 50) return { bg: colors.destructive + '15', text: colors.destructive, border: colors.destructive + '40', fill: colors.destructive };
    if (accuracy < 60) return { bg: colors.warning + '15', text: colors.warning, border: colors.warning + '40', fill: colors.warning };
    return { bg: colors.primary + '15', text: colors.primary, border: colors.primary + '40', fill: colors.primary };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, marginTop: 16 }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Mock Analyzer
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
              AI-powered analysis
            </Text>
          </View>
        </MotiView>

        {!hasUploaded ? (
          /* Upload Section */
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={{ marginTop: 32 }}
          >
            <Pressable onPress={handleUpload}>
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 24,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: colors.primary + '60',
                padding: 48,
                alignItems: 'center',
                justifyContent: 'center',
                ...shadows.sm
              }}>
                <MotiView
                  from={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', loop: true, repeatReverse: true, duration: 2000 }}
                  style={{
                    width: 80, height: 80, borderRadius: 24,
                    backgroundColor: colors.primary + '10',
                    borderWidth: 2, borderColor: colors.primary + '30',
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16
                  }}
                >
                  <Upload size={40} color={colors.primary} />
                </MotiView>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 8 }}>
                  Upload mock test
                </Text>
                <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', fontFamily: 'Inter_400Regular', paddingHorizontal: 20 }}>
                  Upload your mock test PDF and let AI analyze your weaknesses
                </Text>
              </View>
            </Pressable>

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 16,
              marginTop: 24,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.secondary + '15', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} color={colors.secondary} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>
                Supports: PDF, Images
              </Text>
            </View>
          </MotiView>
        ) : (
          /* Results Section */
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ gap: 16 }}
          >
            {/* Rank Card */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 100 }}
            >
              <LinearGradient
                colors={gradients.primary}
                start={gradientProps.start}
                end={gradientProps.end}
                style={{ borderRadius: 20, padding: 20, ...shadows.card }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>
                      Predicted Rank
                    </Text>
                    <Text style={{ fontSize: 36, fontWeight: '900', color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
                      12,450
                    </Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginTop: 4 }}>
                      Based on your mock test performance
                    </Text>
                  </View>
                  <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
                    <Trophy size={32} color="#fff" />
                  </View>
                </View>
              </LinearGradient>
            </MotiView>

            {/* Score Stats */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { value: '156', label: 'Correct', color: colors.foreground, delay: 150 },
                { value: '44', label: 'Wrong', color: colors.destructive, delay: 200 },
                { value: '78%', label: 'Accuracy', color: colors.primary, delay: 250 },
              ].map((stat, i) => (
                <MotiView
                  key={i}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: stat.delay }}
                  style={{ flex: 1 }}
                >
                  <GlassCard style={{ padding: 16, alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: stat.color, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
                      {stat.value}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 4 }}>
                      {stat.label}
                    </Text>
                  </GlassCard>
                </MotiView>
              ))}
            </View>

            {/* Weakness Map */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 300 }}
            >
              <GlassCard style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingDown size={16} color={colors.primary} />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                    Weakness Map
                  </Text>
                </View>

                <View style={{ gap: 16 }}>
                  {mockWeaknesses.map((weakness, i) => {
                    const accColors = getAccuracyColors(weakness.accuracy);
                    return (
                      <MotiView
                        key={weakness.chapter}
                        from={{ opacity: 0, translateX: -20 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        transition={{ delay: 350 + i * 50 }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                            {weakness.chapter}
                          </Text>
                          <View style={{
                            paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
                            backgroundColor: accColors.bg, borderWidth: 1, borderColor: accColors.border
                          }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: accColors.text, fontFamily: 'Inter_700Bold' }}>
                              {weakness.accuracy}%
                            </Text>
                          </View>
                        </View>
                        {/* Custom Progress Bar for animation support */}
                        <View style={{ height: 8, backgroundColor: colors.muted, borderRadius: 4, overflow: 'hidden' }}>
                          <MotiView
                            from={{ width: '0%' }}
                            animate={{ width: `${weakness.accuracy}%` }}
                            transition={{ duration: 1000, delay: 500 + i * 100 }}
                            style={{ height: '100%', backgroundColor: accColors.fill, borderRadius: 4 }}
                          />
                        </View>
                      </MotiView>
                    );
                  })}
                </View>
              </GlassCard>
            </MotiView>

            {/* Actions */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 600 }}
              style={{ gap: 12, marginTop: 8 }}
            >
              <Pressable
                style={{ opacity: 1 }}
              >
                <LinearGradient
                  colors={gradients.primary}
                  start={gradientProps.start} end={gradientProps.end}
                  style={{ height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Calendar size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>
                    Schedule Daily Fix
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                style={{
                  height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                  opacity: 1
                }}
              >
                <RotateCcw size={20} color={colors.foreground} />
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>
                  Retry Weak Questions
                </Text>
              </Pressable>
            </MotiView>
          </MotiView>
        )}
      </ScrollView>

      <BottomNav />
    </View>
  );
}
