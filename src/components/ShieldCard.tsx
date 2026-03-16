import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { MotiView, MotiText } from 'moti';
import { Shield, Pause, Play } from 'lucide-react-native';
import Svg, { Circle, LinearGradient as SvgGradient, Defs, Stop } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';

interface ShieldCardProps {
  initialMinutes?: number;
}

const ShieldCard = ({ initialMinutes = 25 }: ShieldCardProps) => {
  const { colors } = useTheme();
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isPaused, setIsPaused] = useState(false);

  const totalSeconds = initialMinutes * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePause = () => {
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5 * 60 * 1000);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  // SVG circle — matches web exactly
  const R = 28;
  const circumference = 2 * Math.PI * R;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400 }}
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow — matches web -top-8 -left-8 w-32 h-32 */}
      <View
        style={{
          position: 'absolute',
          top: -32,
          left: -32,
          width: 128,
          height: 128,
          borderRadius: 64,
          backgroundColor: colors.primary + '33',
        }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {/* Circular Progress SVG — matches web exactly */}
          <View style={{ width: 64, height: 64, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={64} height={64} viewBox="0 0 64 64" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Defs>
                <SvgGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#6366F1" />
                  <Stop offset="50%" stopColor="#8B5CF6" />
                  <Stop offset="100%" stopColor="#EC4899" />
                </SvgGradient>
              </Defs>
              {/* Track circle */}
              <Circle
                cx="32" cy="32" r={R}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={5}
              />
              {/* Progress arc */}
              <Circle
                cx="32" cy="32" r={R}
                fill="none"
                stroke="url(#shieldGradient)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </Svg>
            {/* Shield icon overlay */}
            <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color={isPaused ? colors.mutedForeground : colors.primary} />
            </View>
          </View>

          {/* Timer + Label */}
          <View>
            <Text style={{
              fontSize: 11, fontWeight: '500', color: colors.mutedForeground,
              fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
            }}>
              Focus Shield
            </Text>
            <MotiText
              animate={timeLeft <= 60 && !isPaused ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ loop: timeLeft <= 60, duration: 500 }}
              style={{ fontSize: 30, fontWeight: '800', color: colors.primary, fontFamily: 'Inter_700Bold' }}
            >
              {formatTime(timeLeft)}
            </MotiText>
            {isPaused && (
              <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 200 }}>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: 'Inter_400Regular' }}>
                  Paused for 5 min
                </Text>
              </MotiView>
            )}
          </View>
        </View>

        {/* Pause/Resume button */}
        <Pressable
          onPress={isPaused ? handleResume : handlePause}
          style={({ pressed }) => ({
            width: 44, height: 44, borderRadius: 12,
            borderWidth: 1,
            borderColor: isPaused ? colors.success + '50' : colors.primary + '50',
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'transparent',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {isPaused
            ? <Play size={20} color={colors.success} />
            : <Pause size={20} color={colors.primary} />
          }
        </Pressable>
      </View>
    </MotiView>
  );
};

export default ShieldCard;
