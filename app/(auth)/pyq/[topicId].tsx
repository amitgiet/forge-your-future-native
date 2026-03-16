import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, AlertCircle, ExternalLink } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import apiService from '@/lib/apiService';
import { API_BASE_URL } from '@/lib/api';
import WebView from 'react-native-webview';

interface Topic {
  _id: string;
  topicName: string;
  url: string;
  subject: string;
  stream?: string;
}

const optimizeHtmlForMobile = (html: string): string => {
  const patch = `
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style id="pyq-mobile-patch">
html, body {
  max-width: 100% !important;
  padding: 0 16px !important;
}
body {
  margin: 0 auto !important;
  padding: 8px 12px !important;
  box-sizing: border-box !important;
  word-break: break-word !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  line-height: 1.6 !important;
}
img, table, pre, iframe, video, svg, canvas {
  max-width: 100% !important;
  height: auto !important;
}
table {
  display: block !important;
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch !important;
}
</style>
<script>
(function () {
  function fitToMobileWidth() {
    var d = document.documentElement;
    var b = document.body;
    if (!b) return;
    b.style.zoom = '1';
    var contentWidth = Math.max(d.scrollWidth || 0, b.scrollWidth || 0);
    var viewportWidth = window.innerWidth || d.clientWidth || 360;
    var scale = contentWidth > viewportWidth ? Math.max(0.55, viewportWidth / contentWidth) : 1;
    b.style.zoom = String(scale);
  }
  window.addEventListener('load', fitToMobileWidth);
  window.addEventListener('resize', fitToMobileWidth);
  setTimeout(fitToMobileWidth, 0);
  setTimeout(fitToMobileWidth, 300);
})();
</script>`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${patch}`);
  }
  return `<head>${patch}</head>${html}`;
};

export default function PYQTopicViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { topicId } = useLocalSearchParams<{ topicId: string }>();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [iframeHtml, setIframeHtml] = useState<string | null>(null);

  useEffect(() => {
    fetchTopicDetails();
  }, [topicId]);

  const fetchTopicDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!topicId) { setError('Topic ID is missing'); return; }
      const response = await apiService.pyqMarkedNCERT.getTopicById(topicId as string);
      if (response.data?.success && response.data?.data) {
        setTopic(response.data.data);
      } else {
        setError('Failed to load topic details');
      }
    } catch (err) {
      console.error('Error fetching topic:', err);
      setError('Failed to load topic. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const proxiedUrl = useMemo(() => {
    if (!topic?.url) return '';
    return `${API_BASE_URL}/api/v1/pyq-marked-ncert/html-proxy?url=${encodeURIComponent(String(topic.url).trim())}`;
  }, [topic?.url]);

  useEffect(() => {
    if (!proxiedUrl) return;
    let cancelled = false;

    const loadIframeHtml = async () => {
      try {
        setIframeLoaded(false);
        setIframeError(null);
        setIframeHtml(null);
        const response = await fetch(proxiedUrl, { method: 'GET' });
        if (!response.ok) throw new Error(`Proxy load failed (${response.status})`);
        const html = await response.text();
        if (!cancelled) setIframeHtml(optimizeHtmlForMobile(html));
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading proxied PYQ HTML:', err);
          setIframeError('Could not load content. Please open in a new tab.');
          setIframeLoaded(true);
        }
      }
    };

    loadIframeHtml();
    return () => { cancelled = true; };
  }, [proxiedUrl]);

  const openInNewTab = () => {
    if (topic?.url) {
      Linking.openURL(topic.url);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 12 }} />
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Loading topic...</Text>
        </View>
      </View>
    );
  }

  if (error || !topic) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{ 
          backgroundColor: colors.card, 
          borderWidth: 1, 
          borderColor: colors.border, 
          borderRadius: 12, 
          padding: 24, 
          alignItems: 'center',
          maxWidth: 384,
          width: '100%',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        }}>
          <AlertCircle size={40} color={colors.destructive} style={{ marginBottom: 12 }} />
          <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16, marginBottom: 4 }}>Error Loading Topic</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 14, marginBottom: 20, textAlign: 'center' }}>{error}</Text>
          <Pressable
            onPress={() => router.back()}
            style={{ paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primary }}
          >
            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky Header */}
      <View style={{ 
        paddingTop: insets.top,
        backgroundColor: colors.card + 'F2', // 95% opacity
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        zIndex: 20
      }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
              pressed && { backgroundColor: colors.muted }
            ]}
          >
            <ChevronLeft size={20} color={colors.foreground} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>
              {topic.topicName}
            </Text>
            <Text style={{ fontSize: 11, color: colors.mutedForeground, textTransform: 'capitalize' }} numberOfLines={1}>
              {topic.subject} {topic.stream ? `· ${topic.stream}` : ''}
            </Text>
          </View>

          <Pressable
            onPress={openInNewTab}
            style={({ pressed }) => [
              { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.border },
              pressed && { borderColor: colors.primary + '66' } // 40% opacity
            ]}
          >
            <ExternalLink size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Loading overlay for the manual fetch */}
        {!iframeHtml && !iframeError && (
          <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, zIndex: 10 }}>
            <View style={{ alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Loading PYQ content...</Text>
            </View>
          </View>
        )}

        {iframeError && (
          <View style={{ marginHorizontal: 12, marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.destructive + '4D', backgroundColor: colors.destructive + '1A', padding: 12 }}>
            <Text style={{ fontSize: 14, color: colors.destructive }}>{iframeError}</Text>
          </View>
        )}

        {iframeHtml ? (
          <WebView
            source={{ html: iframeHtml, baseUrl: proxiedUrl }}
            originWhitelist={['*']}
            onLoadEnd={() => { setIframeLoaded(true); setIframeError(null); }}
            onError={(syntheticEvent) => { 
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error: ', nativeEvent);
              setIframeLoaded(true); 
              setIframeError('Could not load content. Please open in a new tab.'); 
            }}
            style={{ flex: 1, backgroundColor: 'transparent', minHeight: 400 }}
            containerStyle={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            allowsInlineMediaPlayback={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            startInLoadingState={true}
            renderLoading={() => (
              <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Rendering...</Text>
              </View>
            )}
          />
        ) : null}
      </View>
    </View>
  );
}
