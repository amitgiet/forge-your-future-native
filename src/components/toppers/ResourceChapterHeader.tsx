import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
  title: string;
  subtitle: string;
  categories: number;
  totalItems: number;
  onBack: () => void;
};

export default function ResourceChapterHeader({ title, subtitle, categories, totalItems, onBack }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Pressable
          onPress={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <ArrowLeft size={16} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.mutedForeground }}>
            Toppers' Essentials
          </Text>
          <Text style={{ marginTop: 4, fontSize: 20, fontWeight: '700', color: colors.foreground }}>{title}</Text>
          <Text style={{ marginTop: 4, fontSize: 14, color: colors.mutedForeground }}>{subtitle}</Text>
        </View>
        <View style={{ borderRadius: 16, padding: 12, backgroundColor: '#f59e0b1A' }}>
          <Sparkles size={20} color="#f59e0b" />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <View style={{ flex: 1, borderRadius: 16, backgroundColor: colors.primary + '1A', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ fontSize: 12, textTransform: 'uppercase', color: colors.mutedForeground }}>Categories</Text>
          <Text style={{ marginTop: 4, fontSize: 20, fontWeight: '700', color: colors.primary }}>{categories}</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 16, backgroundColor: '#f59e0b1A', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ fontSize: 12, textTransform: 'uppercase', color: colors.mutedForeground }}>Items</Text>
          <Text style={{ marginTop: 4, fontSize: 20, fontWeight: '700', color: '#f59e0b' }}>{totalItems}</Text>
        </View>
      </View>
    </View>
  );
}
