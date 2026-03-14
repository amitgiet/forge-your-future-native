import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Shield, Pause, Play } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatIcon } from '@/components/ui/StatIcon';

interface ShieldCardProps {
  initialMinutes?: number;
}

export const ShieldCard = ({ initialMinutes = 25 }: ShieldCardProps) => {
  const { colors } = useTheme();
  const totalSeconds = initialMinutes * 60;
  const [timeRemaining, setTimeRemaining] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearTimer();
    }

    return clearTimer;
  }, [isRunning, clearTimer]);

  const toggleTimer = () => {
    if (timeRemaining === 0) {
      setTimeRemaining(totalSeconds);
      setIsRunning(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progress = timeRemaining / totalSeconds; // 1 = full, 0 = done
  const ringSize = 120;
  const borderW = 6;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400 }}
    >
      <GlassCard>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <StatIcon color={colors.secondary}>
            <Shield size={20} color={colors.secondary} />
          </StatIcon>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: colors.foreground,
              fontFamily: 'Inter_700Bold',
            }}
          >
            Shield
          </Text>
        </View>

        {/* Timer Ring */}
        <View style={{ alignItems: 'center', gap: 16 }}>
          <View
            style={{
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: borderW,
              borderColor: colors.muted,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Progress overlay — we use a simple approach with a colored border.
                The trick: we render an absolutely-positioned ring on top with the
                active color. We clip it by using a rotating mask approach.
                For simplicity, we use a single-ring approach with opacity-mapped
                border segments via 4 quarter-arcs. */}

            {/* Simplified: overlay ring with active color, full circle, then
                cover the "empty" portion with background-colored arcs.
                Easiest RN approach: just show a full colored border whose
                opacity reflects progress. */}
            <View
              style={{
                position: 'absolute',
                top: -borderW,
                left: -borderW,
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderWidth: borderW,
                borderColor: progress > 0 ? colors.primary : 'transparent',
                opacity: progress,
              }}
            />

            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: colors.foreground,
                fontFamily: 'Inter_700Bold',
                letterSpacing: 1,
              }}
            >
              {formatted}
            </Text>
          </View>

          {/* Play / Pause Button */}
          <Pressable
            onPress={toggleTimer}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {isRunning ? (
              <Pause size={24} color="#ffffff" />
            ) : (
              <Play size={24} color="#ffffff" />
            )}
          </Pressable>
        </View>
      </GlassCard>
    </MotiView>
  );
};

export default ShieldCard;
