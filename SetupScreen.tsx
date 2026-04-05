// SetupScreen.tsx — 선크림 타이머 설정 (GPS UV 자동 감지 포함)
import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator,
} from "react-native";
import {
  ProductType, SpfLevel, UvLevel,
  REAPPLY_RULES, calcReapplyMinutes,
} from "./sunscreen";
import { SkinTypeResult } from "./skintype";
import { fetchCurrentUv, uvLevelInfo, UvResult } from "./uvService";

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
  initialAppliedAt?: Date;
  skinResult?: SkinTypeResult;
  onStart: (config: SunscreenConfig) => void;
}

export default function SetupScreen({ initialAppliedAt, skinResult, onStart }: Props) {
  const [productType, setProductType] = useState<ProductType>("cream");
  const [spfLevel, setSpfLevel] = useState<SpfLevel>("high");
  const [uvLevel, setUvLevel] = useState<UvLevel>("high");
  const [sweating, setSweating] = useState(false);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsResult, setGpsResult] = useState<UvResult | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleGpsDetect = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const result = await fetchCurrentUv();
      setGpsResult(result);
      setUvLevel(result.uvLevel);
    } catch (e: any) {
      setGpsError(e.message ?? "위치 정보를 가져올 수 없습니다");
    } finally {
      setGpsLoading(false);
    }
  };

  const handleStart = () => {
    const reapplyMins = calcReapplyMinutes(productType, spfLevel, uvLevel, sweating);
    const amount = REAPPLY_RULES[productType][spfLevel].amount;
    const appliedAt = initialAppliedAt ?? new Date();
    onStart({ productType, spfLevel, uvLevel, sweating, reapplyMins, amount, appliedAt });
  };

  const UV_OPTIONS: { id: UvLevel; label: string }[] = [
    { id: "low",      label: "낮음 (1–2)" },
    { id: "moderate", label: "보통 (3–5)" },
    { id: "high",     label: "높음 (6–7)" },
    { id: "veryHigh", label: "매우높음 (8–10)" },
    { id: "extreme",  label: "극한 (11+)" },
  ];

  const uvInfo = uvLevelInfo(uvLevel);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>☀ SUNGARD</Text>
        <Text style={styles.subtitle}>선크림 타이머 설정</Text>

        {skinResult && (
          <View style={styles.recommendBadge}>
            <Text style={styles.recommendText}>
              피부 분석 결과: <Text style={styles.recommendHighlight}>{skinResult.title} 추천</Text>
            </Text>
          </View>
        )}

        {/* 제품 형태 */}
        <View style={styles.section}>
          <Text style={styles.label}>제품 형태</Text>
          <View style={styles.buttonGroup}>
            {[
              { id: "cream" as ProductType, label: "🧴 크림" },
              { id: "stick" as ProductType, label: "💄 스틱" },
              { id: "spray" as ProductType, label: "💨 스프레이" },
            ].map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setProductType(p.id)}
                style={[styles.btn, productType === p.id && styles.btnActive]}
              >
                <Text style={[styles.btnText, productType === p.id && styles.btnTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SPF */}
        <View style={styles.section}>
          <Text style={styles.label}>SPF 등급</Text>
          <View style={styles.buttonGroup}>
            {[
              { id: "low" as SpfLevel,    label: "SPF 15–29" },
              { id: "medium" as SpfLevel, label: "SPF 30–49" },
              { id: "high" as SpfLevel,   label: "SPF 50–99" },
              { id: "ultra" as SpfLevel,  label: "SPF 100+" },
            ].map(s => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSpfLevel(s.id)}
                style={[styles.btn, spfLevel === s.id && styles.btnActive]}
              >
                <Text style={[styles.btnText, spfLevel === s.id && styles.btnTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* UV 지수 — GPS 자동 + 수동 선택 */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>UV 지수</Text>
            {/* GPS 자동 감지 버튼 */}
            <TouchableOpacity
              onPress={handleGpsDetect}
              disabled={gpsLoading}
              style={styles.gpsBtn}
            >
              {gpsLoading ? (
                <ActivityIndicator size="small" color="#FFD060" />
              ) : (
                <Text style={styles.gpsBtnText}>📍 현재 위치로 자동 감지</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* GPS 결과 표시 */}
          {gpsResult && (
            <View style={[styles.gpsResult, { borderColor: uvInfo.color + "44" }]}>
              <View style={styles.gpsResultLeft}>
                <Text style={styles.gpsResultCity}>
                  {gpsResult.city ? `📍 ${gpsResult.city}` : "📍 현재 위치"}
                </Text>
                <Text style={[styles.gpsResultIndex, { color: uvInfo.color }]}>
                  UV {gpsResult.uvIndex}
                </Text>
              </View>
              <View>
                <Text style={[styles.gpsResultLevel, { color: uvInfo.color }]}>
                  {uvInfo.label}
                </Text>
                <Text style={styles.gpsResultDesc}>{uvInfo.description}</Text>
              </View>
            </View>
          )}

          {gpsError && (
            <View style={styles.gpsErrorBox}>
              <Text style={styles.gpsErrorText}>⚠ {gpsError}</Text>
            </View>
          )}

          {/* 수동 선택 */}
          <View style={styles.buttonGroup}>
            {UV_OPTIONS.map(u => {
              const info = uvLevelInfo(u.id);
              const active = uvLevel === u.id;
              return (
                <TouchableOpacity
                  key={u.id}
                  onPress={() => { setUvLevel(u.id); setGpsResult(null); }}
                  style={[
                    styles.uvBtn,
                    active && { backgroundColor: info.color + "22", borderColor: info.color },
                  ]}
                >
                  <View style={[styles.uvDot, { backgroundColor: info.color }]} />
                  <Text style={[styles.btnText, active && { color: info.color, fontWeight: "700" }]}>
                    {u.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 땀/수영 */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => setSweating(!sweating)}
            style={[styles.checkBtn, sweating && styles.checkBtnActive]}
          >
            <Text style={styles.checkLabel}>
              {sweating ? "✓" : "○"} 땀 많은 활동 (수영 / 운동)
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleStart} style={styles.startBtn}>
          <Text style={styles.startBtnText}>타이머 시작</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: "900", color: "#FFD060", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 24 },
  section: { marginBottom: 24 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // GPS 버튼
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,208,96,0.12)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,208,96,0.25)",
    minWidth: 44,
    justifyContent: "center",
  },
  gpsBtnText: { fontSize: 12, color: "#FFD060", fontWeight: "600" },

  // GPS 결과
  gpsResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  gpsResultLeft: { alignItems: "center", minWidth: 60 },
  gpsResultCity: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 2 },
  gpsResultIndex: { fontSize: 22, fontWeight: "900" },
  gpsResultLevel: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  gpsResultDesc: { fontSize: 11, color: "rgba(255,255,255,0.4)", maxWidth: 180, lineHeight: 15 },

  gpsErrorBox: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  gpsErrorText: { fontSize: 12, color: "#ef4444" },

  // UV 버튼
  buttonGroup: { gap: 8 },
  uvBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  uvDot: { width: 8, height: 8, borderRadius: 4 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  btnActive: { backgroundColor: "#FFD060", borderColor: "#FFD060" },
  btnText: { fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center" },
  btnTextActive: { color: "#0f1923", fontWeight: "600" },

  checkBtn: {
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  checkBtnActive: { backgroundColor: "#60a5fa", borderColor: "#60a5fa" },
  checkLabel: { fontSize: 14, color: "rgba(255,255,255,0.7)" },

  startBtn: {
    padding: 16,
    backgroundColor: "#FFD060",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  startBtnText: { fontSize: 16, fontWeight: "700", color: "#0f1923" },

  recommendBadge: {
    backgroundColor: "rgba(96,196,160,0.12)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(96,196,160,0.25)",
  },
  recommendText: { fontSize: 13, color: "rgba(255,255,255,0.6)" },
  recommendHighlight: { color: "#60c4a0", fontWeight: "700" },
});
