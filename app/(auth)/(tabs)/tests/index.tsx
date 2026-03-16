import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import {
  ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Clock,
  FileText, Filter, Layers, Search, SlidersHorizontal, Trophy, X, Zap
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, gradientProps } from '@/theme/gradients';

type ClassCategory = 'all' | '11' | '12' | 'dropper' | 'mixed' | 'other';
type TypeFilter = 'all' | 'part-test' | 'full-test' | 'fulllength-test';
type CoachingFilter = 'all' | 'self' | 'local' | 'national' | 'unknown';

const classLabel: Record<ClassCategory, string> = {
  all: 'All Classes', '11': 'Class 11', '12': 'Class 12',
  dropper: 'Dropper', mixed: '11 + 12', other: 'Other',
};

const typeLabel: Record<TypeFilter, string> = {
  all: 'All Types', 'part-test': 'Part Test', 'full-test': 'Full Test', 'fulllength-test': 'Full Length',
};

const coachingLabel: Record<CoachingFilter, string> = {
  all: 'All Modes', self: 'Self Study', local: 'Local Coaching', national: 'National Coaching', unknown: 'Unknown',
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

const seriesIcons: Record<string, any> = {
  BPT: Zap, BFLT: Trophy, DROPPER: BookOpen, BOOTCAMP: Layers,
};

const sortSeriesByLabelAsc = (a: string, b: string) =>
  prettySeriesLabel(a).localeCompare(prettySeriesLabel(b));

export default function TestsIndexScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassCategory>('all');
  const [selectedCoaching, setSelectedCoaching] = useState<CoachingFilter>('all');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [activeMainTab, setActiveMainTab] = useState<'all' | 'curriculum'>('all');
  const [seriesCatalog, setSeriesCatalog] = useState<any[]>([]);
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);
  
  const [chapterTests, setChapterTests] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const catalogRes = await apiService.testSeries.getSeriesCatalog();
      setSeriesCatalog(Array.isArray(catalogRes.data?.data) ? catalogRes.data.data : []);
      
      const subRes = await apiService.testSeries.getHierarchySubjects();
      if (subRes.data?.success) {
        const subs = subRes.data.data;
        setSubjects(subs);
        if (subs.length > 0 && !selectedSubjectId) setSelectedSubjectId(subs[0]._id);
      }
    } catch (e) {
      setError('Failed to load test series.');
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async (subId: string) => {
    try {
      setLoadingHierarchy(true);
      const res = await apiService.testSeries.getHierarchyChapters(subId);
      if (res.data?.success) setChapters(res.data.data);
    } catch (e) {} finally {
      setLoadingHierarchy(false);
    }
  };

  const loadChapterTests = async (chapId: string) => {
    try {
      setLoadingHierarchy(true);
      const res = await apiService.testSeries.getTestsByChapter(chapId, { page: 1, limit: 500 });
      setChapterTests(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch(e) {} finally {
      setLoadingHierarchy(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selectedSubjectId) loadChapters(selectedSubjectId);
  }, [selectedSubjectId]);

  useEffect(() => {
    if (activeMainTab === 'curriculum' && selectedChapterId) {
      loadChapterTests(selectedChapterId);
    }
  }, [activeMainTab, selectedChapterId]);

  const catalogTotalTests = useMemo(() => seriesCatalog.reduce((sum, row) => sum + Number(row.count || 0), 0), [seriesCatalog]);

  const seriesOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    if (activeMainTab === 'all') {
      return seriesCatalog
        .map((row) => [String(row.seriesType || ''), Number(row.count || 0)] as [string, number])
        .filter(([series, count]) => {
          if (!series && count <= 0) return false;
          if (!q) return true;
          return prettySeriesLabel(series).toLowerCase().includes(q) || series.toLowerCase().includes(q);
        })
        .sort((a, b) => sortSeriesByLabelAsc(a[0], b[0]));
    }
    
    // For curriculum tab with chapter selected
    const bySeries = new Map<string, number>();
    chapterTests.forEach((t: any) => {
      const key = String(t.seriesType || t.testSeriesDetails?.seriesType || t.testId || 'OTHER');
      bySeries.set(key, (bySeries.get(key) || 0) + 1);
    });
    return [...bySeries.entries()].sort((a, b) => sortSeriesByLabelAsc(a[0], b[0]));
    
  }, [activeMainTab, search, seriesCatalog, chapterTests]);

  const seriesCatalogCompletionMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of seriesCatalog) map[String(row.seriesType || '')] = Number(row.completedCount || 0);
    return map;
  }, [seriesCatalog]);

  const activeFilterCount = [selectedClass !== 'all', selectedCoaching !== 'all', showFreeOnly, showCompletedOnly].filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Hero Header */}
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 20 }}>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>Test Series</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{activeMainTab === 'all' && seriesCatalog.length ? catalogTotalTests : chapterTests.length} tests available</Text>
          </View>
          <Pressable onPress={() => setShowFilters(!showFilters)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: showFilters ? colors.primary : colors.muted, alignItems: 'center', justifyContent: 'center' }}>
            <SlidersHorizontal size={16} color={showFilters ? '#fff' : colors.mutedForeground} />
            {activeFilterCount > 0 && (
              <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.destructive, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={{ position: 'relative', marginBottom: 12 }}>
          <View style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }}><Search size={16} color={colors.mutedForeground} /></View>
          <TextInput
            value={search} onChangeText={setSearch} placeholder="Search series..." placeholderTextColor={colors.mutedForeground}
            style={{ height: 40, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingLeft: 36, paddingRight: 36, color: colors.foreground, fontSize: 14 }}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} style={{ position: 'absolute', right: 12, top: 12, zIndex: 1 }}>
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        {/* Main Tab Switcher */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.muted, padding: 4, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border + '80' }}>
          <Pressable onPress={() => setActiveMainTab('all')} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: activeMainTab === 'all' ? colors.card : 'transparent', shadowColor: activeMainTab === 'all' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}>
            <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '700', color: activeMainTab === 'all' ? colors.primary : colors.mutedForeground }}>All Series</Text>
          </Pressable>
          <Pressable onPress={() => setActiveMainTab('curriculum')} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: activeMainTab === 'curriculum' ? colors.card : 'transparent', shadowColor: activeMainTab === 'curriculum' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}>
            <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '700', color: activeMainTab === 'curriculum' ? colors.primary : colors.mutedForeground }}>Chapter Series</Text>
          </Pressable>
        </View>

        {/* Hierarchical Controls */}
        {activeMainTab === 'curriculum' && (
          <View style={{ marginBottom: 20 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              {subjects.map(sub => (
                <Pressable key={sub._id} onPress={() => { setSelectedSubjectId(sub._id); setSelectedChapterId(null); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: selectedSubjectId === sub._id ? colors.primary : colors.border, backgroundColor: selectedSubjectId === sub._id ? colors.primary : colors.card }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: selectedSubjectId === sub._id ? '#fff' : colors.mutedForeground }}>{sub.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {selectedSubjectId && (
              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' }}>
                <View style={{ padding: 12, backgroundColor: colors.muted + '4D', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 }}>Chapters</Text>
                </View>
                <View style={{ padding: 8, gap: 8 }}>
                  {loadingHierarchy && !chapters.length ? (
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, padding: 8 }}>Loading chapters...</Text>
                  ) : chapters.length > 0 ? (
                    chapters.map(ch => {
                      const isSelected = selectedChapterId === ch._id;
                      return (
                        <View key={ch._id} style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                          <Pressable onPress={() => setSelectedChapterId(isSelected ? null : ch._id)}
                            style={{ width: '100%', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isSelected ? colors.secondary : colors.card }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#fff' : colors.foreground, flex: 1, paddingRight: 8 }}>{ch.name}</Text>
                            <ChevronRight size={16} color={isSelected ? '#fff' : colors.mutedForeground} style={{ transform: [{ rotate: isSelected ? '90deg' : '0deg' }] }} />
                          </Pressable>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ fontSize: 10, color: colors.mutedForeground, fontStyle: 'italic', padding: 8 }}>No chapters found</Text>
                  )}
                </View>
              </View>
            )}
            {selectedChapterId && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 }}>Results for chapter</Text>
                <Pressable onPress={() => setSelectedChapterId(null)}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>Clear Selection</Text></Pressable>
              </View>
            )}
          </View>
        )}

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <MotiView from={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Filter size={14} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>Filters</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.background }}>
                    <Pressable onPress={() => setSelectedClass(selectedClass === 'all' ? '12' : selectedClass === '12' ? '11' : 'all')} style={{ padding: 8 }}>
                      <Text style={{ fontSize: 12, color: colors.foreground }}>{classLabel[selectedClass]}</Text>
                    </Pressable>
                  </View>
                  <View style={{ flex: 1, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.background }}>
                    <Pressable onPress={() => setSelectedCoaching(selectedCoaching === 'all' ? 'self' : 'all')} style={{ padding: 8 }}>
                      <Text style={{ fontSize: 12, color: colors.foreground }}>{coachingLabel[selectedCoaching]}</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Pressable onPress={() => setShowFreeOnly(!showFreeOnly)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: showFreeOnly ? colors.primary : colors.border, backgroundColor: showFreeOnly ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {showFreeOnly && <CheckCircle2 size={12} color="#fff" />}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Free only</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowCompletedOnly(!showCompletedOnly)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: showCompletedOnly ? colors.primary : colors.border, backgroundColor: showCompletedOnly ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {showCompletedOnly && <CheckCircle2 size={12} color="#fff" />}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Completed</Text>
                  </Pressable>
                </View>
              </View>
            </MotiView>
          )}
        </AnimatePresence>

        {/* Loading / Error / Empty states */}
        {loading && !seriesOptions.length ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Loading tests...</Text>
          </View>
        ) : error ? (
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.destructive + '4D', backgroundColor: colors.destructive + '0D', padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.destructive }}>{error}</Text>
            <Pressable onPress={loadData} style={{ marginTop: 8 }}><Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Retry</Text></Pressable>
          </View>
        ) : seriesOptions.length === 0 && (activeMainTab === 'all' || (activeMainTab === 'curriculum' && selectedChapterId)) ? (
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 32, alignItems: 'center' }}>
            <BookOpen size={40} color={colors.mutedForeground} style={{ opacity: 0.4, marginBottom: 8 }} />
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{activeMainTab === 'curriculum' ? 'No series found for this chapter' : 'No series found'}</Text>
          </View>
        ) : activeMainTab === 'curriculum' && !selectedChapterId ? (
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 32, alignItems: 'center' }}>
            <BookOpen size={40} color={colors.mutedForeground} style={{ opacity: 0.4, marginBottom: 8 }} />
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Select a chapter to see series</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {activeMainTab === 'all' && !search && (
               <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }}>
                 <Pressable onPress={() => router.push('/(auth)/test/custom')} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                   <View style={{ width: '100%', borderRadius: 16, borderWidth: 2, borderColor: colors.primary + '66', backgroundColor: colors.primary + '0D', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                     <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '26', alignItems: 'center', justifyContent: 'center' }}>
                       <Zap size={20} color={colors.primary} />
                     </View>
                     <View style={{ flex: 1 }}>
                       <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Custom Test Generator</Text>
                       <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>Pick any chapter & subtopics from 34K+ questions</Text>
                     </View>
                     <ChevronRight size={20} color={colors.primary} />
                   </View>
                 </Pressable>
               </MotiView>
            )}

            {seriesOptions.map(([series, count], idx) => {
              const IconComp = seriesIcons[series] || FileText;
              return (
                <MotiView key={series} from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: idx * 0.04 }}>
                  <Pressable onPress={() => router.push(`/(auth)/tests/${encodeURIComponent(series)}` as any)} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                    <View style={{ width: '100%', borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' }}>
                        <IconComp size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{prettySeriesLabel(series)}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <FileText size={12} color={colors.primary} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>{count} tests</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12} color={colors.success} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.success }}>Completed {activeMainTab === 'all' ? (seriesCatalogCompletionMap[series] || 0) : 0}/{count}</Text>
                          </View>
                        </View>
                      </View>
                      <ChevronRight size={20} color={colors.mutedForeground} />
                    </View>
                  </Pressable>
                </MotiView>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
