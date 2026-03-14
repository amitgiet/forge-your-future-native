import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Upload, BarChart3, TrendingUp, ChevronRight, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Progress } from '@/components/ui/Progress';

export default function MockAnalyzerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [mockTests, setMockTests] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Entry form
  const [showForm, setShowForm] = useState(false);
  const [score, setScore] = useState('');
  const [physicsScore, setPhysicsScore] = useState('');
  const [chemistryScore, setChemistryScore] = useState('');
  const [biologyScore, setBiologyScore] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [mocksRes, progressRes] = await Promise.allSettled([
        apiService.mocks.getMockTests(),
        apiService.mocks.getMockProgress(),
      ]);
      if (mocksRes.status === 'fulfilled' && mocksRes.value.data?.success) {
        setMockTests(mocksRes.value.data.data || []);
      }
      if (progressRes.status === 'fulfilled' && progressRes.value.data?.success) {
        setProgress(progressRes.value.data.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleMarkComplete = async (mockId: string) => {
    try {
      await apiService.mocks.markMockCompleted(mockId, { completed: true, notes });
      await fetchData();
      Alert.alert('Marked!', 'Mock test marked as completed.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to mark complete');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Mock Analyzer
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} height={100} borderRadius={12} />)}
          </View>
        ) : (
          <>
            {/* Hero */}
            <GlassCard style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 16, gap: 8 }}>
              <View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.secondary + '15' }}>
                <BarChart3 size={28} color={colors.secondary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                Mock Test Analyzer
              </Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center' }}>
                Track your mock test scores and analyze improvement over time.
              </Text>
            </GlassCard>

            {/* Progress Overview */}
            {progress && (
              <GlassCard style={{ marginBottom: 16, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} color={colors.primary} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                    Progress Overview
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Completed</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                      {progress.completed || 0}/{progress.total || 0}
                    </Text>
                  </View>
                  <Progress
                    value={progress.total > 0 ? ((progress.completed || 0) / progress.total) * 100 : 0}
                    height={8}
                  />
                  {progress.averageScore !== undefined && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Average Score</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                        {progress.averageScore}/720
                      </Text>
                    </View>
                  )}
                </View>
              </GlassCard>
            )}

            {/* Mock Tests */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Mock Tests
            </Text>

            {mockTests.length === 0 ? (
              <GlassCard style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                <Upload size={32} color={colors.mutedForeground} />
                <Text style={{ fontSize: 14, color: colors.mutedForeground }}>No mock tests available</Text>
              </GlassCard>
            ) : (
              <View style={{ gap: 10 }}>
                {mockTests.map((mock: any) => (
                  <GlassCard key={mock._id} style={{ gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.warning + '15' }}>
                        <BarChart3 size={18} color={colors.warning} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                          {mock.title || mock.name}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          {mock.examType && <Badge variant="outline">{mock.examType}</Badge>}
                          {mock.completed && <Badge variant="success">Completed</Badge>}
                        </View>
                      </View>
                    </View>

                    {!mock.completed && (
                      <Button size="sm" variant="outline" onPress={() => handleMarkComplete(mock._id)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <CheckCircle size={14} color={colors.foreground} />
                          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '600' }}>Mark Completed</Text>
                        </View>
                      </Button>
                    )}
                  </GlassCard>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
