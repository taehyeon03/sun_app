// FaceApplyScreen.tsx — 카메라 기반 얼굴 자동 감지 (모바일 최적화)
// 방식: 카메라 라이브 프리뷰 → 1초마다 프레임 캡처 → 마스크 자동 생성
import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Dimensions, ActivityIndicator, Alert, Platform,
  GestureResponderEvent,
} from "react-native";
import { CameraCapturedPicture, CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Circle, Defs, Mask, Path, Rect } from "react-native-svg";
import type { RNMLKitFace, RNMLKitFaceDetector } from "@infinitered/react-native-mlkit-face-detection";

interface Props {
  onClose: () => void;
}

const { width: SW, height: SH } = Dimensions.get("window");

// 마스크 영역
interface MaskPolygon {
  points: string;
  cutouts: MaskCutout[];
  filledPercentage: number;
  centerX: number;
  centerY: number;
  source: "estimated" | "mlkit";
}

interface MaskCutout {
  id: string;
  points: string;
}

interface Point {
  x: number;
  y: number;
}

interface EraseStamp extends Point {
  id: number;
  radius: number;
}

const ERASER_RADIUS = 28;
const MIN_ERASE_DISTANCE = 10;
const MAX_ERASE_STAMPS = 260;
const COVERAGE_SAMPLE_STEP = 14;
const SEGMENT_SMOOTHING_ALPHA = 0.42;

