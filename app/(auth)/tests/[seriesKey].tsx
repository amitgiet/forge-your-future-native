import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { ArrowLeft, Layers, Trophy, BookOpen, FileText, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';

const TYPE_LABELS: Record<string, string> = {
  'part-test': 'Part Test',
  'full-test': 'Full Test',
  'fulllength-test': 'Full Length Test',
};

const normalizeType = (value: any) => {
  const str = String(value || '').trim().toLowerCase();
  if (!str) return 'unknown';
  if (str === 'chapter_test') return 'part-test';
  if (str === 'full_test') return 'full-test';
  return str;
};

const typeIcon = (type: string, color: string) => {
  if (type === 'part-test') return <Layers size={20} color={color} />;
  if (type === 'full-test') return <BookOpen size={20} color={color} />;
  if (type === 'fulllength-test') return <Trophy size={20} color={color} />;
  return <FileText size={20} color={color} />;
};

const prettySeriesLabel = (series: string): string => {
  const raw = String(series || '').trim();
  if (!raw) return 'Other';
  const lowered = raw.toLowerCase();
  if (lowered === 'sigma') return 'Sigma';
  if (lowered.startsWith('yakeen')) return raw;
  const s = raw.toUpperCase();
  if (s === 'BPT') return 'Brahmastra Part Tests';
  if (s === 'BFLT') return 'Brahmastra FLT';
  if (s === 'DROPPER') return 'Dropper Series';
  if (s === 'BOOTCAMP') return 'Bootcamp Series';
  if (s === 'TEST') return 'Generic Tests';
  if (s === 'OTHER') return 'Other';
  return raw;
};

export default function TestSeriesTypeSelectorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { seriesKey } = useLocalSearchParams<{ seriesKey: string }>();

  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSeriesTests = async () => {
    try {
      setLoading(true);
      const res = await apiService.testSeries.getTestsBySeriesType(String(seriesKey), { page: 1, limit: 500 });
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      setTests(items);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSeriesTests();
  }, [seriesKey]);

  const typeRows = useMemo(() => {
    const counts = new Map<string, number>();
    tests.forEach((t: any) => {
      const key = normalizeType(t.source?.originalTestType || t.testType || t.typeKey);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        label: TYPE_LABELS[key] || key,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [tests]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 20 }}>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 22, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>
              {prettySeriesLabel(decodeURIComponent(String(seriesKey || 'Series')))}
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{tests.length} tests · Choose type</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Loading types...</Text>
          </View>
        ) : typeRows.length === 0 ? (
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 32, alignItems: 'center' }}>
            <Layers size={40} color={colors.mutedForeground} style={{ opacity: 0.4, marginBottom: 8 }} />
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>No test types found</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {typeRows.map((row, idx) => (
              <MotiView key={row.key} from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: idx * 0.04 }}>
                <Pressable onPress={() => router.push({ pathname: '/(auth)/tests/[seriesKey]/[typeKey]', params: { seriesKey: String(seriesKey), typeKey: row.key } } as any)} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                  <View style={{ width: '100%', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary + '1A', alignItems: 'center', justifyContent: 'center' }}>
                      {typeIcon(row.key, colors.secondary)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 }}>{row.label}</Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>{row.count} tests available</Text>
                    </View>
                    <ChevronRight size={20} color={colors.mutedForeground} />
                  </View>
                </Pressable>
              </MotiView>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
