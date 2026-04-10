// UVScreen.tsx — UV 지수 정보
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, SafeAreaView, StatusBar,
  StyleSheet, TouchableOpacity, ActivityIndicator,
} from "react-native";

const UV_LEVELS = [
  { index: "0-2", label: "낮음", emoji: "😊", color: "#10b981", desc: "자외선 차단 불필요" },
  { index: "3-5", label: "중간", emoji: "😐", color: "#f59e0b", desc: "자외선 차단 권장" },
  { index: "6-7", label: "높음", emoji: "😟", color: "#ef4444", desc: "자외선 차단 필수" },
  { index: "8-10", label: "매우 높음", emoji: "😱", color: "#991b1b", desc: "가급적 외출 자제" },
  { index: "11+", label: "극도로 높음", emoji: "🆘", color: "#7c2d12", desc: "절대 외출 금지" },
];

const UV_TIMES = [
  { time: "06:00 ~ 09:00", uv: "낮음", protection: "기본" },
  { time: "09:00 ~ 11:00", uv: "중간", protection: "SPF 30+" },
  { time: "11:00 ~ 15:00", uv: "매우 높음", protection: "SPF 50+ (필수)" },
  { time: "15:00 ~ 17:00", uv: "높음", protection: "SPF 30+" },
  { time: "17:00 ~ 19:00", uv: "낮음", protection: "기본" },
];

export default function UVScreen() {
  const [estimatedUV, setEstimatedUV] = useState("중간");

  useEffect(() => {
    // 현재 시간에 따른 예상 UV 지수
    const hour = new Date().getHours();
    if (hour >= 11 && hour < 15) setEstimatedUV("매우 높음");
    else if ((hour >= 9 && hour < 11) || (hour >= 15 && hour < 17)) setEstimatedUV("높음");
    else if (hour >= 6 && hour < 19) setEstimatedUV("중간");
    else setEstimatedUV("낮음");
  }, []);

  const currentUVLevel = UV_LEVELS.find((lvl) => lvl.label === estimatedUV);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      <ScrollView contentContainerStyle={styles.container}>

        {/* 현재 UV 지수 */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>자외선 지수</Text>
          <Text style={styles.pageSub}>오늘의 자외선 강도를 확인하고 선크림을 도포하세요</Text>
        </View>

        {currentUVLevel && (
          <View style={[styles.currentUVBox, { borderColor: currentUVLevel.color }]}>
            <Text style={styles.currentUVEmoji}>{currentUVLevel.emoji}</Text>
            <View style={styles.currentUVInfo}>
              <Text style={[styles.currentUVLabel, { color: currentUVLevel.color }]}>
                {currentUVLevel.label}
              </Text>
              <Text style={styles.currentUVDesc}>{currentUVLevel.desc}</Text>
              <Text style={styles.currentUVTime}>
                현재 시간: {new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>
        )}

        {/* UV 지수 레벨 설명 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 UV 지수 레벨</Text>
          {UV_LEVELS.map((level, i) => (
            <View key={i} style={styles.levelRow}>
              <Text style={styles.levelEmoji}>{level.emoji}</Text>
              <View style={styles.levelInfo}>
                <Text style={styles.levelLabel}>{level.label} ({level.index})</Text>
                <Text style={styles.levelDesc}>{level.desc}</Text>
              </View>
              <View style={[styles.levelColorBox, { backgroundColor: level.color }]} />
            </View>
          ))}
        </View>

        {/* 시간대별 UV */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ 시간대별 자외선 강도</Text>
          {UV_TIMES.map((item, i) => (
            <View key={i} style={styles.timeRow}>
              <Text style={styles.timeLabel}>{item.time}</Text>
              <View style={styles.timeInfo}>
                <Text style={styles.timeUV}>{item.uv}</Text>
                <Text style={styles.timeProtection}>{item.protection}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 자외선 차단 팁 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 자외선 차단 팁</Text>
          {[
            "☀️ SPF와 PA의 차이: SPF는 UVB, PA는 UVA 차단 정도",
            "⏱ 외출 30분 전에 도포: 유기 자차는 흡수 시간 필요",
            "🔄 2시간마다 재도포: 땀이나 마찰로 효과 감소",
            "💧 충분한 양 사용: 최소 1엔 동전 크기 (얼굴 기준)",
            "🧴 더블 클렌징: 저녁에 선크림 완벽하게 제거 필수",
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  container: { padding: 20, paddingBottom: 40 },

  header: { marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: "900", color: "#FFD060", marginBottom: 4 },
  pageSub: { fontSize: 13, color: "rgba(255,255,255,0.4)" },

  currentUVBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  currentUVEmoji: { fontSize: 48 },
  currentUVInfo: { flex: 1, justifyContent: "center" },
  currentUVLabel: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  currentUVDesc: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 6 },
  currentUVTime: { fontSize: 11, color: "rgba(255,255,255,0.3)" },

  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 12 },

  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  levelEmoji: { fontSize: 24 },
  levelInfo: { flex: 1 },
  levelLabel: { fontSize: 13, fontWeight: "700", color: "#fff", marginBottom: 2 },
  levelDesc: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  levelColorBox: { width: 20, height: 20, borderRadius: 6 },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  timeLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  timeInfo: { alignItems: "flex-end" },
  timeUV: { fontSize: 12, fontWeight: "700", color: "#FFD060", marginBottom: 2 },
  timeProtection: { fontSize: 11, color: "rgba(255,255,255,0.5)" },

  tipRow: {
    backgroundColor: "rgba(255,208,96,0.1)",
    borderLeftWidth: 3,
    borderLeftColor: "#FFD060",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  tipText: { fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 18 },
});
