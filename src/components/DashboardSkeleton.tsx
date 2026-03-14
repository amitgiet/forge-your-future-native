import React from 'react';
import { View } from 'react-native';
import { Skeleton } from './ui/Skeleton';
import { useTheme } from '@/contexts/ThemeContext';

export const DashboardSkeleton = () => {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 16 }}>
      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 8,
              padding: 14,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Skeleton width={40} height={40} borderRadius={12} />
            <Skeleton width={40} height={20} />
            <Skeleton width={60} height={10} />
          </View>
        ))}
      </View>

      {/* Today's progress */}
      <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 20, gap: 12 }}>
        <Skeleton width={120} height={16} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Skeleton width={50} height={24} />
              <Skeleton width={60} height={10} />
            </View>
          ))}
        </View>
      </View>

      {/* Daily challenge */}
      <Skeleton height={120} borderRadius={12} />

      {/* Quick actions */}
      <View style={{ gap: 8 }}>
        <Skeleton width={120} height={16} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={{ width: '30%' }}>
              <Skeleton height={90} borderRadius={8} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default DashboardSkeleton;
