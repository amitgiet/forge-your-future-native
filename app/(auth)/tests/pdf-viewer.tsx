import React, { useState } from 'react';
import { View, Text, Pressable, Linking, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { WebView } from 'react-native-webview';

const extractDriveFileId = (urlValue: string): string | null => {
  const url = String(urlValue || '').trim();
  if (!url) return null;

  const byQuery = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (byQuery?.[1]) return byQuery[1];

  const byPath = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (byPath?.[1]) return byPath[1];

  return null;
};

const toEmbedPdfUrl = (urlValue: string): string => {
  const raw = String(urlValue || '').trim();
  if (!raw) return raw;

  if (/drive\.google\.com|googleusercontent\.com/i.test(raw)) {
    const fileId = extractDriveFileId(raw);
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  }

  return raw;
};

export default function PDFViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  
  const [loading, setLoading] = useState(true);

  const rawUrl = params.url || '';
  const embedUrl = toEmbedPdfUrl(rawUrl);

  const handleOpenExternal = () => {
    if (rawUrl) {
      Linking.openURL(rawUrl);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>
              {params.title || 'PDF Viewer'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>In-App PDF Reader</Text>
          </View>
          {rawUrl ? (
            <Pressable onPress={handleOpenExternal} style={{ padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <ExternalLink size={20} color={colors.foreground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={{ flex: 1, position: 'relative' }}>
        {!rawUrl ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
             <Text style={{ fontSize: 14, color: colors.mutedForeground }}>No PDF URL provided.</Text>
          </View>
        ) : (
          <>
            <WebView
              source={{ uri: embedUrl }}
              style={{ flex: 1, backgroundColor: colors.background }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
            {loading && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background + '80' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
