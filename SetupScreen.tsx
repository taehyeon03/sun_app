// src/screens/SetupScreen.tsx
// 선크림 설정 화면 – 제품 형태 / SPF / UV 환경 선택

import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ProductType, SpfLevel, UvLevel,
  REAPPLY_RULES, calcReapplyMinutes, formatDuration,
} from "./sunscreen";

export interface SunscreenConfig {
  productType: ProductType;
  spfLevel: SpfLevel;
  uvLevel: UvLevel;
  sweating: boolean;
  reapplyMins: number;
  amount: number;
  appliedAt: Date;
}

interface Props {
  onStart: (config: SunscreenConfig) => void;
}

const PRODUCT_TYPES = [
  { id: "cream" as ProductType, label: "크림 / 로션", emoji: "🧴", desc: "일반 선크림 — 가장 높은 균일 도포" },
  { id: "stick" as ProductType, label: "고체 / 스틱", emoji: "💄", desc: "스틱형 — 도포량 부족 경향, 권장량 더 필요" },
  { id: "spray" as ProductType, label: "스프레이 / 미스트", emoji: "💨", desc: "분사형 — 도포 균일성 낮음, 재도포 간격 단축" },
];

const SPF_LEVELS = [
  { id: "low"    as SpfLevel, label: "SPF 15–29", pa: "PA+",    badge: "#22c55e" },
  { id: "medium" as SpfLevel, label: "SPF 30–49", pa: "PA++",   badge: "#f59e0b" },
  { id: "high"   as SpfLevel, label: "SPF 50–99", pa: "PA+++",  badge: "#ef4444" },
  { id: "ultra"  as SpfLevel, label: "SPF 100+",  pa: "PA++++", badge: "#7c3aed" },
];

const UV_LEVELS = [
  { id: "low"      as UvLevel, label: "낮음  1–2",     color: "#22c55e", desc: "실내 또는 흐린 날" },
  { id: "moderate" as UvLevel, label: "보통  3–5",     color: "#84cc16", desc: "맑은 오전/오후 늦게" },
  { id: "high"     as UvLevel, label: "높음  6–7",     color: "#f59e0b", desc: "여름 낮 야외 활동" },
  { id: "veryHigh" as UvLevel, label: "매우높음  8–10", color: "#ef4444", desc: "해변, 산, 반사 강한 환경" },
  { id: "extreme"  as UvLevel, label: "극도  11+",     color: "#7c3aed", desc: "적도 근처 또는 고산지대" },
];

