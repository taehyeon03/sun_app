// MainTabs.tsx — 하단 탭 네비게이션
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import LearnScreen from "./LearnScreen";
import TimerTab from "./TimerTab";
import CareScreen from "./CareScreen";
import UVScreen from "./UVScreen";
import FaceApplyScreen from "./FaceApplyScreen";
import { SkinTypeResult } from "./skintype";

interface Props {
  initialSkinResult?: SkinTypeResult;
}

type Tab = "learn" | "timer" | "uv" | "face" | "care";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "learn", label: "알아보기",  emoji: "📚" },
  { id: "timer", label: "타이머",    emoji: "⏱" },
  { id: "uv",    label: "자외선",    emoji: "☀️" },
  { id: "face",  label: "도포확인",  emoji: "🎨" },
  { id: "care",  label: "관리",      emoji: "🌿" },
];

export default function MainTabs({ initialSkinResult }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("timer");
  const [skinResult, setSkinResult] = useState<SkinTypeResult | undefined>(initialSkinResult);

  return (
    <SafeAreaView style={styles.safe}>
      {/* 탭 콘텐츠 */}
      <View style={styles.content}>
        {activeTab === "learn" && (
          <LearnScreen
            skinResult={skinResult}
            onQuizComplete={(r) => {
              setSkinResult(r);
              setActiveTab("timer");
            }}
          />
        )}
        {activeTab === "timer" && (
          <TimerTab skinResult={skinResult} />
        )}
        {activeTab === "uv" && <UVScreen />}
        {activeTab === "face" && (
          <FaceApplyScreen onClose={() => setActiveTab("timer")} />
        )}
        {activeTab === "care" && <CareScreen />}
      </View>

      {/* 하단 탭 바 */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {active && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  content: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0a1420",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
    position: "relative",
  },
  tabEmoji: { fontSize: 20, marginBottom: 3 },
  tabLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "500",
  },
  tabLabelActive: { color: "#FFD060", fontWeight: "700" },
  tabIndicator: {
    position: "absolute",
    top: 0,
    left: "25%",
    right: "25%",
    height: 2,
    backgroundColor: "#FFD060",
    borderRadius: 1,
  },
});
