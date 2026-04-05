// LearnScreen.tsx — 선크림 유형 알아가기
import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar,
} from "react-native";
import { SkinTypeResult, RESULTS } from "./skintype";
import SkinTypeScreen from "./SkinTypeScreen";

interface Props {
  skinResult?: SkinTypeResult;
  onQuizComplete: (result: SkinTypeResult) => void;
}

export default function LearnScreen({ skinResult, onQuizComplete }: Props) {
  const [showQuiz, setShowQuiz] = useState(false);

  if (showQuiz) {
    return (
      <SkinTypeScreen
        onComplete={(r) => { setShowQuiz(false); onQuizComplete(r); }}
        onSkip={() => setShowQuiz(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.pageTitle}>선크림 유형 알아가기</Text>
        <Text style={styles.pageSub}>내 피부에 맞는 선크림을 선택하세요</Text>

        {/* 피부 분석 결과 배지 */}
        {skinResult ? (
          <TouchableOpacity onPress={() => setShowQuiz(true)} style={styles.resultBanner}>
            <View>
              <Text style={styles.resultBannerLabel}>내 피부 분석 결과</Text>
              <Text style={styles.resultBannerValue}>{skinResult.title} 추천</Text>
            </View>
            <Text style={styles.resultBannerArrow}>다시 검사 →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setShowQuiz(true)} style={styles.quizBanner}>
            <Text style={styles.quizBannerTitle}>🔍 피부 타입 분석하기</Text>
            <Text style={styles.quizBannerSub}>5가지 질문으로 맞춤 선크림 유형을 추천해드려요</Text>
            <View style={styles.quizBtn}>
              <Text style={styles.quizBtnText}>설문 시작 →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 무기자차 카드 */}
        <TypeCard
          result={RESULTS.mineral}
          accentColor="#60c4a0"
          highlight={skinResult?.type === "mineral"}
        />

        {/* 유기자차 카드 */}
        <TypeCard
          result={RESULTS.chemical}
          accentColor="#60a5fa"
          highlight={skinResult?.type === "chemical"}
        />

        {/* 혼합형 카드 */}
        <TypeCard
          result={RESULTS.hybrid}
          accentColor="#c084fc"
          highlight={skinResult?.type === "hybrid"}
        />

        {/* 선택 기준 요약 */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>💡 선택 기준 요약</Text>
          {[
            { cond: "민감성·아토피·로사세아·어린이·임산부", rec: "무기자차" },
            { cond: "지성·복합성·일상 메이크업 베이스", rec: "유기자차" },
            { cond: "정상·혼합·야외 활동", rec: "혼합형" },
          ].map((row, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryLeft}>{row.cond}</Text>
              <Text style={styles.summaryRight}>→ {row.rec}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function TypeCard({ result, accentColor, highlight }: {
  result: SkinTypeResult;
  accentColor: string;
  highlight?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      style={[styles.typeCard, highlight && { borderColor: accentColor, borderWidth: 1.5 }]}
      activeOpacity={0.85}
    >
      <View style={styles.typeCardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: accentColor + "22" }]}>
          <Text style={[styles.typeBadgeText, { color: accentColor }]}>{result.title}</Text>
        </View>
        {highlight && (
          <View style={[styles.myTypeBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.myTypeBadgeText}>내 추천</Text>
          </View>
        )}
        <Text style={styles.expandIcon}>{expanded ? "▲" : "▼"}</Text>
      </View>

      <Text style={styles.typeDesc}>{result.description}</Text>

      {expanded && (
        <>
          <View style={styles.divider} />
          <Text style={[styles.sectionLabel, { color: accentColor }]}>주요 성분</Text>
          {result.ingredients.map((ing, i) => (
            <Text key={i} style={styles.ingredient}>• {ing}</Text>
          ))}
          <View style={styles.divider} />
          <Text style={[styles.sectionLabel, { color: accentColor }]}>장점</Text>
          {result.pros.map((p, i) => (
            <Text key={i} style={styles.pro}>• {p}</Text>
          ))}
          <View style={styles.cautionBox}>
            <Text style={styles.cautionText}>⚠ {result.caution}</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  container: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: "900", color: "#FFD060", marginBottom: 4 },
  pageSub: { fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 },

  resultBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(96,196,160,0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(96,196,160,0.3)",
    padding: 14,
    marginBottom: 16,
  },
  resultBannerLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 3 },
  resultBannerValue: { fontSize: 16, fontWeight: "800", color: "#60c4a0" },
  resultBannerArrow: { fontSize: 12, color: "rgba(255,255,255,0.35)" },

  quizBanner: {
    backgroundColor: "rgba(255,208,96,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,208,96,0.2)",
    padding: 16,
    marginBottom: 16,
  },
  quizBannerTitle: { fontSize: 16, fontWeight: "800", color: "#FFD060", marginBottom: 4 },
  quizBannerSub: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12 },
  quizBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#FFD060",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quizBtnText: { fontSize: 13, fontWeight: "700", color: "#0f1923" },

  typeCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    marginBottom: 12,
  },
  typeCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 13, fontWeight: "700" },
  myTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  myTypeBadgeText: { fontSize: 11, fontWeight: "700", color: "#0f1923" },
  expandIcon: { marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.3)" },
  typeDesc: { fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 19 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 6 },
  ingredient: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 3 },
  pro: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 3 },
  cautionBox: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  cautionText: { fontSize: 12, color: "#f59e0b", lineHeight: 17 },

  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: "#fff", marginBottom: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  summaryLeft: { fontSize: 12, color: "rgba(255,255,255,0.5)", flex: 1 },
  summaryRight: { fontSize: 12, fontWeight: "700", color: "#FFD060" },
});
