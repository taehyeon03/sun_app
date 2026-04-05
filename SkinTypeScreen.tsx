// SkinTypeScreen.tsx — 피부 타입 결정 트리 설문 + 무기/유기자차 추천
import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView,
} from "react-native";
import { QUIZ_QUESTIONS, calcRecommendation, SkinTypeResult, SunscreenType } from "./skintype";

interface Props {
  onComplete: (result: SkinTypeResult) => void;
  onSkip: () => void;
}

const TYPE_COLOR: Record<SunscreenType, string> = {
  mineral:  "#60c4a0",
  chemical: "#60a5fa",
  hybrid:   "#c084fc",
};

const TYPE_EMOJI: Record<SunscreenType, string> = {
  mineral:  "🛡",
  chemical: "💧",
  hybrid:   "⚡",
};

export default function SkinTypeScreen({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SkinTypeResult | null>(null);

  const totalSteps = QUIZ_QUESTIONS.length;
  const currentQ = QUIZ_QUESTIONS[step];
  const progress = (step / totalSteps) * 100;

  const handleAnswer = (optionId: string) => {
    const newAnswers = { ...answers, [currentQ.id]: optionId };
    setAnswers(newAnswers);

    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      setResult(calcRecommendation(newAnswers));
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  // ── 결과 화면 ────────────────────────────────────────────────────────────────
  if (result) {
    const accentColor = TYPE_COLOR[result.type];
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.resultEmoji}>{TYPE_EMOJI[result.type]}</Text>
          <Text style={[styles.resultBadge, { backgroundColor: accentColor + "22", color: accentColor }]}>
            {result.title} 추천
          </Text>
          <Text style={styles.resultTitle}>{result.title}가 적합해요</Text>
          <Text style={styles.resultDesc}>{result.description}</Text>

          <View style={[styles.card, { borderColor: accentColor + "33" }]}>
            <Text style={[styles.cardTitle, { color: accentColor }]}>장점</Text>
            {result.pros.map((p, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={[styles.bullet, { color: accentColor }]}>•</Text>
                <Text style={styles.bulletText}>{p}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { borderColor: accentColor + "33" }]}>
            <Text style={[styles.cardTitle, { color: accentColor }]}>주요 성분</Text>
            {result.ingredients.map((ing, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={[styles.bullet, { color: accentColor }]}>•</Text>
                <Text style={styles.bulletText}>{ing}</Text>
              </View>
            ))}
          </View>

          <View style={styles.cautionBox}>
            <Text style={styles.cautionTitle}>⚠ 주의사항</Text>
            <Text style={styles.cautionText}>{result.caution}</Text>
          </View>

          <TouchableOpacity
            onPress={() => onComplete(result)}
            style={[styles.ctaBtn, { backgroundColor: accentColor }]}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>이 타입으로 타이머 설정하기 →</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSkip} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>설정 없이 시작하기</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 설문 화면 ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      <View style={styles.container}>

        {/* 상단 진행 바 */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.stepHeader}>
          {step > 0 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← 이전</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 60 }} />}
          <Text style={styles.stepCount}>{step + 1} / {totalSteps}</Text>
          <TouchableOpacity onPress={onSkip} style={styles.backBtn}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.questionArea}>
          <Text style={styles.questionTitle}>피부 타입 분석</Text>
          <Text style={styles.questionText}>{currentQ.question}</Text>
          {currentQ.subtext && (
            <Text style={styles.questionSub}>{currentQ.subtext}</Text>
          )}
        </View>

        <View style={styles.optionsArea}>
          {currentQ.options.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => handleAnswer(opt.id)}
              style={[
                styles.optionBtn,
                answers[currentQ.id] === opt.id && styles.optionBtnSelected,
              ]}
              activeOpacity={0.75}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <Text style={[
                styles.optionLabel,
                answers[currentQ.id] === opt.id && styles.optionLabelSelected,
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  container: { flex: 1, padding: 20 },

  // 진행 바
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFD060",
    borderRadius: 2,
  },

  // 상단 헤더
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 14, color: "rgba(255,255,255,0.5)" },
  skipText: { fontSize: 13, color: "rgba(255,255,255,0.35)" },
  stepCount: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: "600" },

  // 질문
  questionArea: { marginBottom: 32 },
  questionTitle: {
    fontSize: 12,
    color: "#FFD060",
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  questionText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 30,
    marginBottom: 6,
  },
  questionSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
  },

  // 선택지
  optionsArea: { gap: 10 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    gap: 14,
  },
  optionBtnSelected: {
    backgroundColor: "rgba(255,208,96,0.12)",
    borderColor: "#FFD060",
  },
  optionEmoji: { fontSize: 22, width: 30, textAlign: "center" },
  optionLabel: { fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: "500", flex: 1 },
  optionLabelSelected: { color: "#FFD060", fontWeight: "700" },

  // 결과 화면
  resultEmoji: { fontSize: 56, textAlign: "center", marginTop: 20, marginBottom: 12 },
  resultBadge: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
    overflow: "hidden",
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  resultDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  bullet: { fontSize: 14, lineHeight: 20 },
  bulletText: { fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 20, flex: 1 },

  cautionBox: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  cautionTitle: { fontSize: 13, color: "#f59e0b", fontWeight: "700", marginBottom: 6 },
  cautionText: { fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 19 },

  ctaBtn: {
    borderRadius: 10,
    padding: 17,
    alignItems: "center",
    marginBottom: 12,
  },
  ctaBtnText: { fontSize: 15, fontWeight: "700", color: "#0f1923" },
  skipLink: { alignItems: "center", paddingVertical: 8 },
  skipLinkText: { fontSize: 13, color: "rgba(255,255,255,0.3)" },
});
