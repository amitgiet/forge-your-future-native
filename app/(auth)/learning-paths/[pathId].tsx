import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Circle, Target, Trash2, Play } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Progress } from '@/components/ui/Progress';

export default function LearningPathDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { pathId } = useLocalSearchParams<{ pathId: string }>();

  const [path, setPath] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);

  const fetchPath = async () => {
    try {
      const res = await apiService.learningPaths.getPathById(pathId);
      if (res.data?.success) {
        setPath(res.data.data);
      }
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPath(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPath();
    setRefreshing(false);
  };

  const handleComplete = async (index: number) => {
    setCompleting(index);
    try {
      await apiService.learningPaths.markContentComplete(pathId, index);
      await fetchPath();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to mark as complete');
    } finally {
      setCompleting(null);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Path?', 'This cannot be undone.', [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiService.learningPaths.deletePath(pathId);
            router.back();
          } catch { }
        },
      },
    ]);
  };

  const overallProgress = path?.completedContent && path?.totalContent
    ? Math.round((path.completedContent / path.totalContent) * 100)
    : path?.progress || 0;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={40} borderRadius={8} />
          <Skeleton height={120} borderRadius={12} />
          <Skeleton height={80} borderRadius={12} />
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
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>
            {path?.title || 'Learning Path'}
          </Text>
          <Pressable onPress={handleDelete} style={{ padding: 8 }}>
            <Trash2 size={20} color={colors.destructive} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {path ? (
          <View style={{ gap: 16 }}>
            {/* Progress Header */}
            <GlassCard style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Target size={18} color={colors.primary} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  Progress
                </Text>
              </View>
              <Progress value={overallProgress} height={10} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                  {path.completedContent || 0}/{path.totalContent || 0} items
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{overallProgress}%</Text>
              </View>
              {path.dailyGoal && (
                <Badge variant="outline">Daily Goal: {path.dailyGoal}h</Badge>
              )}
            </GlassCard>

            {/* Description */}
            {path.description && (
              <GlassCard>
                <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 22 }}>{path.description}</Text>
              </GlassCard>
            )}

            {/* Timeline */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'PlusJakartaSans_700Bold' }}>
              Timeline
            </Text>

            {(path.goals || path.content || []).map((item: any, i: number) => {
              const isComplete = item.completed || item.isComplete;
              return (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Timeline Line */}
                  <View style={{ alignItems: 'center', width: 24 }}>
                    {isComplete ? (
                      <CheckCircle size={24} color={colors.success} />
                    ) : (
                      <Circle size={24} color={colors.border} />
                    )}
                    {i < (path.goals || path.content || []).length - 1 && (
                      <View style={{ width: 2, flex: 1, backgroundColor: isComplete ? colors.success : colors.border, marginVertical: 4 }} />
                    )}
                  </View>

                  <View style={{ flex: 1, paddingBottom: 16 }}>
                    <GlassCard style={{ gap: 8 }}>
                      <Text style={{
                        fontSize: 15, fontWeight: '600', color: colors.foreground,
                        fontFamily: 'Inter_600SemiBold',
                        textDecorationLine: isComplete ? 'line-through' : 'none',
                        opacity: isComplete ? 0.6 : 1,
                      }}>
                        {item.topic || item.title || `Step ${i + 1}`}
                      </Text>
                      {item.target && (
                        <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{item.target}</Text>
                      )}
                      {!isComplete && (
                        <Button size="sm" onPress={() => handleComplete(i)} loading={completing === i}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>Mark Complete</Text>
                        </Button>
                      )}
                    </GlassCard>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: colors.mutedForeground }}>Path not found</Text>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}
