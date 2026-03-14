import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  Star,
  Send,
  XCircle,
  CheckCircle,
} from "lucide-react-native";

export type QuestionState =
  | "not-visited"
  | "not-answered"
  | "answered"
  | "marked-review"
  | "answered-marked";

export interface QuestionMeta {
  state: QuestionState;
  selectedOption: number | null;
  bookmarked: boolean;
  note: string;
  timeSpent: number;
}

export interface NTAQuestion {
  _id?: string;
  id?: string;
  question: string;
  options: Record<string, string> | string[];
  correctAnswer?: string | number | null;
  explanation?: string;
  imageUrl?: string;
  difficulty?: string;
  marks?: number;
}

export interface NTASection {
  name: string;
  emoji?: string;
  startIndex: number;
  endIndex: number;
}

export interface NTASubmitData {
  answers: (number | null)[];
  meta: QuestionMeta[];
  timeTaken: number;
}

interface NTATestPlayerProps {
  questions: NTAQuestion[];
  sections?: NTASection[];
  title?: string;
  duration: number;
  onSubmit: (data: NTASubmitData) => void | Promise<void>;
  readOnly?: boolean;
}

const optionKeys = ["A", "B", "C", "D"];

const getOptions = (q: NTAQuestion): string[] => {
  if (Array.isArray(q.options)) return q.options;
  return optionKeys
    .map((k) => (q.options as Record<string, string>)[k] ?? "")
    .filter(Boolean);
};

