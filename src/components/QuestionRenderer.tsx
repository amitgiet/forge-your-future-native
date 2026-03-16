import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Image, Pressable } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { QuizOption } from "@/components/ui/QuizOption";
import { GlassCard } from "@/components/ui/GlassCard";
import { CheckCircle, XCircle } from "lucide-react-native";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QuestionData {
  _id?: string;
  id?: string;
  question: string;
  type:
    | "mcq"
    | "fill-blank"
    | "numeric"
    | "numerical"
    | "match"
    | "diagram-label";
  options?: { A?: string; B?: string; C?: string; D?: string };
  typeData?: {
    leftItems?: string[];
    rightItems?: string[];
    imageUrl?: string;
    labels?: { id: string; x: number; y: number }[];
    correctAnswer?: string;
    unit?: string;
    tolerance?: number;
  };
  correctAnswer?: string | number;
  explanation?: string;
  tolerance?: number; // for numerical tolerance checking
}

interface QuestionRendererProps {
  question: QuestionData;
  onAnswer?: (answer: string | number | null | [number, number][]) => void;
  showResult?: boolean;
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const QuestionRenderer = ({
  question,
  onAnswer,
  showResult = false,
  disabled = false,
}: QuestionRendererProps) => {
  const { colors } = useTheme();

  const [selected, setSelected] = useState<string | null>(null);
  const [textValue, setTextValue] = useState("");
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Array<[number, number]>>([]);

  // Reset state when question changes
  useEffect(() => {
    setSelected(null);
    setTextValue("");
    setSelectedLeft(null);
    setMatches([]);
  }, [question._id, question.id]);

  /* ---- MCQ ---- */

  const handleMCQSelect = (option: string) => {
    if (disabled) return;
    const next = selected === option ? null : option;
    setSelected(next);
    onAnswer?.(next);
  };

  const getMCQState = (
    optionKey: string,
  ): "default" | "selected" | "correct" | "incorrect" => {
    if (showResult) {
      const isCorrect =
        typeof question.correctAnswer === "string" &&
        question.correctAnswer === optionKey;
      const isSelected = selected === optionKey;
      if (isCorrect) return "correct";
      if (isSelected && !isCorrect) return "incorrect";
      return "default";
    }
    return selected === optionKey ? "selected" : "default";
  };

  /* ---- Fill-blank ---- */

  const handleFillBlank = (text: string) => {
    setTextValue(text);
    onAnswer?.(text || null);
  };

  const isFillCorrect = () => {
    if (!showResult || !question.correctAnswer) return null;
    return (
      textValue.trim().toLowerCase() ===
      String(question.correctAnswer).trim().toLowerCase()
    );
  };

  /* ---- Numerical ---- */

  const handleNumerical = (text: string) => {
    setTextValue(text);
    const num = parseFloat(text);
    onAnswer?.(isNaN(num) ? null : num);
  };

  const isNumericalCorrect = () => {
    if (!showResult || question.correctAnswer == null) return null;
    const userNum = parseFloat(textValue);
    if (isNaN(userNum)) return false;
    const correct = Number(question.correctAnswer);
    const tolerance = question.tolerance ?? 0;
    return Math.abs(userNum - correct) <= tolerance;
  };

  const handleMatchPair = (leftIndex: number, rightIndex: number) => {
    if (disabled) return;
    const existing = matches.findIndex((m) => m[0] === leftIndex);
    const next = [...matches];
    if (existing >= 0) {
      next[existing] = [leftIndex, rightIndex];
    } else {
      next.push([leftIndex, rightIndex]);
    }
    setMatches(next);
    onAnswer?.(next);
  };

  /* ---- Render ---- */

  const qType = question.type;
  const leftItems = question.typeData?.leftItems || [];
  const rightItems = question.typeData?.rightItems || [];
  const diagramLabels = question.typeData?.labels || [];
  const imageUrl = question.typeData?.imageUrl;

  return (
    <View style={{ gap: 12 }}>
      {/* Question text */}
      <GlassCard>
        <Text
          style={{
            fontSize: 16,
            color: colors.foreground,
            fontFamily: "Inter_500Medium",
            lineHeight: 24,
          }}
        >
          {question.question}
        </Text>
      </GlassCard>

      {/* MCQ Options */}
      {qType === "mcq" && question.options && (
        <View style={{ gap: 10 }}>
          {OPTION_LABELS.map((label) => {
            const text = question.options?.[label];
            if (!text) return null;
            return (
              <QuizOption
                key={label}
                label={label}
                text={text}
                state={getMCQState(label)}
                disabled={disabled || showResult}
                onPress={() => handleMCQSelect(label)}
              />
            );
          })}
        </View>
      )}

      {/* Match */}
      {qType === "match" && (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Match the items
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1, gap: 6 }}>
              {leftItems.map((item, index) => (
                <Pressable
                  key={`left-${index}`}
                  onPress={() => setSelectedLeft(index)}
                  style={{
                    borderWidth: 1,
                    borderColor:
                      selectedLeft === index ? colors.primary : colors.border,
                    backgroundColor:
                      selectedLeft === index
                        ? colors.primary + "20"
                        : colors.card,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <Text style={{ color: colors.foreground }}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              {rightItems.map((item, index) => (
                <Pressable
                  key={`right-${index}`}
                  onPress={() => {
                    if (selectedLeft !== null)
                      handleMatchPair(selectedLeft, index);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    padding: 10,
                    backgroundColor:
                      selectedLeft !== null
                        ? colors.secondary + "15"
                        : colors.card,
                  }}
                >
                  <Text style={{ color: colors.foreground }}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {matches.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Selected pairs:
              </Text>
              {matches.map(([l, r], i) => (
                <Text
                  key={`pair-${i}`}
                  style={{ color: colors.foreground, fontSize: 12 }}
                >
                  {leftItems[l] ?? "-"} ↔ {rightItems[r] ?? "-"}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Diagram Label */}
      {qType === "diagram-label" && (
        <View style={{ gap: 10 }}>
          {imageUrl ? (
            <View
              style={{
                width: "100%",
                height: 180,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: colors.border,
              }}
            >
              <Image
                source={{ uri: imageUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              {diagramLabels.map((label, idx) => (
                <Text
                  key={`label-${idx}`}
                  style={{
                    position: "absolute",
                    left: `${label.x}%`,
                    top: `${label.y}%`,
                    backgroundColor: colors.background + "cc",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                    fontSize: 12,
                    color: colors.foreground,
                  }}
                >
                  {label.id}
                </Text>
              ))}
            </View>
          ) : (
            <View
              style={{
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.mutedForeground }}>
                Diagram image not available
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Fill-in-the-blank */}
      {qType === "fill-blank" && (
        <View style={{ gap: 8 }}>
          <TextInput
            value={textValue}
            onChangeText={handleFillBlank}
            placeholder="Type your answer"
            placeholderTextColor={colors.mutedForeground}
            editable={!disabled && !showResult}
            style={{
              minHeight: 48,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              fontFamily: "Inter_400Regular",
              backgroundColor: colors.input,
              color: colors.foreground,
              borderWidth: showResult ? 2 : 1,
              borderColor: showResult
                ? isFillCorrect()
                  ? colors.success
                  : colors.destructive
                : colors.border,
            }}
          />
          {showResult && question.correctAnswer != null && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              {isFillCorrect() ? (
                <CheckCircle size={16} color={colors.success} />
              ) : (
                <XCircle size={16} color={colors.destructive} />
              )}
              <Text
                style={{
                  fontSize: 14,
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                }}
              >
                Correct answer: {String(question.correctAnswer)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Numerical */}
      {(qType === "numeric" || qType === "numerical") && (
        <View style={{ gap: 8 }}>
          <TextInput
            value={textValue}
            onChangeText={handleNumerical}
            placeholder="Enter numerical answer"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            editable={!disabled && !showResult}
            style={{
              minHeight: 48,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              fontFamily: "Inter_400Regular",
              backgroundColor: colors.input,
              color: colors.foreground,
              borderWidth: showResult ? 2 : 1,
              borderColor: showResult
                ? isNumericalCorrect()
                  ? colors.success
                  : colors.destructive
                : colors.border,
            }}
          />
          {showResult && question.correctAnswer != null && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              {isNumericalCorrect() ? (
                <CheckCircle size={16} color={colors.success} />
              ) : (
                <XCircle size={16} color={colors.destructive} />
              )}
              <Text
                style={{
                  fontSize: 14,
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                }}
              >
                Correct answer: {String(question.correctAnswer)}
                {question.tolerance ? ` (±${question.tolerance})` : ""}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Explanation (shown in result mode) */}
      {showResult && question.explanation && (
        <GlassCard
          style={{
            backgroundColor: colors.success + "08",
            borderColor: colors.success + "30",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.success,
              fontFamily: "Inter_600SemiBold",
              marginBottom: 6,
            }}
          >
            Explanation
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.foreground,
              fontFamily: "Inter_400Regular",
              lineHeight: 22,
            }}
          >
            {question.explanation}
          </Text>
        </GlassCard>
      )}
    </View>
  );
};

export default QuestionRenderer;
