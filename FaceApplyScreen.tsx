// FaceApplyScreen.tsx — 카메라 기반 얼굴 구역 선크림 도포 체크
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, PanResponder,
  TouchableOpacity, SafeAreaView, StatusBar, Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Ellipse, Defs, RadialGradient, Stop } from "react-native-svg";

interface Props {
  onClose: () => void;
}

const { width: SW, height: SH } = Dimensions.get("window");

// 화면 전체 기준 얼굴 구역 (비율로 정의 — 전면 카메라 일반 구도 기준)
interface Zone {
  id: string;
  label: string;
  cx: number;   // 0~1 (화면 너비 비율)
  cy: number;   // 0~1 (화면 높이 비율)
  rx: number;   // 픽셀
  ry: number;   // 픽셀
}

const ZONES: Zone[] = [
  { id: "forehead",   label: "이마",        cx: 0.5,   cy: 0.24, rx: SW * 0.22, ry: SH * 0.048 },
  { id: "leftEye",    label: "왼쪽 눈가",   cx: 0.36,  cy: 0.31, rx: SW * 0.10, ry: SH * 0.032 },
  { id: "rightEye",   label: "오른쪽 눈가", cx: 0.64,  cy: 0.31, rx: SW * 0.10, ry: SH * 0.032 },
  { id: "nose",       label: "코",          cx: 0.5,   cy: 0.38, rx: SW * 0.07, ry: SH * 0.055 },
  { id: "leftCheek",  label: "왼쪽 볼",     cx: 0.3,   cy: 0.43, rx: SW * 0.13, ry: SH * 0.075 },
  { id: "rightCheek", label: "오른쪽 볼",   cx: 0.7,   cy: 0.43, rx: SW * 0.13, ry: SH * 0.075 },
  { id: "lips",       label: "입 주변",     cx: 0.5,   cy: 0.50, rx: SW * 0.12, ry: SH * 0.038 },
  { id: "chin",       label: "턱",          cx: 0.5,   cy: 0.57, rx: SW * 0.14, ry: SH * 0.038 },
];

function hitZone(touchX: number, touchY: number, zone: Zone): boolean {
  const cx = zone.cx * SW;
  const cy = zone.cy * SH;
  const dx = (touchX - cx) / zone.rx;
  const dy = (touchY - cy) / zone.ry;
  return dx * dx + dy * dy <= 1;
}

export default function FaceApplyScreen({ onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [coveredZones, setCoveredZones] = useState<Set<string>>(new Set());
  const coveredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const markZone = useCallback((pageX: number, pageY: number) => {
    let changed = false;
    const next = new Set(coveredRef.current);
    for (const zone of ZONES) {
      if (!next.has(zone.id) && hitZone(pageX, pageY, zone)) {
        next.add(zone.id);
        changed = true;
      }
    }
    if (changed) {
      coveredRef.current = next;
      setCoveredZones(new Set(next));
    }
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => markZone(e.nativeEvent.pageX, e.nativeEvent.pageY),
      onPanResponderMove: (e) => markZone(e.nativeEvent.pageX, e.nativeEvent.pageY),
    })
  ).current;

  const handleReset = () => {
    coveredRef.current = new Set();
    setCoveredZones(new Set());
  };

  const covered = coveredZones.size;
  const total = ZONES.length;
  const allDone = covered === total;

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permBox}>
          <Text style={styles.permEmoji}>📷</Text>
          <Text style={styles.permTitle}>카메라 권한 필요</Text>
          <Text style={styles.permSub}>얼굴 도포 체크를 위해 카메라 접근이 필요합니다</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
            <Text style={styles.permBtnText}>권한 허용하기</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.permSkip}>
            <Text style={styles.permSkipText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 전면 카메라 */}
      <CameraView style={StyleSheet.absoluteFill} facing="front" />

      {/* 어두운 그라디언트 오버레이 (상단/하단) */}
      <View style={styles.topGradient} />
      <View style={styles.bottomGradient} />

      {/* 얼굴 구역 SVG 오버레이 + 터치 인터셉터 */}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <Svg width={SW} height={SH} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="redGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#ef4444" stopOpacity="0.7" />
              <Stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
            </RadialGradient>
            <RadialGradient id="greenGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#60c4a0" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#60c4a0" stopOpacity="0.05" />
            </RadialGradient>
          </Defs>
          {ZONES.map((zone) => {
            const isCovered = coveredZones.has(zone.id);
            return (
              <Ellipse
                key={zone.id}
                cx={zone.cx * SW}
                cy={zone.cy * SH}
                rx={zone.rx}
                ry={zone.ry}
                fill={isCovered ? "url(#greenGlow)" : "url(#redGlow)"}
                stroke={isCovered ? "rgba(96,196,160,0.6)" : "rgba(239,68,68,0.8)"}
                strokeWidth={1.5}
                strokeDasharray={isCovered ? undefined : "4 3"}
              />
            );
          })}
        </Svg>
      </View>

      {/* 상단 헤더 */}
      <SafeAreaView style={styles.headerArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.progressPill}>
            <Text style={[styles.progressText, allDone && { color: "#60c4a0" }]}>
              {covered} / {total} 구역
            </Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>↺</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.guideText}>
          {allDone ? "✓ 전체 도포 완료!" : "선크림 바른 부위를 손가락으로 쓸어주세요"}
        </Text>
      </SafeAreaView>

      {/* 하단 구역 칩 + 완료 버튼 */}
      <View style={styles.bottomArea}>
        <View style={styles.zoneChips}>
          {ZONES.map((zone) => {
            const done = coveredZones.has(zone.id);
            return (
              <View key={zone.id} style={[styles.chip, done && styles.chipDone]}>
                <Text style={[styles.chipText, done && styles.chipTextDone]}>
                  {done ? "✓" : "○"} {zone.label}
                </Text>
              </View>
            );
          })}
        </View>

        {allDone && (
          <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>✓ 도포 완료 — 닫기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  fullScreen: { flex: 1, backgroundColor: "#000" },

  topGradient: {
    position: "absolute", top: 0, left: 0, right: 0, height: 160,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  bottomGradient: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 220,
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  headerArea: { position: "absolute", top: 0, left: 0, right: 0 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36, height: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  closeBtnText: { fontSize: 16, color: "#fff" },
  progressPill: {
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  progressText: { fontSize: 14, fontWeight: "800", color: "#FFD060" },
  resetBtn: {
    width: 36, height: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  resetBtnText: { fontSize: 18, color: "#fff" },
  guideText: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    paddingVertical: 6,
  },

  bottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  zoneChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: "rgba(239,68,68,0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.5)",
  },
  chipDone: {
    backgroundColor: "rgba(96,196,160,0.2)",
    borderColor: "rgba(96,196,160,0.5)",
  },
  chipText: { fontSize: 11, color: "#ef4444", fontWeight: "600" },
  chipTextDone: { color: "#60c4a0" },

  doneBtn: {
    backgroundColor: "#60c4a0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  doneBtnText: { fontSize: 15, fontWeight: "800", color: "#0f1923" },

  // 권한 화면
  permBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  permEmoji: { fontSize: 56, marginBottom: 16 },
  permTitle: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8 },
  permSub: { fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 28, lineHeight: 20 },
  permBtn: { backgroundColor: "#FFD060", borderRadius: 10, paddingHorizontal: 28, paddingVertical: 13, marginBottom: 12 },
  permBtnText: { fontSize: 15, fontWeight: "700", color: "#0f1923" },
  permSkip: { padding: 8 },
  permSkipText: { fontSize: 13, color: "rgba(255,255,255,0.35)" },
});
