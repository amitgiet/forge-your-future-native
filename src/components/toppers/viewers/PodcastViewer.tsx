import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import type { ContentItem } from '@/components/toppers/types';
import EmptyResourceState from '@/components/toppers/EmptyResourceState';
import { toEmbedDriveUrl } from '@/components/toppers/utils';
import { useTheme } from '@/contexts/ThemeContext';

type Lang = 'en' | 'hi';

function isGoogleDriveUrl(value?: string | null): boolean {
  return /google\.com|googleusercontent\.com/i.test(String(value || '').trim());
}

function resolveAudioSource(
  driveLink?: string | null,
  driveId?: string | null,
): { url: string | null; isEmbedMode: boolean } {
  const rawLink = String(driveLink || '').trim();

  if (rawLink) {
    if (isGoogleDriveUrl(rawLink)) return { url: toEmbedDriveUrl(rawLink), isEmbedMode: true };
    return { url: rawLink, isEmbedMode: false };
  }

  if (driveId) {
    return { url: `https://drive.google.com/file/d/${driveId}/preview?rm=minimal`, isEmbedMode: true };
  }

  return { url: null, isEmbedMode: false };
}

export default function PodcastViewer({ podcasts }: { podcasts: ContentItem[] }) {
  const { colors } = useTheme();
  const [lang, setLang] = useState<Lang>('hi');

  if (!podcasts.length) {
    return <EmptyResourceState title="Podcast unavailable" description="No podcast episodes are available for this chapter." />;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <View style={{ position: 'relative', flexDirection: 'row', borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 4 }}>
          <View style={{ position: 'absolute', top: 4, bottom: 4, left: lang === 'hi' ? 4 : '50%', width: '49%', borderRadius: 999, backgroundColor: colors.primary }} />
          <Pressable onPress={() => setLang('hi')} style={{ zIndex: 1, paddingHorizontal: 20, paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: lang === 'hi' ? '#fff' : colors.mutedForeground }}>{"\uD83C\uDDEE\uD83C\uDDF3 हिंदी"}</Text>
          </Pressable>
          <Pressable onPress={() => setLang('en')} style={{ zIndex: 1, paddingHorizontal: 20, paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: lang === 'en' ? '#fff' : colors.mutedForeground }}>{"\uD83C\uDDEC\uD83C\uDDE7 English"}</Text>
          </Pressable>
        </View>
      </View>

      {podcasts.map((podcast, index) => {
        const audioSource = lang === 'hi'
          ? resolveAudioSource(podcast.hindiDriveLink || podcast.driveLink, podcast.hindiDriveLink ? null : (podcast.hindiDriveId || podcast.driveId))
          : resolveAudioSource(podcast.englishDriveLink || podcast.driveLink, podcast.englishDriveLink ? null : (podcast.englishDriveId || podcast.driveId));

        const { url: audioUrl, isEmbedMode } = audioSource;

        return (
          <View key={podcast.uniqueId} style={{ borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '1A' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, textTransform: 'uppercase', color: colors.mutedForeground }}>
                  Episode {index + 1}
                  <Text style={{ marginLeft: 8, color: '#34d399', fontSize: 10, fontWeight: '700' }}>
                    {lang === 'hi' ? ' हिंदी AI Voice' : ' English AI Voice'}
                  </Text>
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ marginTop: 4, fontSize: 16, fontWeight: '700', color: colors.foreground }}
                >
                  {podcast.title || 'Podcast Episode'}
                </Text>
              </View>
            </View>

            {podcast.question ? <Text style={{ marginTop: 12, fontSize: 14, lineHeight: 20, color: colors.mutedForeground }}>{podcast.question}</Text> : null}

            <View style={{ marginTop: 16, overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, minHeight: 112 }}>
              {audioUrl ? (
                isEmbedMode ? (
                  <WebView source={{ uri: audioUrl }} style={{ height: 112 }} />
                ) : (
                  <WebView source={{ html: `<audio controls preload="metadata" style="width:100%;margin-top:36px;"><source src="${audioUrl}" /></audio>` }} style={{ height: 112 }} />
                )
              ) : (
                <View style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Audio not yet available</Text>
                </View>
              )}
            </View>

            {!audioUrl ? <Text style={{ marginTop: 8, fontSize: 12, textAlign: 'center', color: '#f59e0b' }}>AI audio generation pending for this episode</Text> : null}
          </View>
        );
      })}
    </ScrollView>
  );
}
