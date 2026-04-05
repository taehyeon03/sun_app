// HomeScreen.tsx — 원형 아크 타이머 + 알림 + 히스토리
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Modal,
} from "react-native";
import Svg, { Circle, Path, Ellipse, Line } from "react-native-svg";
import FaceApplyScreen from "./FaceApplyScreen";
import { SunscreenConfig } from "./SetupScreen";
import { SkinTypeResult } from "./skintype";
import {
  formatTime, formatDuration,
  REAPPLY_RULES, getAmountDescription,
} from "./sunscreen";
import {
  requestNotificationPermission,
  scheduleReapplyNotification,
  cancelAllNotifications,
} from "./notifications";

interface Props {
  config: SunscreenConfig;
  skinResult?: SkinTypeResult;
  onReset: () => void;
}

// ── 원형 아크 컴포넌트 ────────────────────────────────────────────────────────
function CircularTimer({ remainMins, totalMins, color }: {
  remainMins: number;
  totalMins: number;
  color: string;
}) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = 108;
  const sw = 14;
  const bgStroke = "rgba(255,255,255,0.08)";
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const progress = totalMins > 0
    ? Math.max(0, Math.min(1, remainMins / totalMins))
    : 0;

  const bgCircle = (
    <Circle cx={cx} cy={cy} r={r} fill="none" stroke={bgStroke} strokeWidth={sw} />
  );

  if (progress <= 0) {
    return <Svg width={size} height={size}>{bgCircle}</Svg>;
  }

  // progress >= ~1: 아크 커맨드로 완전한 원을 못 그리므로 Circle로 처리
  if (progress >= 0.999) {
    return (
      <Svg width={size} height={size}>
        {bgCircle}
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw} />
      </Svg>
    );
  }

  const angle = progress * 360;
  const endAngle = -90 + angle;

  const x1 = cx + r * Math.cos(toRad(-90));
  const y1 = cy + r * Math.sin(toRad(-90));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = angle > 180 ? 1 : 0;

  const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;

  return (
    <Svg width={size} height={size}>
      {bgCircle}
      <Path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────────────────────────
export default function HomeScreen({ config, skinResult, onReset }: Props) {
  const [now, setNow] = useState(new Date());
  const [appliedAt, setAppliedAt] = useState(config.appliedAt);
  const [history, setHistory] = useState<Date[]>([config.appliedAt]);
  const [notifGranted, setNotifGranted] = useState(false);
  const [showFaceApply, setShowFaceApply] = useState(false);

  const rule = REAPPLY_RULES[config.productType][config.spfLevel];
  const amountDesc = getAmountDescription(config.productType, config.amount);

  // 1초 단위 갱신
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  // 앱 진입 시 알림 권한 요청 + 초기 알림 스케줄
  useEffect(() => {
    let active = true;
    requestNotificationPermission().then((granted) => {
      if (!active) return;
      setNotifGranted(granted);
      if (granted) {
        scheduleReapplyNotification(config.reapplyMins, rule.label, amountDesc);
      }
    });
    return () => {
      active = false;
      cancelAllNotifications();
    };
  }, []);

  const elapsedMins = Math.floor((now.getTime() - appliedAt.getTime()) / 60000);
  const remainMins = Math.max(0, config.reapplyMins - elapsedMins);
  const nextApplyTime = new Date(appliedAt.getTime() + config.reapplyMins * 60000);

  const overdue = remainMins === 0;
  const urgent = remainMins > 0 && remainMins <= 20;
  const statusColor = overdue ? "#ef4444" : urgent ? "#f59e0b" : "#FFD060";

  const statusText = overdue
    ? "⚠ 지금 재도포하세요!"
    : urgent
    ? "⏰ 재도포 임박"
    : "✓ 보호 중";

  const handleReapply = useCallback(async () => {
    const newApplied = new Date();
    setAppliedAt(newApplied);
    setHistory((prev) => [newApplied, ...prev.slice(0, 4)]);
    if (notifGranted) {
      await scheduleReapplyNotification(config.reapplyMins, rule.label, amountDesc);
    }
  }, [notifGranted, config.reapplyMins, rule.label, amountDesc]);

  const productLabel = { cream: "크림", stick: "스틱", spray: "스프레이" }[config.productType];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />

      {/* 얼굴 도포 모달 */}
      <Modal visible={showFaceApply} animationType="slide" onRequestClose={() => setShowFaceApply(false)}>
        <FaceApplyScreen onClose={() => setShowFaceApply(false)} />
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>

        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>☀ SUNGARD</Text>
            <Text style={styles.date}>{now.toLocaleDateString("ko-KR")}</Text>
          </View>
          <TouchableOpacity onPress={onReset} style={styles.settingsBtn}>
            <Text style={styles.settingsBtnText}>재설정</Text>
          </TouchableOpacity>
        </View>

        {/* 논문 기반 배지 */}
        <View style={styles.paperBadge}>
          <Text style={styles.paperBadgeText}>📄 논문 기반 알고리즘 적용</Text>
          <Text style={styles.paperBadgeSub}>Diffey(2001) · FDA(2011) · WHO UV Guidelines</Text>
        </View>

        {/* 원형 아크 타이머 */}
        <View style={styles.arcWrapper}>
          <CircularTimer
            remainMins={remainMins}
            totalMins={config.reapplyMins}
            color={statusColor}
          />
          <View style={styles.arcOverlay}>
            <Text style={[styles.arcLabel, { color: statusColor }]}>남은 시간</Text>
            <Text style={[styles.arcValue, { color: statusColor }]}>
              {formatDuration(remainMins)}
            </Text>
            <Text style={styles.arcStatus}>{statusText}</Text>
          </View>
        </View>

        {/* 정보 카드 */}
        <View style={styles.infoCard}>
          <InfoRow label="도포 시각" value={formatTime(appliedAt)} />
          <Divider />
          <InfoRow label="다음 도포" value={formatTime(nextApplyTime)} />
          <Divider />
          <InfoRow label="권장 도포량" value={`${rule.amount} mg/cm²`} />
          <Divider />
          <InfoRow label="제품 형태" value={productLabel} />
          <Divider />
          <InfoRow label="SPF" value={rule.label} />
        </View>

        {/* 도포 기록 */}
        {history.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>도포 기록</Text>
            {history.map((t, i) => (
              <View key={i} style={styles.historyRow}>
                <View style={[styles.historyDot, i === 0 && styles.historyDotActive]} />
                <Text style={styles.historyTime}>{formatTime(t)}</Text>
                <Text style={styles.historyBadge}>
                  {i === 0 ? "최근" : `${i}회 전`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 피부 타입 추천 배지 */}
        {skinResult && (
          <View style={styles.skinBadge}>
            <Text style={styles.skinBadgeText}>
              피부 분석: <Text style={styles.skinBadgeHighlight}>{skinResult.title} 사용 중</Text>
            </Text>
          </View>
        )}

        {/* 500원 동전 도포량 가이드 */}
        <AmountGuide productType={config.productType} amount={rule.amount} />

        {/* 얼굴 도포 체크 버튼 */}
        <TouchableOpacity onPress={() => setShowFaceApply(true)} style={styles.faceBtn} activeOpacity={0.85}>
          <Text style={styles.faceBtnEmoji}>👤</Text>
          <View>
            <Text style={styles.faceBtnTitle}>얼굴 도포 체크</Text>
            <Text style={styles.faceBtnSub}>8개 구역을 손가락으로 직접 확인</Text>
          </View>
          <Text style={styles.faceBtnArrow}>→</Text>
        </TouchableOpacity>

        {/* 재도포 버튼 */}
        <TouchableOpacity onPress={handleReapply} style={styles.reapplyBtn} activeOpacity={0.85}>
          <Text style={styles.reapplyBtnText}>☀ 지금 발랐어요</Text>
        </TouchableOpacity>

        {!notifGranted && (
          <Text style={styles.notifHint}>알림 권한을 허용하면 재도포 시간을 알려드려요</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 500원 동전 기준 도포량 시각화 ─────────────────────────────────────────────
function AmountGuide({ productType, amount }: { productType: string; amount: number }) {
  const desc: Record<string, string> = {
    cream:  "얼굴 전체 기준 500원 동전 크기",
    stick:  "얼굴 전체 기준 2~3회 꼼꼼히",
    spray:  "얼굴 기준 3초 이상 분사 후 펴바르기",
  };
  return (
    <View style={styles.amountCard}>
      <Text style={styles.amountTitle}>권장 도포량 가이드</Text>
      <View style={styles.amountRow}>
        {/* 500원 동전 */}
        <View style={styles.coinWrapper}>
          <Svg width={56} height={56} viewBox="0 0 56 56">
            <Circle cx={28} cy={28} r={26} fill="#c5a028" />
            <Circle cx={28} cy={28} r={22} fill="#dab830" />
            <Line x1={18} y1={28} x2={38} y2={28} stroke="#c5a028" strokeWidth={1.5} />
            <Line x1={28} y1={18} x2={28} y2={38} stroke="#c5a028" strokeWidth={1.5} />
          </Svg>
          <Text style={styles.coinLabel}>500원</Text>
        </View>
        <Text style={styles.amountEquals}>≈</Text>
        {/* 도포량 원 */}
        <View style={styles.dollupWrapper}>
          <Svg width={56} height={56} viewBox="0 0 56 56">
            <Ellipse cx={28} cy={30} rx={22} ry={18} fill="#FFD060" opacity={0.9} />
            <Ellipse cx={28} cy={26} rx={14} ry={10} fill="#ffe590" opacity={0.7} />
          </Svg>
          <Text style={styles.dollupLabel}>{amount} mg/cm²</Text>
        </View>
      </View>
      <Text style={styles.amountDesc}>{desc[productType] ?? desc.cream}</Text>
      <Text style={styles.amountNote}>※ 2 mg/cm² 기준 미달 시 실효 SPF 대폭 감소 (Heerfordt et al., 2018)</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1923" },
  container: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  brand: { fontSize: 26, fontWeight: "900", color: "#FFD060" },
  date: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  settingsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
  },
  settingsBtnText: { fontSize: 13, color: "rgba(255,255,255,0.6)" },

  // 아크 타이머
  arcWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  arcOverlay: {
    position: "absolute",
    alignItems: "center",
  },
  arcLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  arcValue: { fontSize: 42, fontWeight: "900", marginVertical: 4 },
  arcStatus: { fontSize: 13, color: "rgba(255,255,255,0.55)" },

  // 정보 카드
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 13,
  },
  infoLabel: { fontSize: 13, color: "rgba(255,255,255,0.45)" },
  infoValue: { fontSize: 13, color: "#fff", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)" },

  // 히스토리
  historyCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  historyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginRight: 12,
  },
  historyDotActive: {
    backgroundColor: "#FFD060",
  },
  historyTime: { fontSize: 14, color: "rgba(255,255,255,0.8)", flex: 1 },
  historyBadge: { fontSize: 12, color: "rgba(255,255,255,0.35)" },

  // 재도포 버튼
  reapplyBtn: {
    backgroundColor: "#FFD060",
    borderRadius: 10,
    padding: 17,
    alignItems: "center",
    marginBottom: 12,
  },
  reapplyBtnText: { fontSize: 16, fontWeight: "700", color: "#0f1923" },
  paperBadge: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  paperBadgeText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.6)", marginBottom: 2 },
  paperBadgeSub: { fontSize: 10, color: "rgba(255,255,255,0.3)" },

  amountCard: {
    backgroundColor: "rgba(255,208,96,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,208,96,0.15)",
    padding: 16,
    marginBottom: 12,
  },
  amountTitle: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: 12 },
  amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 },
  coinWrapper: { alignItems: "center", gap: 4 },
  coinLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
  amountEquals: { fontSize: 22, color: "rgba(255,255,255,0.3)", marginHorizontal: 4 },
  dollupWrapper: { alignItems: "center", gap: 4 },
  dollupLabel: { fontSize: 11, color: "#FFD060", fontWeight: "600" },
  amountDesc: { fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 6 },
  amountNote: { fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 14 },

  faceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  faceBtnEmoji: { fontSize: 24 },
  faceBtnTitle: { fontSize: 14, fontWeight: "700", color: "#fff", marginBottom: 2 },
  faceBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  faceBtnArrow: { marginLeft: "auto", fontSize: 16, color: "rgba(255,255,255,0.3)" },

  skinBadge: {
    backgroundColor: "rgba(96,196,160,0.1)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(96,196,160,0.2)",
  },
  skinBadgeText: { fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center" },
  skinBadgeHighlight: { color: "#60c4a0", fontWeight: "700" },
  notifHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    marginTop: 4,
  },
});
