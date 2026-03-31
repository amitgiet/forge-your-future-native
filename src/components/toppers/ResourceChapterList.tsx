import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { ResourceChapterSummary } from '@/components/toppers/types';
import EmptyResourceState from '@/components/toppers/EmptyResourceState';

type Props = {
  chapters: ResourceChapterSummary[];
  loading?: boolean;
  onSelect: (chapter: ResourceChapterSummary) => void;
};

export default function ResourceChapterList({ chapters, loading, onSelect }: Props) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!chapters.length) {
    return (
      <EmptyResourceState
        title="No resource chapters yet"
        description="This subject does not have Toppers' Essentials chapters available right now."
      />
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {chapters.map((chapter, index) => (
        <Pressable
          key={chapter.slug}
          onPress={() => onSelect(chapter)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            padding: 16,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primary + '1A',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'uppercase' }}>
              {chapter.chapterName}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: colors.mutedForeground }}>
              {chapter.availableResourceTypes.length} resource type{chapter.availableResourceTypes.length === 1 ? '' : 's'}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.mutedForeground} />
        </Pressable>
      ))}
    </View>
  );
}
