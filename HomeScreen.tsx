// src/screens/HomeScreen.tsx (MVP - 간단한 버전)
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar,
} from "react-native";
import { SunscreenConfig } from "./SetupScreen";
import {
  formatTime, formatDuration,
  calcReapplyMinutes, REAPPLY_RULES,
} from "./sunscreen";

interface Props {
  config: SunscreenConfig;
  onReset: () => void;
}

export default function HomeScreen({ config, onReset }: Props) {
  const [now, setNow] = useState(new Date());
  const [appliedAt, setAppliedAt] = useState(config.appliedAt);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const elapsedMins = Math.floor((now.getTime() - appliedAt.getTime()) / 60000);
  const remainMins = Math.max(0, config.reapplyMins - elapsedMins);
  const nextApplyTime = new Date(appliedAt.getTime() + config.reapplyMins * 60000);

  const overdue = remainMins === 0;
  const urgent = remainMins > 0 && remainMins <= 20;
  const statusColor = overdue ? "#ef4444" : urgent ? "#f59e0b" : "#FFD060";

  const { productType, spfLevel } = config;
  const rule = REAPPLY_RULES[productType][spfLevel];

  const handleReapply = () => {
    const newApplied = new Date();
    setAppliedAt(newApplied);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>☀ SUNGARD</Text>
            <Text style={styles.date}>{now.toLocaleDateString("ko-KR")}</Text>
          </View>
          <TouchableOpacity onPress={onReset} style={styles.settingsBtn}>
            <Text style={styles.settingsBtnText}>설정</Text>
          </TouchableOpacity>
        </View>

        {/* Main Timer */}
        <View style={[styles.timerCard, { backgroundColor: statusColor + "20", borderColor: statusColor + "40" }]}>
          <Text style={[styles.timerLabel, { color: statusColor }]}>남은 시간</Text>
          <Text style={[styles.timerValue, { color: statusColor }]}>{formatDuration(remainMins)}</Text>
          <Text style={styles.timerStatus}>
            {overdue ? "⚠ 지금 재도포하세요!" : urgent ? "⏰ 재도포 임박" : "✓ 유지중"}
          </Text>
        </View>

        {/* Status */}
        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>도포 시각</Text>
            <Text style={styles.infoValue}>{formatTime(appliedAt)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>다음 도포</Text>
            <Text style={styles.infoValue}>{formatTime(nextApplyTime)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>권장 도포량</Text>
            <Text style={styles.infoValue}>{rule.amount} mg/cm²</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>제품 형태</Text>
            <Text style={styles.infoValue}>
              {{ cream: "크림", stick: "스틱", spray: "스프레이" }[productType]}
            </Text>
          </View>
        </View>

        {/* Reapply Button */}
        <TouchableOpacity onPress={handleReapply} style={styles.reapplyBtn}>
          <Text style={styles.reapplyBtnText}>☀ 지금 발랐어요</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  brand: { fontSize: 28, fontWeight: "900", color: "#FFD060" },
  date: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 },
  settingsBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 6 },
  settingsBtnText: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  timerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  timerLabel: { fontSize: 13, fontWeight: "600" },
  timerValue: { fontSize: 48, fontWeight: "900", marginVertical: 8 },
  timerStatus: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  info: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", padding: 14 },
  infoLabel: { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  infoValue: { fontSize: 13, color: "#fff", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)" },
  reapplyBtn: { backgroundColor: "#FFD060", borderRadius: 8, padding: 16, alignItems: "center" },
  reapplyBtnText: { fontSize: 16, fontWeight: "700", color: "#0f1923" },
});
