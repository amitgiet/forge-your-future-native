import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BookOpen, Grid3x3, Headphones, ImageIcon, Puzzle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { ResourceTile, ResourceTypeKey } from '@/components/toppers/types';

const iconMap = {
  notes: BookOpen,
  podcasts: Headphones,
  crosswords: Puzzle,
  memes: ImageIcon,
  gridlocks: Grid3x3,
};

const accentMap: Record<ResourceTypeKey, string> = {
  notes: '#3b82f6',
  podcasts: '#f59e0b',
  crosswords: '#22c55e',
  memes: '#3b82f6',
  gridlocks: '#f59e0b',
};

type Props = {
  tiles: ResourceTile[];
  onSelect: (key: ResourceTypeKey) => void;
};

export default function ResourceTypeGrid({ tiles, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {tiles.map((tile) => {
        const Icon = iconMap[tile.key];
        const accent = accentMap[tile.key];

        return (
          <Pressable
            key={tile.key}
            onPress={() => onSelect(tile.key)}
            style={{
              width: '48%',
              minHeight: 164,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: 16,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
              <Icon size={24} color={accent} />
            </View>
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>{tile.title}</Text>
              <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: colors.mutedForeground }}>{tile.description}</Text>
              <Text style={{ marginTop: 12, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: colors.primary }}>{tile.countLabel}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
