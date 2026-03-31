import React, { useMemo, useState } from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import type { PageFile, NotesResource } from '@/components/toppers/types';
import EmptyResourceState from '@/components/toppers/EmptyResourceState';
import { getPageImageCandidates, toEmbedDriveUrl } from '@/components/toppers/utils';
import { useTheme } from '@/contexts/ThemeContext';

function NotesPageImage({ page }: { page: PageFile }) {
  const { colors } = useTheme();
  const candidates = useMemo(() => getPageImageCandidates(page), [page]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const src = candidates[candidateIndex] || '';

  if (!src) {
    return (
      <View style={{ minHeight: 180, borderRadius: 16, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 14, textAlign: 'center', color: colors.mutedForeground }}>Image URL missing for page {page.pageId}</Text>
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.muted }}>
      <Image
        source={{ uri: src }}
        style={{
          width: '100%',
          aspectRatio: aspectRatio || 1 / 1.414,
          minHeight: 480,
          backgroundColor: colors.muted,
          resizeMode: 'contain',
        }}
        onLoad={(event) => {
          const width = event?.nativeEvent?.source?.width;
          const height = event?.nativeEvent?.source?.height;
          if (width && height) {
            setAspectRatio(width / height);
          }
        }}
        onError={() => {
          if (candidateIndex < candidates.length - 1) {
            setCandidateIndex((current) => current + 1);
          }
        }}
      />
    </View>
  );
}

export default function NotesViewer({ notes }: { notes?: NotesResource }) {
  const { colors } = useTheme();

  if (!notes?.mode) {
    return <EmptyResourceState title="Notes unavailable" description="This chapter does not have notes available yet." />;
  }

  if (notes.mode === 'pdf' && notes.driveLink) {
    return <WebView source={{ uri: toEmbedDriveUrl(notes.driveLink) }} style={{ flex: 1 }} startInLoadingState />;
  }

  if (notes.mode === 'image_pages' && (notes.pageFiles || []).length > 0) {
    return (
      <ScrollView contentContainerStyle={{ alignSelf: 'center', width: '100%', maxWidth: 960, paddingHorizontal: 16, paddingVertical: 16, gap: 16, paddingBottom: 24 }}>
        {(notes.pageFiles || []).map((page) => (
          <View key={page.pageId} style={{ width: '100%', borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 8 }}>
            <NotesPageImage page={page} />
          </View>
        ))}
      </ScrollView>
    );
  }

  return <EmptyResourceState title="Notes unavailable" description="The notes payload is incomplete for this chapter." />;
}
