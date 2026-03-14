import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trophy, Target, Clock, CheckCircle, XCircle, Home } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatIcon } from '@/components/ui/StatIcon';

export default function TestReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const res = await apiService.tests.getAttempt(attemptId);
        if (res.data?.success) {
          setReport(res.data.data);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    loadReport();
  }, []);

  const score = report?.score || 0;
  const total = report?.totalQuestions || report?.questions?.length || 0;
  const correct = report?.correctAnswers || 0;
  const incorrect = report?.incorrectAnswers || 0;
  const unanswered = total - correct - incorrect;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const timeTaken = report?.timeTaken || report?.elapsedSeconds || 0;

  const getScoreColor = () => {
    if (percentage >= 80) return colors.success;
    if (percentage >= 50) return colors.warning;
    return colors.destructive;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={200} borderRadius={16} />
          <Skeleton height={100} borderRadius={12} />
          <Skeleton height={80} borderRadius={12} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Test Report
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Score Circle */}
        <GlassCard style={{ alignItems: 'center', paddingVertical: 32, marginBottom: 16 }}>
          <View style={{
            width: 120, height: 120, borderRadius: 60,
            borderWidth: 6, borderColor: getScoreColor(),
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Text style={{ fontSize: 32, fontWeight: '800', color: getScoreColor(), fontFamily: 'Inter_800ExtraBold' }}>
              {percentage}%
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            {report?.test?.title || 'Test Report'}
          </Text>
          {score !== undefined && (
            <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 4 }}>
              Score: {score}/{report?.maxScore || total * 4}
            </Text>
          )}
        </GlassCard>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[
            { icon: CheckCircle, value: String(correct), label: 'Correct', color: colors.success },
            { icon: XCircle, value: String(incorrect), label: 'Wrong', color: colors.destructive },
            { icon: Target, value: String(unanswered), label: 'Skipped', color: colors.mutedForeground },
            { icon: Clock, value: formatTime(timeTaken), label: 'Time', color: colors.warning },
          ].map((stat, i) => (
            <GlassCard key={i} small style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12 }}>
              <stat.icon size={18} color={stat.color} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: stat.color, fontFamily: 'Inter_800ExtraBold' }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 9, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {stat.label}
              </Text>
            </GlassCard>
          ))}
        </View>

        {/* Accuracy Bar */}
        <GlassCard style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 10 }}>Accuracy</Text>
          <Progress value={percentage} color={getScoreColor()} height={12} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{correct} correct</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: getScoreColor() }}>{percentage}%</Text>
          </View>
        </GlassCard>

        {/* Subject Breakdown */}
        {report?.subjectBreakdown && Object.keys(report.subjectBreakdown).length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Subject Breakdown
            </Text>
            {Object.entries(report.subjectBreakdown).map(([subject, data]: [string, any]) => (
              <GlassCard key={subject} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{subject}</Text>
                  <Badge variant={data.percentage >= 60 ? 'success' : 'warning'}>{data.percentage || 0}%</Badge>
                </View>
                <Progress value={data.percentage || 0} height={6} />
              </GlassCard>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={{ gap: 12 }}>
          <Button variant="outline" onPress={() => router.replace('/(auth)/(tabs)/tests' as any)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Home size={18} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600' }}>Back to Tests</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
