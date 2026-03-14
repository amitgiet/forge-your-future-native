import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, BookOpen, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

export default function NCERTSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const res = await apiService.ncertSearch.getTopics({ query: text.trim(), limit: 20 });
        if (res.data?.success) {
          setResults(res.data.data || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }, 500);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }}>
            NCERT Search
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Input
            placeholder="Search topics, concepts, chapters..."
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Searching...</Text>
          </View>
        ) : results.length > 0 ? (
          <View style={{ gap: 10 }}>
            {results.map((topic: any, i: number) => (
              <Pressable
                key={topic._id || i}
                onPress={() => router.push({
                  pathname: '/(auth)/ncert/reader',
                  params: { topicId: topic._id, title: topic.title || topic.name },
                } as any)}
              >
                <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.primary + '15' }}>
                    <BookOpen size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                      {topic.title || topic.name}
                    </Text>
                    {topic.subject && (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <Badge variant="outline">{topic.subject}</Badge>
                        {topic.chapter && <Badge variant="primary">{topic.chapter}</Badge>}
                      </View>
                    )}
                  </View>
                  <ChevronRight size={18} color={colors.mutedForeground} />
                </GlassCard>
              </Pressable>
            ))}
          </View>
        ) : searched && !loading ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <Search size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No results found</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center' }}>
              Try different keywords or check the spelling
            </Text>
          </GlassCard>
        ) : (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <Search size={40} color={colors.mutedForeground} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>Search NCERT Content</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
              Search across all NCERT topics and concepts.{'\n'}Type at least 2 characters to begin.
            </Text>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}
