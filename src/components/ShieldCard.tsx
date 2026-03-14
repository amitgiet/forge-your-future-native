import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { MotiView } from "moti";
import { Shield, Pause, Play } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatIcon } from "@/components/ui/StatIcon";

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
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progress = timeRemaining / totalSeconds; // 1 = full, 0 = done
  const ringSize = 120;
  const borderW = 6;

  const { t } = useLanguage();
  const title = t("dashboard.shield") || "Shield";
  const ringRadius = 44;
  const circumference = 2 * Math.PI * ringRadius;
  const progressDash = circumference * (1 - progress);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 400 }}
    >
      <GlassCard>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <StatIcon color={colors.secondary}>
              <Shield size={20} color={colors.secondary} />
            </StatIcon>
            <View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                }}
              >
                {title}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                  marginTop: 2,
                }}
              >
                {initialMinutes}-minute focus timer
              </Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.primary,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            {formatted}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 20,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Svg width={ringRadius * 2 + 8} height={ringRadius * 2 + 8}>
              <Circle
                cx={ringRadius + 4}
                cy={ringRadius + 4}
                r={ringRadius}
                stroke={colors.muted}
                strokeWidth={8}
                fill="none"
              />
              <Circle
                cx={ringRadius + 4}
                cy={ringRadius + 4}
                r={ringRadius}
                stroke={colors.primary}
                strokeWidth={8}
                fill="none"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={progressDash}
                strokeLinecap="round"
                rotation="-90"
                origin={`${ringRadius + 4}, ${ringRadius + 4}`}
              />
            </Svg>
            <Text
              style={{
                marginTop: 6,
                fontSize: 12,
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
              }}
            >
              {Math.round(progress * 100)}% left
            </Text>
          </View>

          <Pressable
            onPress={toggleTimer}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {isRunning ? (
              <Pause size={24} color="#fff" />
            ) : (
              <Play size={24} color="#fff" />
            )}
          </Pressable>
        </View>
      </GlassCard>
    </MotiView>
  );
};

export default ShieldCard;
