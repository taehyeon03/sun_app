// src/screens/SetupScreen.tsx (MVP - 간단한 버전)
import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar,
} from "react-native";
import {
  ProductType, SpfLevel, UvLevel,
  REAPPLY_RULES, calcReapplyMinutes,
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

export default function SetupScreen({ onStart }: Props) {
  const [productType, setProductType] = useState<ProductType>("cream");
  const [spfLevel, setSpfLevel] = useState<SpfLevel>("high");
  const [uvLevel, setUvLevel] = useState<UvLevel>("high");
  const [sweating, setSweating] = useState(false);

  const handleStart = () => {
    const reapplyMins = calcReapplyMinutes(productType, spfLevel, uvLevel, sweating);
    const amount = REAPPLY_RULES[productType][spfLevel].amount;
    onStart({ productType, spfLevel, uvLevel, sweating, reapplyMins, amount, appliedAt: new Date() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>☀ SUNGARD</Text>
        <Text style={styles.subtitle}>선크림 타이머 설정</Text>

        <View style={styles.section}>
          <Text style={styles.label}>제품 형태</Text>
          <View style={styles.buttonGroup}>
            {[
              { id: "cream" as ProductType, label: "크림" },
              { id: "stick" as ProductType, label: "스틱" },
              { id: "spray" as ProductType, label: "스프레이" },
            ].map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setProductType(p.id)}
                style={[styles.btn, productType === p.id && styles.btnActive]}
              >
                <Text style={[styles.btnText, productType === p.id && styles.btnTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>SPF 등급</Text>
          <View style={styles.buttonGroup}>
            {[
              { id: "low" as SpfLevel, label: "SPF 15-29" },
              { id: "medium" as SpfLevel, label: "SPF 30-49" },
              { id: "high" as SpfLevel, label: "SPF 50-99" },
              { id: "ultra" as SpfLevel, label: "SPF 100+" },
            ].map(s => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSpfLevel(s.id)}
                style={[styles.btn, spfLevel === s.id && styles.btnActive]}
              >
                <Text style={[styles.btnText, spfLevel === s.id && styles.btnTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>UV 지수</Text>
          <View style={styles.buttonGroup}>
            {[
              { id: "low" as UvLevel, label: "낮음 (1-2)" },
              { id: "moderate" as UvLevel, label: "보통 (3-5)" },
              { id: "high" as UvLevel, label: "높음 (6-7)" },
              { id: "veryHigh" as UvLevel, label: "매우높음 (8-10)" },
            ].map(u => (
              <TouchableOpacity
                key={u.id}
                onPress={() => setUvLevel(u.id)}
                style={[styles.btn, uvLevel === u.id && styles.btnActive]}
              >
                <Text style={[styles.btnText, uvLevel === u.id && styles.btnTextActive]}>{u.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => setSweating(!sweating)}
            style={[styles.checkBtn, sweating && styles.checkBtnActive]}
          >
            <Text style={styles.checkLabel}>{sweating ? "✓" : "○"} 땀 많은 활동 (수영/운동)</Text>
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
  label: { fontSize: 14, fontWeight: "600", color: "#fff", marginBottom: 10 },
  buttonGroup: { gap: 8 },
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
});
