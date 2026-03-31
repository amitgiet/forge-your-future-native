import React from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import type { GridlockItem } from '@/components/toppers/types';
import EmptyResourceState from '@/components/toppers/EmptyResourceState';
import { toDirectImageUrl } from '@/components/toppers/utils';
import { useTheme } from '@/contexts/ThemeContext';

export default function GridlockViewer({ gridlocks }: { gridlocks: GridlockItem[] }) {
  const { colors } = useTheme();

  if (!gridlocks.length) {
    return <EmptyResourceState title="Gridlocks unavailable" description="No gridlock resources are available for this chapter." />;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 24 }}>
      {gridlocks.map((gridlock, index) => (
        <View key={gridlock.uniqueId} style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 20, paddingVertical: 16 }}>
            <Text style={{ fontSize: 12, textTransform: 'uppercase', color: colors.mutedForeground }}>Gridlock {index + 1}</Text>
            <Text style={{ marginTop: 4, fontSize: 18, fontWeight: '700', color: colors.foreground }}>{gridlock.title || 'Gridlock Board'}</Text>
          </View>
          <ScrollView horizontal contentContainerStyle={{ padding: 16 }}>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(gridlock.columns || []).map((column, columnIndex) => (
                  <View key={`${gridlock.uniqueId}-head-${columnIndex}`} style={{ minWidth: 180, borderRadius: 16, backgroundColor: colors.primary + '1A', paddingHorizontal: 16, paddingVertical: 12 }}>
                    <Text style={{ fontSize: 12, textTransform: 'uppercase', color: colors.primary }}>{column.header || `Column ${columnIndex + 1}`}</Text>
                  </View>
                ))}
              </View>
              {Array.from({ length: Math.max(...(gridlock.columns || []).map((column) => (column.cells || []).length), 0) }).map((_, rowIndex) => (
                <View key={`${gridlock.uniqueId}-row-${rowIndex}`} style={{ flexDirection: 'row', gap: 8 }}>
                  {(gridlock.columns || []).map((column, columnIndex) => {
                    const cell = column.cells?.[rowIndex];
                    return (
                      <View key={`${gridlock.uniqueId}-${columnIndex}-${rowIndex}`} style={{ minWidth: 180, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 12 }}>
                        {cell?.isImage ? (
                          <Image source={{ uri: toDirectImageUrl(cell.driveLink || '', (cell as any).driveId || null) }} style={{ width: 156, height: 160, borderRadius: 12, resizeMode: 'contain' }} />
                        ) : (
                          <Text style={{ fontSize: 14, lineHeight: 20, color: colors.foreground }}>{cell?.value || '\u2014'}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}
