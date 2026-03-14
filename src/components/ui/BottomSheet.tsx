import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, Text } from 'react-native';
import GorhomBottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/contexts/ThemeContext';

interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  title?: string;
  onClose?: () => void;
}

export const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetProps>(
  ({ children, snapPoints: customSnaps, title, onClose }, ref) => {
    const { colors, shadows } = useTheme();
    const snapPoints = useMemo(() => customSnaps || ['50%', '80%'], [customSnaps]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      []
    );

    return (
      <GorhomBottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={(index) => {
          if (index === -1) onClose?.();
        }}
        backgroundStyle={{
          backgroundColor: colors.card,
          borderRadius: 20,
          ...shadows.elevated,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground, width: 40 }}
      >
        <BottomSheetView style={{ flex: 1, padding: 20 }}>
          {title && (
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.foreground,
                marginBottom: 16,
                fontFamily: 'PlusJakartaSans_700Bold',
              }}
            >
              {title}
            </Text>
          )}
          {children}
        </BottomSheetView>
      </GorhomBottomSheet>
    );
  }
);