export const NTATestPlayer = ({
  questions,
  sections: sectionsProp,
  title = "Test",
  duration,
  onSubmit,
  readOnly = false,
}: NTATestPlayerProps) => {
  const { colors } = useTheme();
  const total = questions.length;
  const sections = useMemo(() => {
    if (sectionsProp && sectionsProp.length > 0) return sectionsProp;
    if (total <= 50)
      return [{ name: "All", startIndex: 0, endIndex: total - 1 }];
    const defaultSections: NTASection[] = [
      {
        name: "Physics",
        emoji: "⚛️",
        startIndex: 0,
        endIndex: Math.min(total - 1, 44),
      },
      {
        name: "Chemistry",
        emoji: "🧪",
        startIndex: 45,
        endIndex: Math.min(total - 1, 89),
      },
      { name: "Biology", emoji: "🧬", startIndex: 90, endIndex: total - 1 },
    ];
    return defaultSections.filter((s) => s.startIndex < total);
  }, [sectionsProp, total]);

  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [meta, setMeta] = useState<QuestionMeta[]>(() =>
    Array.from({ length: total }, () => ({
      state: "not-visited",
      selectedOption: null,
      bookmarked: false,
      note: "",
      timeSpent: 0,
    })),
  );
  const questionStartRef = useRef(Date.now());

  useEffect(() => {
    if (readOnly) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [readOnly]);

  useEffect(() => {
    setMeta((prev) => {
      const next = [...prev];
      const current = next[currentQ];
      if (current.state === "not-visited") {
        next[currentQ] = { ...current, state: "not-answered" };
      }
      return next;
    });
    questionStartRef.current = Date.now();
  }, [currentQ]);

  const recordTime = useCallback(() => {
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    setMeta((prev) => {
      const next = [...prev];
      next[currentQ] = {
        ...next[currentQ],
        timeSpent: next[currentQ].timeSpent + elapsed,
      };
      return next;
    });
  }, [currentQ]);

  const updateAnswer = (index: number) => {
    if (readOnly) return;
    setMeta((prev) => {
      const next = [...prev];
      const cur = next[currentQ];
      const nowState: QuestionState =
        cur.state === "marked-review" || cur.state === "answered-marked"
          ? "answered-marked"
          : "answered";
      next[currentQ] = { ...cur, selectedOption: index, state: nowState };
      return next;
    });
  };

  const clearAnswer = () => {
    if (readOnly) return;
    setMeta((prev) => {
      const next = [...prev];
      const cur = next[currentQ];
      next[currentQ] = {
        ...cur,
        selectedOption: null,
        state:
          cur.state === "marked-review" || cur.state === "answered-marked"
            ? "marked-review"
            : "not-answered",
      };
      return next;
    });
  };

  const toggleReview = () => {
    if (readOnly) return;
    setMeta((prev) => {
      const next = [...prev];
      const cur = next[currentQ];
      if (cur.state === "marked-review" || cur.state === "answered-marked") {
        next[currentQ] = {
          ...cur,
          state: cur.selectedOption !== null ? "answered" : "not-answered",
        };
      } else {
        next[currentQ] = {
          ...cur,
          state:
            cur.selectedOption !== null ? "answered-marked" : "marked-review",
        };
      }
      return next;
    });
  };

  const toggleBookmark = () => {
    setMeta((prev) => {
      const next = [...prev];
      next[currentQ] = {
        ...next[currentQ],
        bookmarked: !next[currentQ].bookmarked,
      };
      return next;
    });
  };

  const goTo = (index: number) => {
    if (index < 0 || index >= total) return;
    recordTime();
    setCurrentQ(index);
  };

  const nextQuestion = () => {
    recordTime();
    if (currentQ < total - 1) setCurrentQ(currentQ + 1);
  };

  const handleSubmit = async () => {
    recordTime();
    const answers = meta.map((m) => m.selectedOption);
    await onSubmit({ answers, meta, timeTaken: duration - timeLeft });
  };

  const current = questions[currentQ];
  const opts = getOptions(current);
  const curMeta = meta[currentQ];
  const timerClass =
    timeLeft < 300
      ? colors.destructive
      : timeLeft < 900
        ? colors.warning
        : colors.primary;
  const fmtTime = `${Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`;

  const stats = useMemo(() => {
    const out = {
      answered: 0,
      notAnswered: 0,
      markedReview: 0,
      notVisited: 0,
      answeredMarked: 0,
    };
    meta.forEach((m) => {
      out[
        m.state === "answered-marked"
          ? "answeredMarked"
          : m.state === "answered"
            ? "answered"
            : m.state === "not-visited"
              ? "notVisited"
              : m.state === "not-answered"
                ? "notAnswered"
                : "markedReview"
      ]++;
    });
    return out;
  }, [meta]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          padding: 12,
          borderBottomWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {title}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 6,
              borderRadius: 10,
              backgroundColor: colors.primary + "20",
            }}
          >
            <Clock size={14} color={timerClass} />
            <Text
              style={{ color: timerClass, fontWeight: "700", marginLeft: 4 }}
            >
              {fmtTime}
            </Text>
          </View>
        </View>
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Badge variant="secondary">
            Q {currentQ + 1}/{total}
          </Badge>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Badge variant="outline">{current.difficulty ?? "Medium"}</Badge>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: 12 }}>
        <View
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 14,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Question {currentQ + 1}
          </Text>
          <Text style={{ color: colors.foreground, lineHeight: 22 }}>
            {current.question}
          </Text>
          {current.imageUrl ? (
            <Image
              source={{ uri: current.imageUrl }}
              style={{
                width: "100%",
                height: 170,
                borderRadius: 10,
                marginTop: 10,
              }}
              resizeMode="cover"
            />
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          {opts.map((opt, idx) => {
            const selected = curMeta.selectedOption === idx;
            const right = { A: 0, B: 1, C: 2, D: 3 };
            const correct =
              typeof current.correctAnswer === "string"
                ? right[current.correctAnswer as string]
                : current.correctAnswer;
            const isCorrect = readOnly && correct === idx;
            const isWrong = readOnly && selected && correct !== idx;
            return (
              <Pressable
                key={`opt-${idx}`}
                onPress={() => updateAnswer(idx)}
                disabled={readOnly}
                style={({ pressed }) => ({
                  borderWidth: 1,
                  borderColor: isCorrect
                    ? colors.success
                    : isWrong
                      ? colors.destructive
                      : selected
                        ? colors.primary
                        : colors.border,
                  backgroundColor: selected
                    ? colors.primary + "20"
                    : colors.card,
                  borderRadius: 12,
                  padding: 12,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                    {optionKeys[idx]}.{" "}
                  </Text>
                  <Text style={{ color: colors.foreground, flex: 1 }}>
                    {opt}
                  </Text>
                  {isCorrect ? (
                    <CheckCircle size={16} color={colors.success} />
                  ) : null}
                  {isWrong ? (
                    <XCircle size={16} color={colors.destructive} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {readOnly && current.explanation ? (
          <View
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              backgroundColor: colors.success + "10",
              borderWidth: 1,
              borderColor: colors.success + "30",
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontWeight: "600",
                marginBottom: 4,
              }}
            >
              Explanation
            </Text>
            <Text style={{ color: colors.foreground }}>
              {current.explanation}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          padding: 12,
          borderTopWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
          <Button variant="outline" size="sm" onPress={clearAnswer}>
            Clear
          </Button>
          <Button
            variant={curMeta.state.includes("marked") ? "secondary" : "outline"}
            size="sm"
            onPress={toggleReview}
          >
            <Flag size={16} color={colors.foreground} />
            {curMeta.state.includes("marked") ? "Unmark" : "Mark Review"}
          </Button>
          <Button
            variant={curMeta.bookmarked ? "secondary" : "outline"}
            size="sm"
            onPress={toggleBookmark}
          >
            <Star size={16} color={colors.foreground} /> Bookmark
          </Button>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Pressable
            onPress={() => goTo(currentQ - 1)}
            disabled={currentQ === 0}
            style={styles.navBtn}
          >
            <ChevronLeft
              size={18}
              color={
                currentQ === 0 ? colors.mutedForeground : colors.foreground
              }
            />
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
            <Button
              variant="secondary"
              size="sm"
              onPress={nextQuestion}
              disabled={currentQ >= total - 1}
            >
              Next
            </Button>
            <Button
              variant="primary"
              size="sm"
              onPress={() => goTo(currentQ + 1)}
              disabled={currentQ >= total - 1}
            >
              Q {currentQ + 2}
            </Button>
          </View>
          <Button variant="destructive" size="sm" onPress={handleSubmit}>
            <Send size={16} color="#fff" />
            Submit
          </Button>
        </View>

        <ScrollView horizontal style={{ marginTop: 8 }}>
          {meta.map((m, i) => (
            <Pressable
              key={`pal-${i}`}
              onPress={() => goTo(i)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: i === currentQ ? colors.primary : colors.border,
                backgroundColor:
                  m.selectedOption != null
                    ? colors.success + "20"
                    : colors.card,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 6,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 12 }}>
                {i + 1}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#999",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default NTATestPlayer;
