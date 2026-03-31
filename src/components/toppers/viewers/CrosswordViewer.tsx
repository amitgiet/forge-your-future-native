import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import type { ContentItem } from '@/components/toppers/types';
import EmptyResourceState from '@/components/toppers/EmptyResourceState';
import { toEmbedDriveUrl } from '@/components/toppers/utils';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
  crosswords: ContentItem[];
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  onBackToList: () => void;
};

export default function CrosswordViewer({ crosswords, selectedIndex, onSelectIndex, onBackToList }: Props) {
  const { colors } = useTheme();

  const validCrosswords = useMemo(
    () => crosswords.filter((crossword) => Boolean(String(crossword.question || crossword.driveLink || '').trim())),
    [crosswords]
  );

  if (!crosswords.length) {
    return <EmptyResourceState title="Crosswords unavailable" description="No crossword entries are available for this chapter." />;
  }

  if (!validCrosswords.length) {
    return <EmptyResourceState title="Crosswords unavailable" description="No playable crossword links are available for this chapter." />;
  }

  const resolvedIndex = selectedIndex !== null ? Math.max(0, Math.min(selectedIndex, validCrosswords.length - 1)) : null;
  const selectedCrossword = resolvedIndex !== null ? validCrosswords[resolvedIndex] : null;
  const selectedUrl = selectedCrossword ? String(selectedCrossword.question || selectedCrossword.driveLink || '').trim() : '';
  const embedUrl = selectedCrossword ? toEmbedDriveUrl(selectedUrl) : '';

  if (selectedCrossword && resolvedIndex !== null) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 20, paddingVertical: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={onBackToList} style={{ width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
              <ArrowLeft size={16} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{selectedCrossword.title || `Crossword ${resolvedIndex + 1}`}</Text>
            </View>
          </View>
        </View>
        <WebView source={{ uri: embedUrl }} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
      <View style={{ marginBottom: 4 }}>
        <Text style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.mutedForeground }}>Toppers' Essentials</Text>
        <Text style={{ marginTop: 8, fontSize: 20, fontWeight: '700', color: colors.foreground }}>Crosswords</Text>
        <Text style={{ marginTop: 4, fontSize: 14, color: colors.mutedForeground }}>Select a crossword to open it in full screen.</Text>
      </View>

      {validCrosswords.map((crossword, index) => (
        <Pressable
          key={crossword.uniqueId}
          onPress={() => onSelectIndex(index)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 16 }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.mutedForeground }}>{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', lineHeight: 20, color: colors.foreground }}>{crossword.title || `Crossword ${index + 1}`}</Text>
          </View>
          <ChevronRight size={16} color={colors.mutedForeground} />
        </Pressable>
      ))}
    </ScrollView>
  );
}
