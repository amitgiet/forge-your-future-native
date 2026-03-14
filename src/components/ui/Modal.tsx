import React from 'react';
import { Modal as RNModal, View, Pressable, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal = ({ visible, onClose, title, children }: ModalProps) => {
  const { colors, shadows } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            ...shadows.elevated,
          }}
        >
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
        </Pressable>
      </Pressable>
    </RNModal>
  );
};
