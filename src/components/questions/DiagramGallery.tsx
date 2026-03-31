import React from 'react';
import { View, Text, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { ResolvedDiagram } from '@/lib/questionNormalization';

interface DiagramGalleryProps {
  diagrams?: ResolvedDiagram[];
  style?: any;
}

const DiagramGallery: React.FC<DiagramGalleryProps> = ({ diagrams = [], style }) => {
  const { colors } = useTheme();
  const visibleDiagrams = Array.isArray(diagrams)
    ? diagrams.filter((entry) => entry && (entry.imageUrl || entry.status === 'missing' || entry.status === 'error'))
    : [];

  if (!visibleDiagrams.length) return null;

  return (
    <View style={[{ gap: 8 }, style]}>
      {visibleDiagrams.map((diagram, index) => (
        diagram.imageUrl ? (
          <View
            key={`${diagram.ref}-${index}`}
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Image
              source={{ uri: diagram.imageUrl }}
              style={{ width: '100%', height: 240, resizeMode: 'contain' }}
            />
          </View>
        ) : (
          <View
            key={`${diagram.ref}-${index}`}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.muted + '66',
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {`Diagram not available${diagram.ref ? ` (${diagram.ref})` : ''}.`}
            </Text>
          </View>
        )
      ))}
    </View>
  );
};

export default DiagramGallery;
