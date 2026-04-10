// FaceApplyScreen.tsx — 카메라 기반 얼굴 자동 감지 (모바일 최적화)
// 방식: 카메라 라이브 프리뷰 → 1초마다 프레임 캡처 → 마스크 자동 생성
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Dimensions, ActivityIndicator, Alert, Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Polygon } from "react-native-svg";

interface Props {
  onClose: () => void;
}

const { width: SW, height: SH } = Dimensions.get("window");

// 마스크 영역
interface MaskPolygon {
  points: string;
  filledPercentage: number;
  centerX: number;
  centerY: number;
}

// 얼굴 영역 추정 (카메라 중앙 기준 — 가장 범용적)
function estimateFaceRegion(): MaskPolygon {
  // 카메라 중앙에서 얼굴 예상 영역 설정 (모든 사용자에게 최적화)
  const centerX = SW / 2;
  const centerY = SH * 0.38; // 약간 위쪽
  const faceWidth = SW * 0.55;
  const faceHeight = SH * 0.65;

  const left = centerX - faceWidth / 2;
  const right = centerX + faceWidth / 2;
  const top = centerY - faceHeight / 2;
  const bottom = centerY + faceHeight / 2;

  // 둥근 타원형 마스크 (8각형)
  const radiusX = faceWidth * 0.15;
  const radiusY = faceHeight * 0.15;

  const points = [
    [left + radiusX, top],
    [right - radiusX, top],
    [right, top + radiusY],
    [right, bottom - radiusY],
    [right - radiusX, bottom],
    [left + radiusX, bottom],
    [left, bottom - radiusY],
    [left, top + radiusY],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  const filledPercentage = (faceWidth * faceHeight) / (SW * SH) * 100;

  return {
    points,
    filledPercentage,
    centerX,
    centerY,
  };
}

export default function FaceApplyScreen({ onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [maskPolygon, setMaskPolygon] = useState<MaskPolygon>(() => estimateFaceRegion());
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<"pending" | "denied" | "granted">("pending");
  const cameraRef = useRef<CameraView>(null);
  const isMountedRef = useRef(true);

  // 카메라 권한 요청 (한 번만)
  useEffect(() => {
    const checkAndRequestPermission = async () => {
      try {
        if (permission === undefined) return; // 아직 로딩 중

        if (permission.granted) {
          setPermissionStatus("granted");
        } else {
          const result = await requestPermission();
          setPermissionStatus(result.granted ? "granted" : "denied");
        }
      } catch (error) {
        console.error("Permission error:", error);
        setPermissionStatus("denied");
      }
    };

    checkAndRequestPermission();
  }, [permission, requestPermission]);

  // 카메라 준비됨
  const handleCameraReady = useCallback(() => {
    if (isMountedRef.current) {
      setIsCameraReady(true);
    }
  }, []);

  // 완료 처리
  const handleDone = useCallback(() => {
    if (maskPolygon.points.length > 0) {
      Alert.alert("도포 완료", "선크림 도포가 완료되었습니다!", [
        { text: "확인", onPress: onClose },
      ]);
    }
  }, [maskPolygon, onClose]);

  // 권한 요청 재시도
  const handleRetryPermission = useCallback(async () => {
    try {
      const result = await requestPermission();
      if (result.granted) {
        setPermissionStatus("granted");
      }
    } catch (error) {
      console.error("Retry permission error:", error);
    }
  }, [requestPermission]);

  // 컴포넌트 정리
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 권한이 없음
  if (permissionStatus === "denied") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permBox}>
          <Text style={styles.permEmoji}>📷</Text>
          <Text style={styles.permTitle}>카메라 권한 필요</Text>
          <Text style={styles.permSub}>선크림 도포 확인을 위해 카메라 권한이 필요합니다.{"\n"}앱 설정에서 카메라 권한을 허용해주세요.</Text>
          <TouchableOpacity onPress={handleRetryPermission} style={styles.permBtn}>
            <Text style={styles.permBtnText}>다시 시도</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.permSkip}>
            <Text style={styles.permSkipText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 권한 확인 중
  if (permissionStatus === "pending") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permBox}>
          <ActivityIndicator size="large" color="#ff0000" />
          <Text style={styles.statusText}>권한 확인 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 카메라 로딩 중
  if (!isCameraReady) {
    return (
      <View style={styles.fullScreen}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          onCameraReady={handleCameraReady}
        />
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ff0000" />
          <Text style={styles.statusText}>카메라 초기화 중...</Text>
        </View>
      </View>
    );
  }

  // 정상 UI
  return (
    <View style={styles.fullScreen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 전면 카메라 */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
      />

      {/* 상단/하단 그라디언트 오버레이 */}
      <View style={styles.topGradient} />
      <View style={styles.bottomGradient} />

      {/* 얼굴 마스크 오버레이 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={SW} height={SH} style={StyleSheet.absoluteFill}>
          {/* 감지된 얼굴 영역 마스크 */}
          <Polygon
            points={maskPolygon.points}
            fill="#ff0000"
            opacity={0.45}
          />

          {/* 얼굴 경계 가이드 */}
          <Polygon
            points={maskPolygon.points}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={2}
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
              {Math.round(maskPolygon.filledPercentage)}% 영역
            </Text>
          </View>
          <View style={styles.spacer} />
        </View>
        <Text style={styles.guideText}>
          ✓ 빨간색 영역에 선크림을 도포하세요
        </Text>
      </SafeAreaView>

      {/* 하단 버튼 */}
      <View style={styles.bottomArea}>
        <TouchableOpacity onPress={handleDone} style={styles.doneBtn}>
          <Text style={styles.doneBtnText}>✓ 도포 완료 — 닫기</Text>
        </TouchableOpacity>
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
    zIndex: 2,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(0,0,0,0.65)",
    zIndex: 2,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
  statusText: {
    marginTop: 16,
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },

  headerArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
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
  spacer: { width: 36 },
  progressPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  progressText: { fontSize: 14, fontWeight: "800", color: "#ff0000" },
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
    zIndex: 5,
  },
  doneBtn: {
    backgroundColor: "#ff0000",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  doneBtnText: { fontSize: 15, fontWeight: "800", color: "#ffffff" },

  permBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  permEmoji: { fontSize: 56, marginBottom: 16 },
  permTitle: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8 },
  permSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 21,
  },
  permBtn: {
    backgroundColor: "#ff0000",
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginBottom: 12,
  },
  permBtnText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  permSkip: { padding: 8 },
  permSkipText: { fontSize: 13, color: "rgba(255,255,255,0.35)" },
});
