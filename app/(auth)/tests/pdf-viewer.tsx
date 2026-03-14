import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, ExternalLink } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

export default function PDFViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ url?: string; title?: string }>();

  const handleOpenExternal = () => {
    if (params.url) {
      Linking.openURL(params.url);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>
            {params.title || 'PDF Viewer'}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <GlassCard style={{ alignItems: 'center', gap: 16, paddingVertical: 40, width: '100%' }}>
          <View style={{ padding: 20, borderRadius: 20, backgroundColor: colors.primary + '15' }}>
            <FileText size={48} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' }}>
            {params.title || 'PDF Document'}
          </Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 22 }}>
            PDF viewing is available in the browser. Tap below to open this document.
          </Text>
          {params.url ? (
            <Button onPress={handleOpenExternal}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ExternalLink size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Open in Browser</Text>
              </View>
            </Button>
          ) : (
            <Text style={{ fontSize: 13, color: colors.destructive }}>No PDF URL provided.</Text>
          )}
        </GlassCard>
      </View>
    </View>
  );
}
