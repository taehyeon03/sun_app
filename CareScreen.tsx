// CareScreen.tsx — 선크림 후 관리
import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar,
} from "react-native";

const CARE_SECTIONS = [
  {
    id: "order",
    emoji: "🧴",
    title: "스킨케어 순서",
    color: "#60a5fa",
    items: [
      { step: "1", label: "세안", desc: "저자극 클렌저로 부드럽게 세안" },
      { step: "2", label: "토너", desc: "피부결 정돈 후 수분 공급" },
      { step: "3", label: "에센스 / 세럼", desc: "기능성 성분 흡수" },
      { step: "4", label: "모이스처라이저", desc: "수분 잠금 & 장벽 강화" },
      { step: "5", label: "선크림", desc: "맨 마지막 단계 (가장 외층)" },
    ],
  },
  {
    id: "remove",
    emoji: "🫧",
    title: "선크림 제거 방법",
    color: "#f472b6",
    items: [
      { step: "①", label: "오일 / 밀크 클렌저", desc: "무기자차는 오일 클렌저로 먼저 유화" },
      { step: "②", label: "폼 클렌저로 2차 세안", desc: "더블 클렌징으로 잔여 성분 완전 제거" },
      { step: "③", label: "미온수로 헹구기", desc: "뜨거운 물은 피부 장벽을 손상시킴" },
    ],
  },
  {
    id: "tips",
    emoji: "✨",
    title: "도포 시 꿀팁",
    color: "#FFD060",
    items: [
      { step: "🕐", label: "야외 출발 30분 전 도포", desc: "유기자차는 흡수 시간 필요 (논문: Silpa-Archa et al., 2021)" },
      { step: "2x", label: "이중 도포 권장", desc: "1회 도포량은 기준치의 33%에 불과 (Heerfordt et al., 2018)" },
      { step: "💧", label: "땀 후 즉시 재도포", desc: "발한 조건에서 2시간 후 SPF 30으로 저하 (Lim et al., 2020)" },
      { step: "👀", label: "눈가 꼼꼼히", desc: "자외선에 의한 눈가 노화 예방을 위해 눈 아랫부분 포함" },
    ],
  },
  {
    id: "storage",
    emoji: "📦",
    title: "선크림 보관 방법",
    color: "#a78bfa",
    items: [
      { step: "🌡", label: "직사광선 & 고온 피하기", desc: "자외선 차단 성분이 분해될 수 있음" },
      { step: "📅", label: "개봉 후 12개월 이내 사용", desc: "개봉 후 유통기한과 별도로 확인 필요" },
      { step: "🚫", label: "차량 내 보관 금지", desc: "고온에서 성분 변성 위험" },
    ],
  },
];

export default function CareScreen() {
  const [expanded, setExpanded] = useState<string>("order");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.pageTitle}>선크림 후 관리</Text>
        <Text style={styles.pageSub}>올바른 사용법으로 차단 효과를 극대화하세요</Text>

        {CARE_SECTIONS.map((sec) => (
          <View key={sec.id} style={styles.section}>
            <TouchableOpacity
              onPress={() => setExpanded(expanded === sec.id ? "" : sec.id)}
              style={styles.sectionHeader}
              activeOpacity={0.75}
            >
              <Text style={styles.sectionEmoji}>{sec.emoji}</Text>
              <Text style={styles.sectionTitle}>{sec.title}</Text>
              <Text style={styles.chevron}>{expanded === sec.id ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {expanded === sec.id && (
              <View style={styles.sectionBody}>
                {sec.items.map((item, i) => (
                  <View key={i} style={styles.itemRow}>
                    <View style={[styles.stepBadge, { backgroundColor: sec.color + "22" }]}>
                      <Text style={[styles.stepText, { color: sec.color }]}>{item.step}</Text>
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={styles.itemDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* 논문 출처 */}
        <View style={styles.refBox}>
          <Text style={styles.refTitle}>📄 참고 문헌</Text>
          {[
            "Silpa-Archa et al. (2021). Health Science Reports",
            "Diffey, BL. (2001). JAAD, 45(6):882–885",
            "Heerfordt et al. (2018). PLOS ONE",
            "Lim et al. (2020). Photodermatol Photoimmunol",
          ].map((ref, i) => (
            <Text key={i} style={styles.refItem}>• {ref}</Text>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  container: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: "900", color: "#FFD060", marginBottom: 4 },
  pageSub: { fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 },

  section: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 10,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#fff", flex: 1 },
  chevron: { fontSize: 11, color: "rgba(255,255,255,0.3)" },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 14 },

  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepText: { fontSize: 12, fontWeight: "800" },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 14, fontWeight: "700", color: "#fff", marginBottom: 2 },
  itemDesc: { fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 17 },

  refBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  refTitle: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.4)", marginBottom: 8 },
  refItem: { fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4, lineHeight: 16 },
});
