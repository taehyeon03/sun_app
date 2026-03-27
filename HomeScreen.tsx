// src/screens/HomeScreen.tsx
// 메인 홈 화면 – 재도포 타이머, 알림, 도포 기록

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Modal, Vibration,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { SunscreenConfig } from "./SetupScreen";
import {
  formatTime, formatDuration, getAmountDescription,
  calcReapplyMinutes, REAPPLY_RULES,
} from "../lib/sunscreen";
import {
  scheduleReapplyNotification,
  cancelAllNotifications,
} from "../lib/notifications";

interface LogEntry {
  time: Date;
  note: string;
}

interface Props {
  config: SunscreenConfig;
  onReset: () => void;
}

const R = 88;
const CX = 110, CY = 110;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function HomeScreen({ config, onReset }: Props) {
  const [now, setNow] = useState(new Date());
  const [appliedAt, setAppliedAt] = useState(config.appliedAt);
  const [logs, setLogs] = useState<LogEntry[]>([{ time: config.appliedAt, note: "첫 도포 ☀" }]);
  const [showModal, setShowModal] = useState(false);
  const [notifScheduled, setNotifScheduled] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 타이머
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  // 알림 스케줄
  useEffect(() => {
    const { reapplyMins, productType, spfLevel } = config;
    const spfLabel = REAPPLY_RULES[productType][spfLevel].label;
    const amtDesc = getAmountDescription(productType, REAPPLY_RULES[productType][spfLevel].amount);
    scheduleReapplyNotification(reapplyMins, spfLabel, amtDesc)
      .then(() => setNotifScheduled(true))
      .catch(console.error);
    return () => { cancelAllNotifications(); };
  }, [config]);

  // 긴박함 애니메이션
  useEffect(() => {
    const elapsed = Math.floor((now.getTime() - appliedAt.getTime()) / 60000);
    const remain = config.reapplyMins - elapsed;
    if (remain <= 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [now, appliedAt, config.reapplyMins, pulseAnim]);

  const elapsedMins = Math.floor((now.getTime() - appliedAt.getTime()) / 60000);
  const remainMins = Math.max(0, config.reapplyMins - elapsedMins);
  const pct = Math.min(elapsedMins / config.reapplyMins, 1);
  const dashOffset = CIRCUMFERENCE * (1 - pct);
  const nextApplyTime = new Date(appliedAt.getTime() + config.reapplyMins * 60000);

  const overdue = remainMins === 0;
  const urgent = remainMins > 0 && remainMins <= 20;
  const progressColor = overdue ? "#ef4444" : urgent ? "#f59e0b" : "#FFD060";

  const handleReapply = useCallback(async () => {
    const newApplied = new Date();
    setAppliedAt(newApplied);
    setLogs(l => [{ time: newApplied, note: "재도포 🔁" }, ...l]);
    setShowModal(false);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 새 알림 스케줄
    const { productType, spfLevel, uvLevel, sweating } = config;
    const newMins = calcReapplyMinutes(productType, spfLevel, uvLevel, sweating);
    const spfLabel = REAPPLY_RULES[productType][spfLevel].label;
    const amtDesc = getAmountDescription(productType, REAPPLY_RULES[productType][spfLevel].amount);
    await scheduleReapplyNotification(newMins, spfLabel, amtDesc);
  }, [config, pulseAnim]);

  const { productType, spfLevel } = config;
  const rule = REAPPLY_RULES[productType][spfLevel];
  const amountDesc = getAmountDescription(productType, rule.amount);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>☀ SUNGARD</Text>
            <Text style={styles.dateText}>{now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</Text>
          </View>
          <TouchableOpacity onPress={onReset} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>설정 변경</Text>
          </TouchableOpacity>
        </View>

        {/* Timer Arc */}
        <View style={styles.arcContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Svg width={220} height={220} style={{ transform: [{ rotate: "-90deg" }] }}>
              <Circle cx={CX} cy={CY} r={R}
                fill="none" stroke="rgba(255,255,255,0.07)"
                strokeWidth={14}
              />
              <Circle cx={CX} cy={CY} r={R}
                fill="none" stroke={progressColor}
                strokeWidth={14}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>
          <View style={styles.arcCenter} pointerEvents="none">
            <Text style={{ fontSize: 32 }}>☀️</Text>
            <Text style={[styles.timerText, { color: progressColor }]}>
              {formatDuration(remainMins)}
            </Text>
            <Text style={styles.timerLabel}>남은 시간</Text>
          </View>
        </View>

        {/* Status banner */}
        <View style={[styles.statusBanner, {
          backgroundColor: overdue ? "rgba(239,68,68,0.12)" : urgent ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)",
          borderColor: overdue ? "rgba(239,68,68,0.4)" : urgent ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.1)",
        }]}>
          <Text style={[styles.statusTitle, { color: progressColor }]}>
            {overdue ? "⚠ 지금 바로 재도포하세요!" : urgent ? "⏰ 곧 재도포 시간입니다" : "✓ 현재 차단 효과 유지 중"}
          </Text>
          <Text style={styles.statusSub}>
            다음 권장 도포 시각  <Text style={{ color: "#fff" }}>{formatTime(nextApplyTime)}</Text>
          </Text>
          {notifScheduled && (
            <Text style={styles.notifBadge}>🔔 알림 설정됨</Text>
          )}
        </View>

        {/* Info Grid */}
        <View style={styles.grid}>
          {[
            { label: "도포 시각",   value: formatTime(appliedAt), icon: "🕐" },
            { label: "권장 도포량", value: `${rule.amount} mg/cm²`, icon: "💊" },
            { label: "제품 형태",   value: { cream: "크림/로션", stick: "고체/스틱", spray: "스프레이" }[productType], icon: "🧴" },
            { label: "차단 지수",   value: rule.label, icon: "🛡️" },
          ].map(({ label, value, icon }) => (
            <View key={label} style={styles.gridItem}>
              <Text style={{ fontSize: 22, marginBottom: 4 }}>{icon}</Text>
              <Text style={styles.gridLabel}>{label}</Text>
              <Text style={styles.gridValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* How much to apply */}
        <View style={styles.amountCard}>
          <Text style={styles.amountTitle}>💊 이번 도포량 가이드</Text>
          <Text style={styles.amountText}>{amountDesc}</Text>
          <Text style={[styles.amountText, { marginTop: 6, color: "rgba(255,255,255,0.35)" }]}>
            ※ Diffey(1989): 2 mg/cm² 기준 측정. 실제 사용량은 약 절반 → SPF 효과 저하
          </Text>
        </View>

        {/* Research Note */}
        <View style={styles.researchCard}>
          <Text style={styles.researchTitle}>📚 논문 기반 근거</Text>
          <Text style={styles.researchText}>
            • FDA Final Rule(2011): 내수성 없는 제품은 2시간마다 재도포 권장{"\n"}
            • 땀/수영 시 FDA 내수성 기준: 40분 또는 80분 간격으로 재도포{"\n"}
            • WHO: UV Index 6 이상 시 외출 전 30분 도포 필수{"\n"}
            • Autier et al.(2007): 높은 SPF만으론 UV 노출 감소 효과 없음 → 행동 변화 필요
          </Text>
        </View>

        {/* Log */}
        <View style={styles.logSection}>
          <Text style={styles.logTitle}>도포 기록</Text>
          {logs.map((l, i) => (
            <View key={i} style={styles.logRow}>
              <View style={[styles.logDot, { backgroundColor: i === 0 ? "#FFD060" : "rgba(255,255,255,0.25)" }]} />
              <Text style={[styles.logNote, { color: i === 0 ? "#FFD060" : "rgba(255,255,255,0.5)" }]}>{l.note}</Text>
              <Text style={styles.logTime}>{formatTime(l.time)}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.ctaWrap} activeOpacity={0.85}>
          <LinearGradient colors={["#FFD060", "#FF8C42"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
            <Text style={styles.ctaText}>☀ 지금 선크림 발랐어요</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Reapply Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>재도포 확인</Text>
            <Text style={styles.modalAmount}>{amountDesc}</Text>
            <TouchableOpacity onPress={handleReapply} style={styles.modalConfirmWrap} activeOpacity={0.85}>
              <LinearGradient colors={["#FFD060", "#FF8C42"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalConfirm}>
                <Text style={styles.modalConfirmText}>✓ 발랐습니다 — 타이머 재시작</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 20, marginBottom: 16,
  },
  brand: { fontSize: 20, fontWeight: "900", color: "#FFD060", letterSpacing: 3 },
  dateText: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  resetBtn: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  resetBtnText: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  arcContainer: { alignItems: "center", marginBottom: 10, position: "relative" },
  arcCenter: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center", alignItems: "center",
  },
  timerText: { fontSize: 26, fontWeight: "800", marginTop: 4 },
  timerLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  statusBanner: {
    marginHorizontal: 20, borderRadius: 16,
    borderWidth: 1, padding: 16, marginBottom: 16,
  },
  statusTitle: { fontWeight: "700", fontSize: 15, marginBottom: 4 },
  statusSub: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  notifBadge: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 4 },
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 20, gap: 10, marginBottom: 14,
  },
  gridItem: {
    flex: 1, minWidth: "45%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12, padding: 14,
  },
  gridLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 },
  gridValue: { color: "#fff", fontSize: 13, fontWeight: "600" },
  amountCard: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: "rgba(255,208,96,0.07)",
    borderWidth: 1, borderColor: "rgba(255,208,96,0.2)",
    borderRadius: 14, padding: 16,
  },
  amountTitle: { color: "#FFD060", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  amountText: { color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 18 },
  researchCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: "rgba(96,165,250,0.07)",
    borderWidth: 1, borderColor: "rgba(96,165,250,0.2)",
    borderRadius: 14, padding: 16,
  },
  researchTitle: { color: "#60a5fa", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  researchText: { color: "rgba(255,255,255,0.5)", fontSize: 11, lineHeight: 19 },
  logSection: { paddingHorizontal: 20, marginBottom: 16 },
  logTitle: {
    fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10,
  },
  logRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  logDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  logNote: { flex: 1, fontSize: 13 },
  logTime: { color: "rgba(255,255,255,0.3)", fontSize: 12 },
  ctaWrap: { marginHorizontal: 20, borderRadius: 16, overflow: "hidden" },
  cta: { padding: 18, alignItems: "center" },
  ctaText: { color: "#0f1923", fontSize: 17, fontWeight: "800" },
  modalBg: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#1a2535",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, paddingBottom: 44,
  },
  modalTitle: { color: "#FFD060", fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  modalAmount: { color: "rgba(255,255,255,0.55)", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  modalConfirmWrap: { borderRadius: 14, overflow: "hidden" },
  modalConfirm: { padding: 16, alignItems: "center" },
  modalConfirmText: { color: "#0f1923", fontSize: 16, fontWeight: "700" },
});
