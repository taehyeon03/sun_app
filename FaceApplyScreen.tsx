// FaceApplyScreen.tsx — 카메라 밝기 감지 기반 선크림 도포 체크
// 방식: 2초마다 스냅샷 → 구역별 평균 밝기 → 기준 대비 +25 이상 상승 시 완료
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Dimensions, ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import Svg, { Ellipse, Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import { decode as decodePng } from "fast-png";

interface Props {
  onClose: () => void;
}

const { width: SW, height: SH } = Dimensions.get("window");

interface Zone {
  id: string;
  label: string;
  cx: number;   // 0~1 (화면 너비 비율)
  cy: number;   // 0~1 (화면 높이 비율)
  rx: number;   // 픽셀
  ry: number;   // 픽셀
}

const ZONES: Zone[] = [
  { id: "forehead",   label: "이마",        cx: 0.5,  cy: 0.24, rx: SW * 0.22, ry: SH * 0.048 },
  { id: "leftEye",    label: "왼쪽 눈가",   cx: 0.36, cy: 0.31, rx: SW * 0.10, ry: SH * 0.032 },
  { id: "rightEye",   label: "오른쪽 눈가", cx: 0.64, cy: 0.31, rx: SW * 0.10, ry: SH * 0.032 },
  { id: "nose",       label: "코",          cx: 0.5,  cy: 0.38, rx: SW * 0.07, ry: SH * 0.055 },
  { id: "leftCheek",  label: "왼쪽 볼",     cx: 0.3,  cy: 0.43, rx: SW * 0.13, ry: SH * 0.075 },
  { id: "rightCheek", label: "오른쪽 볼",   cx: 0.7,  cy: 0.43, rx: SW * 0.13, ry: SH * 0.075 },
  { id: "lips",       label: "입 주변",     cx: 0.5,  cy: 0.50, rx: SW * 0.12, ry: SH * 0.038 },
  { id: "chin",       label: "턱",          cx: 0.5,  cy: 0.57, rx: SW * 0.14, ry: SH * 0.038 },
];

// 구역의 평균 밝기(0~255)를 반환
async function getZoneBrightness(
  photoUri: string,
  zone: Zone,
  photoW: number,
  photoH: number,
): Promise<number> {
  const scaleX = photoW / SW;
  const scaleY = photoH / SH;

  // 전면 카메라는 좌우 반전 — cx를 미러링
  const mirroredCx = 1 - zone.cx;
  const originX = Math.max(0, Math.round((mirroredCx * SW - zone.rx) * scaleX));
  const originY = Math.max(0, Math.round((zone.cy * SH - zone.ry) * scaleY));
  const w = Math.max(4, Math.min(Math.round(zone.rx * 2 * scaleX), photoW - originX));
  const h = Math.max(4, Math.min(Math.round(zone.ry * 2 * scaleY), photoH - originY));

  const result = await ImageManipulator.manipulateAsync(
    photoUri,
    [
      { crop: { originX, originY, width: w, height: h } },
      { resize: { width: 6, height: 6 } },
    ],
    { base64: true, format: ImageManipulator.SaveFormat.PNG },
  );

  if (!result.base64) return 128;

  // base64 → Uint8Array → PNG 디코딩 → 평균 휘도
  const binary = atob(result.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const img = decodePng(bytes);
  const { data, width, height, channels } = img;
  let sum = 0;
  const count = width * height;
  for (let i = 0; i < count; i++) {
    const o = i * channels;
    // ITU-R BT.601 휘도 공식
    sum += data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
  }
  return sum / count;
}

export default function FaceApplyScreen({ onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [coveredZones, setCoveredZones] = useState<Set<string>>(new Set());
  const [baselineReady, setBaselineReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState("잠시 후 기준 측정이 시작됩니다...");

  const cameraRef = useRef<CameraView>(null);
  const baselineRef = useRef<Record<string, number> | null>(null);
  const coveredRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (isProcessingRef.current || !cameraRef.current) return;
    isProcessingRef.current = true;
    setScanning(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.15 });
      const { width: pw, height: ph, uri } = photo;

      // 모든 구역 밝기 측정 (순차 처리)
      const brightness: Record<string, number> = {};
      for (const zone of ZONES) {
        try {
          brightness[zone.id] = await getZoneBrightness(uri, zone, pw, ph);
        } catch {
          brightness[zone.id] = 128;
        }
      }

      if (!baselineRef.current) {
        // 첫 번째 캡처 = 기준값
        baselineRef.current = brightness;
        setBaselineReady(true);
        setStatusMsg("얼굴에 선크림을 발라주세요 — 자동으로 감지됩니다");
      } else {
        // 기준 대비 밝기 상승 감지 (선크림 = 흰색 = 밝기 상승)
        const base = baselineRef.current;
        const next = new Set(coveredRef.current);
        let changed = false;

        for (const zone of ZONES) {
          if (!next.has(zone.id)) {
            const diff = brightness[zone.id] - base[zone.id];
            if (diff > 25) {  // 흰 선크림 기준 임계값
              next.add(zone.id);
              changed = true;
            }
          }
        }

        if (changed) {
          coveredRef.current = next;
          setCoveredZones(new Set(next));
          const done = next.size;
          if (done === ZONES.length) {
            setStatusMsg("✓ 전체 도포 완료!");
          } else {
            setStatusMsg(`${done} / ${ZONES.length} 구역 감지됨`);
          }
        }
      }
    } catch (e) {
      // 감지 실패 시 무시하고 다음 주기를 기다림
    } finally {
      setScanning(false);
      isProcessingRef.current = false;
    }
  }, []);

  // 카메라 권한 확보 후 2초 안정화 → 기준 측정 → 2초마다 감지
  useEffect(() => {
    if (!permission?.granted) return;
    const init = setTimeout(() => {
      captureAndAnalyze();
    }, 2000);
    return () => clearTimeout(init);
  }, [permission?.granted]);

  useEffect(() => {
    if (!baselineReady) return;
    const interval = setInterval(captureAndAnalyze, 2000);
    return () => clearInterval(interval);
  }, [baselineReady, captureAndAnalyze]);

  const handleReset = () => {
    baselineRef.current = null;
    coveredRef.current = new Set();
    setBaselineReady(false);
    setCoveredZones(new Set());
    setStatusMsg("잠시 후 기준 측정이 시작됩니다...");
    setTimeout(captureAndAnalyze, 2000);
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
          <Text style={styles.permSub}>얼굴 도포 감지를 위해 카메라가 필요합니다</Text>
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
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />

      {/* 상단/하단 그라디언트 */}
      <View style={styles.topGradient} />
      <View style={styles.bottomGradient} />

      {/* 얼굴 가이드 타원 + 구역 오버레이 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={SW} height={SH} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="redGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#ef4444" stopOpacity="0.65" />
              <Stop offset="100%" stopColor="#ef4444" stopOpacity="0.15" />
            </RadialGradient>
            <RadialGradient id="greenGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#60c4a0" stopOpacity="0.45" />
              <Stop offset="100%" stopColor="#60c4a0" stopOpacity="0.05" />
            </RadialGradient>
          </Defs>

          {/* 얼굴 윤곽 가이드 */}
          <Ellipse
            cx={SW * 0.5}
            cy={SH * 0.41}
            rx={SW * 0.38}
            ry={SH * 0.27}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />

          {/* 구역 타원 */}
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
                stroke={isCovered ? "rgba(96,196,160,0.7)" : "rgba(239,68,68,0.8)"}
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
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.progressPill}>
            {scanning ? (
              <ActivityIndicator size="small" color="#FFD060" style={{ marginRight: 6 }} />
            ) : null}
            <Text style={[styles.progressText, allDone && { color: "#60c4a0" }]}>
              {covered} / {total} 구역
            </Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>↺</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.guideText}>{statusMsg}</Text>

        {/* 기준 측정 전 안내 */}
        {!baselineReady && (
          <View style={styles.calibrateBox}>
            <Text style={styles.calibrateText}>
              📍 얼굴을 타원 안에 맞추고 잠시 기다려주세요
            </Text>
          </View>
        )}
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
    position: "absolute", top: 0, left: 0, right: 0, height: 180,
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
  iconBtn: {
    width: 36, height: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  iconBtnText: { fontSize: 16, color: "#fff" },
  progressPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  progressText: { fontSize: 14, fontWeight: "800", color: "#FFD060" },
  guideText: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  calibrateBox: {
    marginHorizontal: 20,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,208,96,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,208,96,0.3)",
  },
  calibrateText: { fontSize: 12, color: "#FFD060", textAlign: "center" },

  bottomArea: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 36,
  },
  zoneChips: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    justifyContent: "center", marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: "rgba(239,68,68,0.2)",
    borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(239,68,68,0.5)",
  },
  chipDone: {
    backgroundColor: "rgba(96,196,160,0.2)",
    borderColor: "rgba(96,196,160,0.5)",
  },
  chipText: { fontSize: 11, color: "#ef4444", fontWeight: "600" },
  chipTextDone: { color: "#60c4a0" },

  doneBtn: {
    backgroundColor: "#60c4a0", borderRadius: 12, padding: 16, alignItems: "center",
  },
  doneBtnText: { fontSize: 15, fontWeight: "800", color: "#0f1923" },

  permBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  permEmoji: { fontSize: 56, marginBottom: 16 },
  permTitle: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8 },
  permSub: { fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 28, lineHeight: 20 },
  permBtn: { backgroundColor: "#FFD060", borderRadius: 10, paddingHorizontal: 28, paddingVertical: 13, marginBottom: 12 },
  permBtnText: { fontSize: 15, fontWeight: "700", color: "#0f1923" },
  permSkip: { padding: 8 },
  permSkipText: { fontSize: 13, color: "rgba(255,255,255,0.35)" },
});
