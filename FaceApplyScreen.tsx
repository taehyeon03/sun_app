// FaceApplyScreen.tsx — 얼굴 세그멘테이션 기반 도포 확인
// 방식: 초록색 마스크 얼굴 영역 → 손가락으로 문지르면 색 지워짐
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, PanResponder,
  SafeAreaView, StatusBar, Dimensions, ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";

interface Props {
  onClose: () => void;
}

const { width: SW, height: SH } = Dimensions.get("window");

// 얼굴 영역: 중심 (SW/2, SH*0.4), 반지름 SH*0.3
const FACE_CX = SW / 2;
const FACE_CY = SH * 0.4;
const FACE_RADIUS = SH * 0.3;
const ERASE_RADIUS = 60; // 손가락 터치 반지름

interface MaskCell {
  cx: number;
  cy: number;
  active: boolean; // true면 초록색, false면 지워짐
}

// 얼굴 영역을 50x50 크기 셀로 분할
function createMaskGrid(): MaskCell[] {
  const cells: MaskCell[] = [];
  const cellSize = 50;

  for (let x = 0; x < SW; x += cellSize) {
    for (let y = 0; y < SH; y += cellSize) {
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;
      // 얼굴 영역 내의 셀만 활성화
      const dist = Math.sqrt((cx - FACE_CX) ** 2 + (cy - FACE_CY) ** 2);
      if (dist < FACE_RADIUS) {
        cells.push({ cx, cy, active: true });
      }
    }
  }
  return cells;
}

export default function FaceApplyScreen({ onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mask, setMask] = useState<MaskCell[]>(createMaskGrid());
  const [erasedCount, setErasedCount] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission?.granted) {
      const checkPerm = async () => {
        try {
          await requestPermission();
        } catch (e) {
          // 권한 요청 오류 무시
        }
      };
      checkPerm();
    }
  }, [permission, requestPermission]);

  // 터치 이벤트로 마스크 지우기
  const handleTouchMove = useCallback((x: number, y: number) => {
    setMask((prevMask) => {
      let count = 0;
      const newMask = prevMask.map((cell) => {
        if (!cell.active) return cell;

        const dist = Math.sqrt((cell.cx - x) ** 2 + (cell.cy - y) ** 2);
        if (dist < ERASE_RADIUS) {
          count++;
          return { ...cell, active: false };
        }
        return cell;
      });

      const totalActive = newMask.filter((c) => c.active).length;
      setErasedCount(Math.round((1 - totalActive / mask.length) * 100));
      return newMask;
    });
  }, [mask.length]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        handleTouchMove(pageX, pageY);
      },
    })
  ).current;

  const handleReset = () => {
    setMask(createMaskGrid());
    setErasedCount(0);
  };

  const allErased = erasedCount >= 85; // 85% 이상 지워지면 완료
  const activeCells = mask.filter((c) => c.active).length;

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permBox}>
          <Text style={styles.permEmoji}>📷</Text>
          <Text style={styles.permTitle}>카메라 권한 필요</Text>
          <Text style={styles.permSub}>선크림 도포 확인을 위해 카메라가 필요합니다</Text>
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
    <View style={styles.fullScreen} {...panResponder.panHandlers}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 전면 카메라 */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />

      {/* 상단/하단 그라디언트 오버레이 */}
      <View style={styles.topGradient} />
      <View style={styles.bottomGradient} />

      {/* 얼굴 세그멘테이션 마스크 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={SW} height={SH} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="faceGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#4ade80" stopOpacity="0.5" />
              <Stop offset="100%" stopColor="#4ade80" stopOpacity="0.2" />
            </RadialGradient>
          </Defs>

          {/* 마스크 셀 렌더링 */}
          {mask.map((cell, i) => (
            cell.active && (
              <Circle
                key={i}
                cx={cell.cx}
                cy={cell.cy}
                r={20}
                fill="#4ade80"
                opacity={0.6}
              />
            )
          ))}

          {/* 얼굴 윤곽 가이드 */}
          <Circle
            cx={FACE_CX}
            cy={FACE_CY}
            r={FACE_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        </Svg>
      </View>

      {/* 상단 헤더 */}
      <SafeAreaView style={styles.headerArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.progressPill}>
            <Text style={styles.progressText}>
              {erasedCount}% 도포됨
            </Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>↺</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.guideText}>
          {allErased
            ? "✓ 도포 완료!"
            : "손가락으로 초록색 부분을 문지르세요"}
        </Text>
      </SafeAreaView>

      {/* 하단 버튼 */}
      <View style={styles.bottomArea}>
        {allErased && (
          <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>✓ 도포 완료 — 닫기</Text>
          </TouchableOpacity>
        )}
        {!allErased && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              도포율: {erasedCount}% • {activeCells}개 영역 남음
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  fullScreen: { flex: 1, backgroundColor: "#000" },

  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  headerArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { fontSize: 16, color: "#fff" },
  progressPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  progressText: { fontSize: 14, fontWeight: "800", color: "#4ade80" },
  guideText: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    paddingVertical: 6,
    paddingHorizontal: 20,
  },

  bottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  doneBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  doneBtnText: { fontSize: 15, fontWeight: "800", color: "#0f1923" },
  infoBox: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.3)",
  },
  infoText: {
    fontSize: 13,
    color: "#4ade80",
    textAlign: "center",
    fontWeight: "600",
  },

  permBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  permEmoji: { fontSize: 56, marginBottom: 16 },
  permTitle: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8 },
  permSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  permBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginBottom: 12,
  },
  permBtnText: { fontSize: 15, fontWeight: "700", color: "#0f1923" },
  permSkip: { padding: 8 },
  permSkipText: { fontSize: 13, color: "rgba(255,255,255,0.35)" },
});