function parsePolygonPoints(points: string): Point[] {
  return points
    .split(" ")
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function isPointInPolygon(point: Point, polygon: Point[]) {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y
      && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function pointsToString(points: Point[]) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

function pointsToPath(points: string | Point[]) {
  const parsed = typeof points === "string" ? parsePolygonPoints(points) : points;
  if (parsed.length < 3) return "";
  const [first, ...rest] = parsed;
  return [
    `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`,
    ...rest.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`),
    "Z",
  ].join(" ");
}

function createCompoundPath(mask: MaskPolygon) {
  return [
    pointsToPath(mask.points),
    ...mask.cutouts.map((cutout) => pointsToPath(cutout.points)),
  ].filter(Boolean).join(" ");
}

function polygonArea(points: Point[]) {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
  }

  return Math.abs(area / 2);
}

function calculateMaskArea(mask: MaskPolygon) {
  const outerArea = polygonArea(parsePolygonPoints(mask.points));
  const cutoutArea = mask.cutouts.reduce((sum, cutout) => (
    sum + polygonArea(parsePolygonPoints(cutout.points))
  ), 0);

  return Math.max(0, outerArea - cutoutArea);
}

function isPointInMask(point: Point, outer: Point[], cutouts: Point[][]) {
  if (!isPointInPolygon(point, outer)) return false;
  return !cutouts.some((cutout) => isPointInPolygon(point, cutout));
}

function createEllipsePoints(centerX: number, centerY: number, radiusX: number, radiusY: number, count = 28) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count;
    return {
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    };
  });
}

function interpolatePointStrings(previous: string, next: string, alpha: number) {
  const previousPoints = parsePolygonPoints(previous);
  const nextPoints = parsePolygonPoints(next);
  if (previousPoints.length !== nextPoints.length || nextPoints.length < 3) return next;

  return pointsToString(nextPoints.map((point, index) => ({
    x: previousPoints[index].x + (point.x - previousPoints[index].x) * alpha,
    y: previousPoints[index].y + (point.y - previousPoints[index].y) * alpha,
  })));
}

function smoothMaskSegment(previous: MaskPolygon | null, next: MaskPolygon) {
  if (!previous || previous.source !== "mlkit" || next.source !== "mlkit") return next;

  return {
    ...next,
    points: interpolatePointStrings(previous.points, next.points, SEGMENT_SMOOTHING_ALPHA),
    cutouts: next.cutouts.map((cutout) => {
      const previousCutout = previous.cutouts.find((item) => item.id === cutout.id);
      return previousCutout
        ? { ...cutout, points: interpolatePointStrings(previousCutout.points, cutout.points, SEGMENT_SMOOTHING_ALPHA) }
        : cutout;
    }),
    centerX: previous.centerX + (next.centerX - previous.centerX) * SEGMENT_SMOOTHING_ALPHA,
    centerY: previous.centerY + (next.centerY - previous.centerY) * SEGMENT_SMOOTHING_ALPHA,
  };
}

function estimateCoverage(mask: MaskPolygon, stamps: EraseStamp[]) {
  const outer = parsePolygonPoints(mask.points);
  const cutouts = mask.cutouts.map((cutout) => parsePolygonPoints(cutout.points));
  if (outer.length < 3) return 0;
  if (stamps.length === 0) return 100;

  const xs = outer.map((point) => point.x);
  const ys = outer.map((point) => point.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(SW, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(SH, Math.ceil(Math.max(...ys)));

  let total = 0;
  let erased = 0;

  for (let y = minY; y <= maxY; y += COVERAGE_SAMPLE_STEP) {
    for (let x = minX; x <= maxX; x += COVERAGE_SAMPLE_STEP) {
      const sample = { x, y };
      if (!isPointInMask(sample, outer, cutouts)) continue;

      total += 1;
      if (stamps.some((stamp) => Math.hypot(x - stamp.x, y - stamp.y) <= stamp.radius)) {
        erased += 1;
      }
    }
  }

  if (total === 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((total - erased) / total) * 100)));
}

// 얼굴 영역 추정 (카메라 중앙 기준 — 가장 범용적)
function estimateFaceRegion(): MaskPolygon {
  // 카메라 중앙에서 얼굴 예상 영역 설정 (모든 사용자에게 최적화)
  const centerX = SW / 2;
  const centerY = SH * 0.38; // 약간 위쪽
  const faceWidth = SW * 0.55;
  const faceHeight = SH * 0.52;
  const outer = createEllipsePoints(centerX, centerY, faceWidth / 2, faceHeight / 2, 36);
  const cutouts = [
    {
      id: "leftEye",
      points: pointsToString(createEllipsePoints(centerX - faceWidth * 0.18, centerY - faceHeight * 0.08, faceWidth * 0.09, faceHeight * 0.035, 18)),
    },
    {
      id: "rightEye",
      points: pointsToString(createEllipsePoints(centerX + faceWidth * 0.18, centerY - faceHeight * 0.08, faceWidth * 0.09, faceHeight * 0.035, 18)),
    },
    {
      id: "mouth",
      points: pointsToString(createEllipsePoints(centerX, centerY + faceHeight * 0.22, faceWidth * 0.13, faceHeight * 0.04, 18)),
    },
  ];
  const points = pointsToString(outer);
  const filledPercentage = calculateMaskArea({
    points,
    cutouts,
    filledPercentage: 0,
    centerX,
    centerY,
    source: "estimated",
  }) / (SW * SH) * 100;

  return {
    points,
    cutouts,
    filledPercentage,
    centerX,
    centerY,
    source: "estimated",
  };
}

function getContourPoints(face: RNMLKitFace, type: string) {
  return face.contours
    .find((contour) => contour.type === type)
    ?.points
    ?.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) ?? [];
}

function pickPrimaryFace(faces?: RNMLKitFace[]) {
  if (!faces?.length) return undefined;

  return [...faces].sort((a, b) => (
    b.frame.size.x * b.frame.size.y - a.frame.size.x * a.frame.size.y
  ))[0];
}

function createMaskFromFace(face: RNMLKitFace, photo: CameraCapturedPicture): MaskPolygon | null {
  const ovalPoints = getContourPoints(face, "faceOval");
  if (ovalPoints.length < 8 || !photo.width || !photo.height) return null;

  const scale = Math.max(SW / photo.width, SH / photo.height);
  const renderedWidth = photo.width * scale;
  const renderedHeight = photo.height * scale;
  const offsetX = (SW - renderedWidth) / 2;
  const offsetY = (SH - renderedHeight) / 2;

  const mapPoint = (point: Point) => {
    const previewX = point.x * scale + offsetX;
    const previewY = point.y * scale + offsetY;
    const mirroredX = SW - previewX;
    return {
      x: Math.max(0, Math.min(SW, mirroredX)),
      y: Math.max(0, Math.min(SH, previewY)),
    };
  };

  const mapContour = (type: string) => getContourPoints(face, type).map(mapPoint);
  const mapped = ovalPoints.map(mapPoint);

  const leftEye = mapContour("leftEye");
  const rightEye = mapContour("rightEye");
  const upperLipTop = mapContour("upperLipTop");
  const upperLipBottom = mapContour("upperLipBottom");
  const lowerLipTop = mapContour("lowerLipTop");
  const lowerLipBottom = mapContour("lowerLipBottom");
  const mouthTop = upperLipTop.length >= 3 ? upperLipTop : upperLipBottom;
  const mouthBottom = lowerLipBottom.length >= 3 ? lowerLipBottom : lowerLipTop;

  const cutouts: MaskCutout[] = [
    leftEye.length >= 6 ? { id: "leftEye", points: pointsToString(leftEye) } : null,
    rightEye.length >= 6 ? { id: "rightEye", points: pointsToString(rightEye) } : null,
    mouthTop.length >= 3 && mouthBottom.length >= 3
      ? { id: "mouth", points: pointsToString([...mouthTop, ...[...mouthBottom].reverse()]) }
      : null,
  ].filter((cutout): cutout is MaskCutout => Boolean(cutout));

  const xs = mapped.map((point) => point.x);
  const ys = mapped.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const points = pointsToString(mapped);
  const mask = {
    points,
    cutouts,
    filledPercentage: 0,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    source: "mlkit" as const,
  };

  return {
    ...mask,
    filledPercentage: calculateMaskArea(mask) / (SW * SH) * 100,
    source: "mlkit",
  };
}

async function createFaceDetector(): Promise<RNMLKitFaceDetector | null> {
  if (Platform.OS === "web") return null;

  const { RNMLKitFaceDetector } = await import("@infinitered/react-native-mlkit-face-detection");
  const detector = new RNMLKitFaceDetector({
    performanceMode: "fast",
    contourMode: true,
    landmarkMode: false,
    classificationMode: false,
    minFaceSize: 0.18,
    isTrackingEnabled: true,
  }, true);

  await detector.initialize();
  return detector;
}

export default function FaceApplyScreen({ onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [maskPolygon, setMaskPolygon] = useState<MaskPolygon>(() => estimateFaceRegion());
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<"pending" | "denied" | "granted">("pending");
  const [segmentationStatus, setSegmentationStatus] = useState<"loading" | "ready" | "detecting" | "fallback" | "unsupported" | "error">("loading");
  const [segmentationMessage, setSegmentationMessage] = useState("온디바이스 얼굴 모델 준비 중...");
  const [eraseStamps, setEraseStamps] = useState<EraseStamp[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const isMountedRef = useRef(true);
  const detectorRef = useRef<RNMLKitFaceDetector | null>(null);
  const isDetectingRef = useRef(false);
  const hasEditedRef = useRef(false);
  const previousMaskRef = useRef<MaskPolygon | null>(null);
  const stampIdRef = useRef(0);
  const lastErasePointRef = useRef<Point | null>(null);

  const maskHitTest = useMemo(() => ({
    outer: parsePolygonPoints(maskPolygon.points),
    cutouts: maskPolygon.cutouts.map((cutout) => parsePolygonPoints(cutout.points)),
  }), [maskPolygon]);
  const maskPath = useMemo(() => createCompoundPath(maskPolygon), [maskPolygon]);
  const coveragePercentage = useMemo(
    () => estimateCoverage(maskPolygon, eraseStamps),
    [maskPolygon, eraseStamps],
  );

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

  useEffect(() => {
    if (permissionStatus !== "granted" || !isCameraReady) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const init = async () => {
      if (Platform.OS === "web") {
        setSegmentationStatus("unsupported");
        setSegmentationMessage("웹에서는 네이티브 ML Kit을 사용할 수 없어 예상 마스크를 표시합니다.");
        return;
      }

      try {
        detectorRef.current = await createFaceDetector();
        if (cancelled || !isMountedRef.current) return;
        setSegmentationStatus("ready");
        setSegmentationMessage("얼굴 영역을 찾는 중...");
        loop();
      } catch (error) {
        console.error("Face detector init error:", error);
        if (!isMountedRef.current) return;
        setSegmentationStatus("error");
        setSegmentationMessage("온디바이스 얼굴 모델을 초기화하지 못해 예상 마스크를 표시합니다.");
      }
    };

    const loop = async () => {
      if (cancelled || !isMountedRef.current) return;
      if (hasEditedRef.current) {
        timeout = setTimeout(loop, 1600);
        return;
      }

      if (!cameraRef.current || !detectorRef.current || isDetectingRef.current) {
        timeout = setTimeout(loop, 1200);
        return;
      }

      isDetectingRef.current = true;
      setSegmentationStatus("detecting");

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.35,
          skipProcessing: true,
        });
        const result = await detectorRef.current.detectFaces(photo.uri);
        const primaryFace = pickPrimaryFace(result?.faces);
        const rawMask = primaryFace ? createMaskFromFace(primaryFace, photo) : null;
        const nextMask = rawMask ? smoothMaskSegment(previousMaskRef.current, rawMask) : null;

        if (!cancelled && isMountedRef.current && !hasEditedRef.current) {
          if (nextMask) {
            previousMaskRef.current = nextMask;
            setMaskPolygon(nextMask);
            setSegmentationStatus("ready");
            setSegmentationMessage("얼굴 세그멘테이션 활성화 · 눈/입 제외");
          } else {
            previousMaskRef.current = null;
            setSegmentationStatus("fallback");
            setSegmentationMessage("얼굴을 중앙에 맞추면 자동 마스크가 적용됩니다.");
          }
        }
      } catch (error) {
        console.error("Face detection error:", error);
        if (!cancelled && isMountedRef.current) {
          setSegmentationStatus("fallback");
          setSegmentationMessage("얼굴 감지 대기 중");
        }
      } finally {
        isDetectingRef.current = false;
        if (!cancelled) timeout = setTimeout(loop, 1600);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [permissionStatus, isCameraReady]);

  const addEraseStamp = useCallback((event: GestureResponderEvent) => {
    const point = {
      x: event.nativeEvent.locationX,
      y: event.nativeEvent.locationY,
    };

    if (!isPointInMask(point, maskHitTest.outer, maskHitTest.cutouts)) return;

    const lastPoint = lastErasePointRef.current;
    if (lastPoint) {
      const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
      if (distance < MIN_ERASE_DISTANCE) return;
    }

    hasEditedRef.current = true;
    lastErasePointRef.current = point;
    setSegmentationStatus("ready");
    setSegmentationMessage("문지른 부위의 색이 지워집니다.");
    setEraseStamps((prev) => {
      const next = [
        ...prev,
        {
          id: stampIdRef.current++,
          x: point.x,
          y: point.y,
          radius: ERASER_RADIUS,
        },
      ];
      return next.length > MAX_ERASE_STAMPS ? next.slice(next.length - MAX_ERASE_STAMPS) : next;
    });
  }, [maskHitTest]);

  const handleEraseStart = useCallback((event: GestureResponderEvent) => {
    lastErasePointRef.current = null;
    addEraseStamp(event);
  }, [addEraseStamp]);

  const handleEraseEnd = useCallback(() => {
    lastErasePointRef.current = null;
  }, []);

  const handleResetCoverage = useCallback(() => {
    hasEditedRef.current = false;
    lastErasePointRef.current = null;
    setEraseStamps([]);
    setSegmentationMessage("얼굴 영역을 찾는 중...");
  }, []);

  // 완료 처리
  const handleDone = useCallback(() => {
    if (maskPolygon.points.length > 0) {
      Alert.alert("도포 완료", `얼굴 도포 영역 ${coveragePercentage}%가 남아 있습니다.`, [
        { text: "확인", onPress: onClose },
      ]);
    }
  }, [coveragePercentage, maskPolygon, onClose]);

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
          <Defs>
            <Mask id="faceCoverageMask" x="0" y="0" width={SW} height={SH}>
              <Rect x="0" y="0" width={SW} height={SH} fill="white" />
              {eraseStamps.map((stamp) => (
                <Circle
                  key={stamp.id}
                  cx={stamp.x}
                  cy={stamp.y}
                  r={stamp.radius}
                  fill="black"
                />
              ))}
            </Mask>
          </Defs>

          {/* 감지된 얼굴 세그먼트 마스크 */}
          <Path
            d={maskPath}
            fill="#ff0000"
            opacity={0.45}
            fillRule="evenodd"
            mask="url(#faceCoverageMask)"
          />

          {/* 얼굴 경계 가이드 */}
          <Path
            d={pointsToPath(maskPolygon.points)}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={2}
          />
          {maskPolygon.cutouts.map((cutout) => (
            <Path
              key={cutout.id}
              d={pointsToPath(cutout.points)}
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={1.4}
            />
          ))}
        </Svg>
      </View>

      <View
        style={styles.eraseSurface}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleEraseStart}
        onResponderMove={addEraseStamp}
        onResponderRelease={handleEraseEnd}
        onResponderTerminate={handleEraseEnd}
      />

      {/* 상단 헤더 */}
      <SafeAreaView style={styles.headerArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.progressPill}>
            <Text style={styles.progressText}>
              {maskPolygon.source === "mlkit" ? "AI" : "예상"} · {coveragePercentage}%
            </Text>
          </View>
          <View style={styles.spacer} />
        </View>
        <Text style={styles.guideText}>
          {segmentationMessage}
        </Text>
      </SafeAreaView>

      {/* 하단 버튼 */}
      <View style={styles.bottomArea}>
        <TouchableOpacity onPress={handleResetCoverage} style={styles.resetBtn}>
          <Text style={styles.resetBtnText}>다시 칠하기</Text>
        </TouchableOpacity>
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
  eraseSurface: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
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
  resetBtn: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  resetBtnText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
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
