import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Sparkles, ChevronRight, Target } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Progress } from '@/components/ui/Progress';

export default function LearningPathsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [paths, setPaths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPaths = async () => {
    try {
      const res = await apiService.learningPaths.getUserPaths();
      if (res.data?.success) {
        setPaths(res.data.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPaths(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPaths();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            Learning Paths
          </Text>
          <Button size="sm" onPress={() => router.push('/(auth)/learning-paths/create' as any)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Plus size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Create</Text>
            </View>
          </Button>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} height={120} borderRadius={12} />)}
          </View>
        ) : paths.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <Sparkles size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No learning paths yet</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
              Create a personalized learning path to track your study goals
            </Text>
            <Button size="sm" onPress={() => router.push('/(auth)/learning-paths/create' as any)} style={{ marginTop: 8 }}>
              Create Your First Path
            </Button>
          </GlassCard>
        ) : (
          <View style={{ gap: 12 }}>
            {paths.map((path: any) => {
              const progress = path.completedContent && path.totalContent
                ? Math.round((path.completedContent / path.totalContent) * 100)
                : path.progress || 0;
              return (
                <Pressable
                  key={path._id}
                  onPress={() => router.push({
                    pathname: '/(auth)/learning-paths/[pathId]',
                    params: { pathId: path._id },
                  } as any)}
                >
                  <GlassCard style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.warning + '15' }}>
                        <Target size={20} color={colors.warning} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                          {path.title}
                        </Text>
                        {path.description && (
                          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>
                            {path.description}
                          </Text>
                        )}
                      </View>
                      <ChevronRight size={18} color={colors.mutedForeground} />
                    </View>
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Progress</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{progress}%</Text>
                      </View>
                      <Progress value={progress} height={6} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {path.dailyGoal && <Badge variant="outline">{path.dailyGoal}h/day</Badge>}
                      <Badge variant={progress >= 100 ? 'success' : 'primary'}>
                        {progress >= 100 ? 'Completed' : 'In Progress'}
                      </Badge>
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