export default function SetupScreen({ onStart }: Props) {
  const [step, setStep] = useState(0);
  const [productType, setProductType] = useState<ProductType>("cream");
  const [spfLevel, setSpfLevel] = useState<SpfLevel>("high");
  const [uvLevel, setUvLevel] = useState<UvLevel>("high");
  const [sweating, setSweating] = useState(false);

  const handleStart = () => {
    const reapplyMins = calcReapplyMinutes(productType, spfLevel, uvLevel, sweating);
    const amount = REAPPLY_RULES[productType][spfLevel].amount;
    onStart({ productType, spfLevel, uvLevel, sweating, reapplyMins, amount, appliedAt: new Date() });
  };

  const steps = ["제품 형태", "차단 지수", "환경", "확인"];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.header}>
          <Text style={styles.brand}>☀ SUNGARD</Text>
          <Text style={styles.headerSub}>선크림 정보 설정</Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepRow}>
          {steps.map((s, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <View style={[styles.stepBar, { backgroundColor: i <= step ? "#FFD060" : "rgba(255,255,255,0.12)" }]} />
              <Text style={[styles.stepLabel, { color: i <= step ? "#FFD060" : "rgba(255,255,255,0.3)" }]}>{s}</Text>
            </View>
          ))}
        </View>

        {/* STEP 0: 제품 형태 */}
        {step === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>어떤 형태의 선크림인가요?</Text>
            {PRODUCT_TYPES.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setProductType(p.id)}
                style={[styles.card, productType === p.id && styles.cardSelected]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{p.label}</Text>
                  <Text style={styles.cardDesc}>{p.desc}</Text>
                </View>
                {productType === p.id && <Text style={{ color: "#FFD060", fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP 1: SPF */}
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SPF / 자외선 차단 지수</Text>
            <View style={styles.researchNote}>
              <Text style={styles.noteText}>
                📄 FDA(2011): SPF는 UVB 차단, PA는 UVA 차단 강도를 나타냅니다.{"\n"}
                실제 사용 시 약 0.5~1 mg/cm² 도포되므로 표시 SPF의 1/4~1/2 수준만 발휘됩니다.
              </Text>
            </View>
            {SPF_LEVELS.map(s => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSpfLevel(s.id)}
                style={[styles.card, spfLevel === s.id && { ...styles.cardSelected, borderColor: s.badge }]}
                activeOpacity={0.7}
              >
                <View style={[styles.dot, { backgroundColor: s.badge }]} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{s.label}</Text>
                  <Text style={[styles.cardDesc, { color: s.badge }]}>{s.pa}</Text>
                </View>
                {spfLevel === s.id && <Text style={{ color: s.badge }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP 2: UV 환경 */}
        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>현재 UV 지수</Text>
            <View style={styles.researchNote}>
              <Text style={styles.noteText}>
                📄 WHO UV Index 가이드라인: UV 지수 높을수록 재도포 주기가 짧아집니다.
              </Text>
            </View>
            {UV_LEVELS.map(u => (
              <TouchableOpacity
                key={u.id}
                onPress={() => setUvLevel(u.id)}
                style={[styles.card, uvLevel === u.id && { ...styles.cardSelected, borderColor: u.color }]}
                activeOpacity={0.7}
              >
                <View style={[styles.dot, { backgroundColor: u.color }]} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{u.label}</Text>
                  <Text style={styles.cardDesc}>{u.desc}</Text>
                </View>
                {uvLevel === u.id && <Text style={{ color: u.color }}>✓</Text>}
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>활동 강도</Text>
            <TouchableOpacity
              onPress={() => setSweating(!sweating)}
              style={[styles.card, sweating && { ...styles.cardSelected, borderColor: "#60a5fa" }]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 24 }}>💧</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>땀을 많이 흘리는 활동</Text>
                <Text style={styles.cardDesc}>수영, 운동, 강한 야외 활동 — FDA 내수성 기준 적용</Text>
              </View>
              {sweating && <Text style={{ color: "#60a5fa" }}>✓</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: 확인 */}
        {step === 3 && (() => {
          const mins = calcReapplyMinutes(productType, spfLevel, uvLevel, sweating);
          const amount = REAPPLY_RULES[productType][spfLevel].amount;
          const pt = PRODUCT_TYPES.find(p => p.id === productType)!;
          const sp = SPF_LEVELS.find(s => s.id === spfLevel)!;
          const uv = UV_LEVELS.find(u => u.id === uvLevel)!;
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>설정 확인</Text>
              <View style={styles.summaryCard}>
                {[
                  ["제품", `${pt.emoji} ${pt.label}`],
                  ["차단 지수", `${sp.label} ${sp.pa}`],
                  ["UV 지수", uv.label],
                  ["활동", sweating ? "💧 땀 많음" : "🚶 보통 활동"],
                ].map(([k, v]) => (
                  <View key={k} style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>{k}</Text>
                    <Text style={styles.summaryVal}>{v}</Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>권장 재도포 주기</Text>
                  <Text style={[styles.summaryVal, { color: "#FFD060", fontSize: 18 }]}>{formatDuration(mins)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>권장 도포량</Text>
                  <Text style={[styles.summaryVal, { color: "#60a5fa" }]}>{amount} mg/cm²</Text>
                </View>
              </View>
              <Text style={styles.cite}>
                📚 Diffey & Robson (1989) · FDA Final Rule (2011) · WHO UV Index 가이드라인
              </Text>
            </View>
          );
        })()}

        {/* Navigation Buttons */}
        <View style={styles.btnRow}>
          {step > 0 && (
            <TouchableOpacity onPress={() => setStep(s => s - 1)} style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>← 이전</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={step === 3 ? handleStart : () => setStep(s => s + 1)}
            style={[styles.btnPrimary, { flex: step > 0 ? 2 : 1 }]}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#FFD060", "#FF8C42"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
              <Text style={styles.btnPrimaryText}>{step === 3 ? "☀ 타이머 시작!" : "다음 →"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 24, marginBottom: 8 },
  brand: { fontSize: 22, fontWeight: "900", color: "#FFD060", letterSpacing: 3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  stepRow: { flexDirection: "row", paddingHorizontal: 20, gap: 6, marginBottom: 28 },
  stepBar: { height: 3, borderRadius: 2, width: "100%", marginBottom: 4 },
  stepLabel: { fontSize: 9, letterSpacing: 0.5 },
  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12,
  },
  researchNote: {
    backgroundColor: "rgba(96,165,250,0.08)",
    borderWidth: 1, borderColor: "rgba(96,165,250,0.2)",
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  noteText: { fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 18 },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  cardSelected: {
    borderColor: "#FFD060", backgroundColor: "rgba(255,208,96,0.1)",
  },
  cardText: { flex: 1, marginLeft: 14 },
  cardTitle: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
  cardDesc: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  summaryCard: {
    backgroundColor: "rgba(255,208,96,0.07)",
    borderWidth: 1, borderColor: "rgba(255,208,96,0.25)",
    borderRadius: 16, padding: 18, marginBottom: 14,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  summaryKey: { fontSize: 13, color: "rgba(255,255,255,0.45)" },
  summaryVal: { fontSize: 13, color: "#ffffff", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 8 },
  cite: { fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 18 },
  btnRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 24 },
  btnSecondary: {
    flex: 1, padding: 14, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  btnSecondaryText: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
  btnPrimary: { borderRadius: 14, overflow: "hidden" },
  btnGrad: { padding: 15, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { color: "#0f1923", fontSize: 16, fontWeight: "800" },
});
