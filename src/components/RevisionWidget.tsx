import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { Brain, ArrowRight } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadDueQuestions } from "@/store/slices/neuronzSlice";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatIcon } from "@/components/ui/StatIcon";
import { Button } from "@/components/ui/Button";

export const RevisionWidget = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { dueQuestions, isLoading } = useAppSelector((state) => state.neuronz);

  useEffect(() => {
    dispatch(loadDueQuestions());
  }, [dispatch]);

  if (isLoading || !dueQuestions || dueQuestions.total === 0) {
    return null;
  }

  const l2Count = dueQuestions.byLevel.L2?.length ?? 0;
  const l3Count = dueQuestions.byLevel.L3?.length ?? 0;

  const stats = [
    { label: "Due", value: dueQuestions.total, color: colors.primary },
    { label: "L2", value: l2Count, color: colors.warning },
    { label: "L3", value: l3Count, color: colors.success },
  ];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 400 }}
    >
      <GlassCard>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <StatIcon color={colors.secondary}>
              <Brain size={20} color={colors.secondary} />
            </StatIcon>
            <View style={{ gap: 2 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                }}
              >
                NeuronZ Due Today
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                }}
              >
                {dueQuestions.total} questions waiting
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/(auth)/revision")}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.primary,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              View All
            </Text>
            <ArrowRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: stat.color + "10",
                borderRadius: 10,
                padding: 12,
                alignItems: "center",
                gap: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: stat.color,
                  fontFamily: "Inter_700Bold",
                }}
              >
                {stat.value}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Start Button */}
        <Button onPress={() => router.push("/(auth)/revision")}>
          {`Start Revision (${dueQuestions.total})`}
        </Button>
      </GlassCard>
    </MotiView>
  );
};

export default RevisionWidget;
