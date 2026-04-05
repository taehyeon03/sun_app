// src/screens/SplashScreen.tsx
// 태양 차단 제스처 스플래시 화면
// 사용자가 손으로 화면을 스와이프하면 → 앱 진입 + 타이머 시작 시각 기록

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Dimensions, Animated, PanResponder,
  StatusBar, TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Line } from "react-native-svg";
import * as Haptics from "expo-haptics";

const { width: W, height: H } = Dimensions.get("window");

interface Props {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: Props) {
  const handX = useRef(new Animated.Value(-80)).current;
  const sunOpacity = useRef(new Animated.Value(1)).current;
  const sunScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progressPct, setProgressPct] = useState(0);
  const [phase, setPhase] = useState<"idle" | "tracking" | "success">("idle");
  const startXRef = useRef<number>(0);
  const trackingRef = useRef(false);

  // 배경 성운 애니메이션
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleGestureStart = useCallback((x: number) => {
    if (phase === "success") return;
    trackingRef.current = true;
    startXRef.current = x;
    setPhase("tracking");
    handX.setValue(x - 40);
  }, [phase, handX]);

  const handleGestureMove = useCallback((x: number) => {
    if (!trackingRef.current) return;
    const dx = x - startXRef.current;
    const pct = Math.min(Math.max(dx / (W * 0.72), 0), 1);
    handX.setValue(x - 40);
    progressAnim.setValue(pct);
    setProgressPct(pct);

    // 손이 태양 영역 지나갈 때 → 태양 흐려지기
    const sunVisible = 1 - pct * 1.4;
    sunOpacity.setValue(Math.max(sunVisible, 0.1));
    sunScale.setValue(1 - pct * 0.2);

    if (pct > 0.4 && pct < 0.6) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (pct >= 1) {
      trackingRef.current = false;
      setPhase("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // 성공 애니메이션 후 진입
      Animated.parallel([
        Animated.timing(sunOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(sunScale,   { toValue: 1.5, duration: 400, useNativeDriver: true }),
      ]).start(() => setTimeout(onEnter, 300));
    }
  }, [phase, handX, progressAnim, sunOpacity, sunScale, onEnter]);

  const handleGestureEnd = useCallback(() => {
    if (phase === "success") return;
    if (progressPct < 1) {
      trackingRef.current = false;
      setPhase("idle");
      setProgressPct(0);
      progressAnim.setValue(0);
      sunOpacity.setValue(1);
      sunScale.setValue(1);
      Animated.spring(handX, {
        toValue: -80, useNativeDriver: true,
      }).start();
    }
  }, [phase, progressPct, handX, progressAnim, sunOpacity, sunScale]);

  // PanResponder는 mount 시 한 번만 생성되므로 콜백을 ref로 우회
  const callbackRefs = useRef({ handleGestureStart, handleGestureMove, handleGestureEnd });
  useEffect(() => {
    callbackRefs.current = { handleGestureStart, handleGestureMove, handleGestureEnd };
  }, [handleGestureStart, handleGestureMove, handleGestureEnd]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => callbackRefs.current.handleGestureStart(e.nativeEvent.pageX),
      onPanResponderMove: (e) => callbackRefs.current.handleGestureMove(e.nativeEvent.pageX),
      onPanResponderRelease: () => callbackRefs.current.handleGestureEnd(),
      onPanResponderTerminate: () => callbackRefs.current.handleGestureEnd(),
    })
  ).current;

  const sunRays = Array.from({ length: 8 }, (_, i) => i * 45);

  return (
    <LinearGradient
      colors={["#050d1f", "#0f1f3d", "#1a3060", "#b85530", "#e8904a"]}
      locations={[0, 0.2, 0.45, 0.78, 1]}
      style={styles.container}
      {...panResponder.panHandlers}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Stars */}
      {Array.from({ length: 25 }, (_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.star,
            {
              top: `${Math.random() * 40}%`,
              left: `${Math.random() * 100}%`,
              opacity: glowAnim.interpolate({
                inputRange: [0, 1], outputRange: [0.2, 0.9],
              }),
            },
          ]}
        />
      ))}

      {/* Sun */}
      <Animated.View style={[
        styles.sunContainer,
        { opacity: sunOpacity, transform: [{ scale: sunScale }] },
      ]}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx={60} cy={60} r={28} fill="#FFD060" />
          {sunRays.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <Line
                key={deg}
                x1={60 + 36 * Math.cos(rad)} y1={60 + 36 * Math.sin(rad)}
                x2={60 + 48 * Math.cos(rad)} y2={60 + 48 * Math.sin(rad)}
                stroke="#FFD060" strokeWidth={4} strokeLinecap="round"
              />
            );
          })}
        </Svg>
      </Animated.View>

      {/* Progress track */}
      <View style={styles.progressTrack}>
        <Animated.View style={[
          styles.progressFill,
          {
            width: progressAnim.interpolate({
              inputRange: [0, 1], outputRange: ["0%", "100%"],
            }),
          },
        ]} />
      </View>

      {/* Hand indicator */}
      {phase !== "idle" && (
        <Animated.View style={[styles.hand, { transform: [{ translateX: handX }] }]}>
          <Text style={{ fontSize: 40 }}>🤚</Text>
        </Animated.View>
      )}

      {/* Brand & Instructions */}
      <View style={styles.bottom}>
        <Text style={styles.brand}>☀  SUNGARD</Text>
        <Text style={styles.subtitle}>
          {phase === "idle"
            ? "손으로 태양을 가리며 스와이프 →"
            : phase === "success"
            ? "✓ 선크림 타이머 시작!"
            : `${Math.round(progressPct * 100)}% — 조금 더!`}
        </Text>
        {phase === "idle" && (
          <>
            <Text style={styles.hint}>화면을 왼쪽에서 오른쪽으로 쓸어주세요</Text>
            <TouchableOpacity onPress={onEnter} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>시작하기 →</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: "center", alignItems: "center",
  },
  star: {
    position: "absolute",
    width: 3, height: 3,
    borderRadius: 1.5,
    backgroundColor: "#ffffff",
  },
  sunContainer: {
    position: "absolute",
    top: H * 0.2,
    shadowColor: "#FFD060",
    shadowRadius: 24,
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  progressTrack: {
    position: "absolute",
    bottom: H * 0.27,
    left: W * 0.1,
    right: W * 0.1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFD060",
    borderRadius: 2,
    shadowColor: "#FFD060",
    shadowRadius: 6,
    shadowOpacity: 0.9,
    elevation: 4,
  },
  hand: {
    position: "absolute",
    top: H * 0.47,
  },
  bottom: {
    position: "absolute",
    bottom: H * 0.1,
    alignItems: "center",
  },
  brand: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFD060",
    letterSpacing: 6,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  hint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  skipBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: "#FFD060",
    borderRadius: 24,
    marginTop: 4,
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f1923",
  },
});
