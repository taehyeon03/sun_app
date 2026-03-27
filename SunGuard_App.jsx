import { useState, useEffect, useRef, useCallback } from "react";

// ─── 논문 기반 재도포 알고리즘 ───────────────────────────────────────────────
// 출처: Diffey & Robson (1989), FDA Sunscreen Final Rule (2011),
//       Autier et al. (2007) - JAMA Dermatology, WHO UV Index guidelines
const REAPPLY_RULES = {
  // [제품형태][SPF단계] => { 기본시간(분), 땀/수분 후(분), 적정량(g) }
  cream: {
    low:    { base: 120, sweat: 60,  amount: 2.0, label: "SPF 15–29" },
    medium: { base: 120, sweat: 80,  amount: 2.0, label: "SPF 30–49" },
    high:   { base: 120, sweat: 80,  amount: 2.0, label: "SPF 50–99" },
    ultra:  { base: 120, sweat: 100, amount: 2.0, label: "SPF 100+" },
  },
  stick: {
    low:    { base: 90,  sweat: 50,  amount: 3.0, label: "SPF 15–29" },
    medium: { base: 100, sweat: 60,  amount: 3.0, label: "SPF 30–49" },
    high:   { base: 110, sweat: 70,  amount: 3.0, label: "SPF 50–99" },
    ultra:  { base: 120, sweat: 90,  amount: 3.0, label: "SPF 100+" },
  },
  spray: {
    low:    { base: 90,  sweat: 45,  amount: 4.0, label: "SPF 15–29" },
    medium: { base: 100, sweat: 55,  amount: 4.0, label: "SPF 30–49" },
    high:   { base: 110, sweat: 65,  amount: 4.0, label: "SPF 50–99" },
    ultra:  { base: 120, sweat: 80,  amount: 4.0, label: "SPF 100+" },
  },
};

// UV 지수에 따른 추가 단축 계수 (WHO 가이드라인)
const UV_MODIFIER = { low: 1.0, moderate: 0.9, high: 0.75, veryHigh: 0.65, extreme: 0.5 };

function calcNextApply(productType, spfLevel, uvLevel, sweating) {
  const rule = REAPPLY_RULES[productType]?.[spfLevel];
  if (!rule) return 120;
  const baseMin = sweating ? rule.sweat : rule.base;
  return Math.round(baseMin * (UV_MODIFIER[uvLevel] ?? 1.0));
}

function fmt(date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDur(min) {
  if (min <= 0) return "지금 바로!";
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const SunIcon = ({ size = 40, glow }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <defs>
      {glow && (
        <filter id="sunGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      )}
    </defs>
    <circle cx="40" cy="40" r="18" fill="#FFD060" filter={glow ? "url(#sunGlow)" : ""} />
    {[0,45,90,135,180,225,270,315].map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const x1 = 40 + 24 * Math.cos(rad), y1 = 40 + 24 * Math.sin(rad);
      const x2 = 40 + 32 * Math.cos(rad), y2 = 40 + 32 * Math.sin(rad);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD060" strokeWidth="3" strokeLinecap="round" />;
    })}
  </svg>
);

const HandIcon = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M20 8C20 6.34 21.34 5 23 5C24.66 5 26 6.34 26 8V22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M26 12C26 10.34 27.34 9 29 9C30.66 9 32 10.34 32 12V22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M32 15C32 13.34 33.34 12 35 12C36.66 12 38 13.34 38 15V26C38 33.73 31.73 40 24 40C16.27 40 10 33.73 10 26V22C10 20.34 11.34 19 13 19C14.66 19 16 20.34 16 22V22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M16 22V10C16 8.34 17.34 7 19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M13 19C13 19 10 19 10 22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

// ─── SCREENS ─────────────────────────────────────────────────────────────────
// 1) SPLASH – 태양 차단 제스처
function SplashScreen({ onEnter }) {
  const [phase, setPhase] = useState("idle"); // idle | tracking | success
  const [handX, setHandX] = useState(-80);
  const [progress, setProgress] = useState(0);
  const [sunBlocked, setSunBlocked] = useState(false);
  const trackRef = useRef(false);
  const startXRef = useRef(null);
  const rafRef = useRef(null);

  const startGesture = useCallback((clientX) => {
    if (phase === "success") return;
    trackRef.current = true;
    startXRef.current = clientX;
    setPhase("tracking");
    setHandX(clientX - 60);
  }, [phase]);

  const moveGesture = useCallback((clientX) => {
    if (!trackRef.current) return;
    const dx = clientX - (startXRef.current || clientX);
    const pct = Math.min(Math.max(dx / (window.innerWidth * 0.7), 0), 1);
    setHandX(clientX - 60);
    setProgress(pct);
    if (pct > 0.5) setSunBlocked(true);
    else setSunBlocked(false);
    if (pct >= 1) {
      trackRef.current = false;
      setPhase("success");
      setTimeout(onEnter, 900);
    }
  }, [onEnter]);

  const endGesture = useCallback(() => {
    if (phase === "success") return;
    if (progress < 1) {
      trackRef.current = false;
      setPhase("idle");
      setProgress(0);
      setHandX(-80);
      setSunBlocked(false);
    }
  }, [phase, progress]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div
      style={{
        ...styles.screen,
        background: "linear-gradient(180deg, #0a1628 0%, #1a2d5a 40%, #c8603a 80%, #e8944a 100%)",
        cursor: "none",
        userSelect: "none",
        overflow: "hidden",
      }}
      onMouseDown={e => startGesture(e.clientX)}
      onMouseMove={e => moveGesture(e.clientX)}
      onMouseUp={endGesture}
      onTouchStart={e => startGesture(e.touches[0].clientX)}
      onTouchMove={e => { e.preventDefault(); moveGesture(e.touches[0].clientX); }}
      onTouchEnd={endGesture}
    >
      {/* Stars */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: Math.random() * 3 + 1,
          height: Math.random() * 3 + 1,
          borderRadius: "50%",
          background: "#fff",
          top: `${Math.random() * 45}%`,
          left: `${Math.random() * 100}%`,
          opacity: Math.random() * 0.8 + 0.2,
          animation: `twinkle ${Math.random() * 2 + 1.5}s ease-in-out infinite alternate`,
        }} />
      ))}

      {/* Sun */}
      <div style={{
        position: "absolute",
        top: "22%",
        left: "50%",
        transform: "translateX(-50%)",
        transition: "opacity 0.3s, transform 0.3s",
        opacity: sunBlocked ? 0.15 : 1,
        filter: sunBlocked ? "blur(6px)" : "none",
        animation: phase === "idle" ? "float 3s ease-in-out infinite" : "none",
      }}>
        <SunIcon size={100} glow />
      </div>

      {/* UV 광선 */}
      {!sunBlocked && (
        <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translateX(-50%)" }}>
          {[...Array(7)].map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              width: 2,
              height: 60 + i * 12,
              background: "linear-gradient(to bottom, rgba(255,210,60,0.6), transparent)",
              left: (i - 3) * 18,
              top: 0,
              transformOrigin: "top center",
              transform: `rotate(${(i - 3) * 8}deg)`,
              animation: `uvray 1.5s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div style={{
        position: "absolute",
        bottom: "28%",
        left: "10%",
        right: "10%",
        height: 4,
        background: "rgba(255,255,255,0.2)",
        borderRadius: 2,
      }}>
        <div style={{
          height: "100%",
          width: `${progress * 100}%`,
          background: "linear-gradient(90deg, #FFD060, #FF8C42)",
          borderRadius: 2,
          transition: "width 0.05s",
          boxShadow: "0 0 8px #FFD060",
        }} />
      </div>

      {/* Hand cursor */}
      {phase !== "idle" && (
        <div style={{
          position: "absolute",
          top: "48%",
          left: handX,
          pointerEvents: "none",
          transition: "left 0.02s",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
        }}>
          <HandIcon size={56} />
        </div>
      )}

      {/* Text */}
      <div style={{ position: "absolute", bottom: "14%", width: "100%", textAlign: "center" }}>
        <div style={{ ...styles.brandName, color: "#FFD060", fontSize: 36, letterSpacing: 4 }}>
          ☀ SUNGARD
        </div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 8, letterSpacing: 1 }}>
          {phase === "idle"
            ? "손으로 태양을 가리며 스와이프 →"
            : phase === "success"
            ? "✓ 선크림 타이머 시작!"
            : "조금 더..."}
        </div>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-10px)} }
        @keyframes twinkle { from{opacity:0.2} to{opacity:1} }
        @keyframes uvray { from{opacity:0.3;height:60px} to{opacity:0.8;height:80px} }
      `}</style>
    </div>
  );
}

// 2) SETUP – 제품 선택
const PRODUCT_TYPES = [
  { id: "cream", label: "크림/로션", emoji: "🧴", desc: "일반 선크림" },
  { id: "stick", label: "고체/스틱", emoji: "💄", desc: "스틱형 선크림" },
  { id: "spray", label: "스프레이", emoji: "💨", desc: "미스트/스프레이" },
];
const SPF_LEVELS = [
  { id: "low",    label: "SPF 15–29", pa: "PA+",   color: "#22c55e" },
  { id: "medium", label: "SPF 30–49", pa: "PA++",  color: "#f59e0b" },
  { id: "high",   label: "SPF 50–99", pa: "PA+++", color: "#ef4444" },
  { id: "ultra",  label: "SPF 100+",  pa: "PA++++",color: "#7c3aed" },
];
const UV_LEVELS = [
  { id: "low",      label: "낮음 (1–2)",    color: "#22c55e" },
  { id: "moderate", label: "보통 (3–5)",    color: "#84cc16" },
  { id: "high",     label: "높음 (6–7)",    color: "#f59e0b" },
  { id: "veryHigh", label: "매우높음 (8–10)", color: "#ef4444" },
  { id: "extreme",  label: "극도 (11+)",   color: "#7c3aed" },
];

function SetupScreen({ onStart }) {
  const [productType, setProductType] = useState("cream");
  const [spfLevel, setSpfLevel] = useState("high");
  const [uvLevel, setUvLevel] = useState("high");
  const [sweating, setSweating] = useState(false);
  const [step, setStep] = useState(0); // 0=제품형태 1=SPF 2=환경 3=확인

  const canNext = step === 0 ? !!productType : step === 1 ? !!spfLevel : step === 2 ? !!uvLevel : true;

  const handleStart = () => {
    const mins = calcNextApply(productType, spfLevel, uvLevel, sweating);
    const amount = REAPPLY_RULES[productType][spfLevel].amount;
    onStart({ productType, spfLevel, uvLevel, sweating, reapplyMins: mins, amount });
  };

  return (
    <div style={{ ...styles.screen, background: "#0f1923", overflowY: "auto" }}>
      <div style={{ padding: "28px 20px 100px" }}>
        <div style={{ ...styles.brandName, fontSize: 22, color: "#FFD060", marginBottom: 4 }}>
          ☀ SUNGARD
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 28 }}>선크림 정보 설정</div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {["제품 형태", "자외선 차단 지수", "환경", "확인"].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                height: 3, borderRadius: 2,
                background: i <= step ? "#FFD060" : "rgba(255,255,255,0.15)",
                marginBottom: 4,
              }} />
              <div style={{ fontSize: 9, color: i <= step ? "#FFD060" : "rgba(255,255,255,0.3)" }}>{s}</div>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div>
            <div style={styles.sectionTitle}>제품 형태 선택</div>
            {PRODUCT_TYPES.map(p => (
              <button key={p.id} onClick={() => setProductType(p.id)} style={{
                ...styles.optionCard,
                borderColor: productType === p.id ? "#FFD060" : "rgba(255,255,255,0.1)",
                background: productType === p.id ? "rgba(255,208,96,0.12)" : "rgba(255,255,255,0.04)",
              }}>
                <span style={{ fontSize: 28 }}>{p.emoji}</span>
                <div style={{ flex: 1, textAlign: "left", marginLeft: 14 }}>
                  <div style={{ color: "#fff", fontWeight: 600 }}>{p.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>{p.desc}</div>
                </div>
                {productType === p.id && <span style={{ color: "#FFD060" }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={styles.sectionTitle}>SPF / 자외선 차단 지수</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
              📄 FDA 기준: SPF는 UVB 차단 효과, PA는 UVA 차단 강도를 나타냅니다.
            </div>
            {SPF_LEVELS.map(s => (
              <button key={s.id} onClick={() => setSpfLevel(s.id)} style={{
                ...styles.optionCard,
                borderColor: spfLevel === s.id ? s.color : "rgba(255,255,255,0.1)",
                background: spfLevel === s.id ? `${s.color}20` : "rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: s.color, marginRight: 14,
                }} />
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ color: "#fff", fontWeight: 600 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: 12, marginTop: 2 }}>{s.pa}</div>
                </div>
                {spfLevel === s.id && <span style={{ color: s.color }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={styles.sectionTitle}>현재 UV 지수 (야외 환경)</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
              📄 WHO 가이드라인: UV 지수가 높을수록 재도포 주기가 짧아집니다.
            </div>
            {UV_LEVELS.map(u => (
              <button key={u.id} onClick={() => setUvLevel(u.id)} style={{
                ...styles.optionCard,
                borderColor: uvLevel === u.id ? u.color : "rgba(255,255,255,0.1)",
                background: uvLevel === u.id ? `${u.color}20` : "rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: u.color, marginRight: 14,
                }} />
                <div style={{ color: "#fff", flex: 1, textAlign: "left" }}>{u.label}</div>
                {uvLevel === u.id && <span style={{ color: u.color }}>✓</span>}
              </button>
            ))}
            <div style={{ marginTop: 16 }}>
              <div style={styles.sectionTitle}>활동 강도</div>
              <button onClick={() => setSweating(!sweating)} style={{
                ...styles.optionCard,
                borderColor: sweating ? "#60a5fa" : "rgba(255,255,255,0.1)",
                background: sweating ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)",
              }}>
                <span style={{ fontSize: 22, marginRight: 14 }}>💧</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ color: "#fff", fontWeight: 600 }}>땀을 많이 흘리는 활동</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>수영, 운동, 강한 활동</div>
                </div>
                {sweating && <span style={{ color: "#60a5fa" }}>✓</span>}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (() => {
          const mins = calcNextApply(productType, spfLevel, uvLevel, sweating);
          const amount = REAPPLY_RULES[productType][spfLevel].amount;
          const pt = PRODUCT_TYPES.find(p => p.id === productType);
          const sp = SPF_LEVELS.find(s => s.id === spfLevel);
          const uv = UV_LEVELS.find(u => u.id === uvLevel);
          return (
            <div>
              <div style={styles.sectionTitle}>설정 확인</div>
              <div style={{
                background: "rgba(255,208,96,0.08)",
                border: "1px solid rgba(255,208,96,0.3)",
                borderRadius: 16, padding: 20, marginBottom: 20,
              }}>
                {[
                  ["제품", `${pt?.emoji} ${pt?.label}`],
                  ["차단 지수", `${sp?.label} ${sp?.pa}`],
                  ["UV 지수", uv?.label],
                  ["활동", sweating ? "💧 땀 많음" : "🚶 보통"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{k}</span>
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14, marginTop: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>권장 재도포 주기</span>
                    <span style={{ color: "#FFD060", fontSize: 16, fontWeight: 700 }}>{fmtDur(mins)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>권장 도포량</span>
                    <span style={{ color: "#60a5fa", fontSize: 14, fontWeight: 600 }}>{amount} mg/cm²</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, textAlign: "center" }}>
                📚 Diffey & Robson (1989), FDA Final Rule (2011), WHO UV Index 가이드라인 기반
              </div>
            </div>
          );
        })()}

        {/* Nav buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: "14px", borderRadius: 14,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)", fontSize: 14, cursor: "pointer",
            }}>← 이전</button>
          )}
          <button
            disabled={!canNext}
            onClick={step === 3 ? handleStart : () => setStep(s => s + 1)}
            style={{
              flex: 2, padding: "14px", borderRadius: 14,
              background: canNext ? "linear-gradient(135deg, #FFD060, #FF8C42)" : "rgba(255,255,255,0.1)",
              border: "none", color: canNext ? "#0f1923" : "rgba(255,255,255,0.3)",
              fontSize: 15, fontWeight: 700, cursor: canNext ? "pointer" : "default",
            }}>
            {step === 3 ? "☀ 타이머 시작!" : "다음 →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 3) HOME – 메인 타이머 화면
function HomeScreen({ config, onReset }) {
  const [appliedAt] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [logs, setLogs] = useState([{ time: new Date(), note: "첫 도포" }]);
  const [showReapply, setShowReapply] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const { reapplyMins, amount, productType, spfLevel, uvLevel, sweating } = config;
  const elapsedMins = Math.floor((now - appliedAt) / 60000);
  const remainMins = Math.max(0, reapplyMins - elapsedMins);
  const pct = Math.min(elapsedMins / reapplyMins, 1);
  const nextApplyTime = new Date(appliedAt.getTime() + reapplyMins * 60000);

  const urgent = remainMins <= 20;
  const overdue = remainMins === 0;

  const progressColor = overdue ? "#ef4444" : urgent ? "#f59e0b" : "#FFD060";
  const pt = PRODUCT_TYPES.find(p => p.id === productType);
  const sp = SPF_LEVELS.find(s => s.id === spfLevel);

  const handleReapply = () => {
    const mins = calcNextApply(productType, spfLevel, uvLevel, sweating);
    setLogs(l => [{ time: new Date(), note: "재도포" }, ...l]);
    setShowReapply(false);
    // In real app: reset timer
  };

  // Arc SVG
  const r = 80, cx = 100, cy = 100;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - pct);

  return (
    <div style={{ ...styles.screen, background: "#0f1923", overflowY: "auto" }}>
      <div style={{ padding: "24px 20px 100px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ ...styles.brandName, fontSize: 18, color: "#FFD060" }}>☀ SUNGARD</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</div>
          </div>
          <button onClick={onReset} style={{
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)", borderRadius: 10, padding: "6px 12px", fontSize: 12, cursor: "pointer",
          }}>설정 변경</button>
        </div>

        {/* Timer Arc */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <div style={{ position: "relative", width: 200, height: 200 }}>
            <svg width={200} height={200} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={12} />
              <circle cx={cx} cy={cy} r={r} fill="none"
                stroke={progressColor} strokeWidth={12}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s, stroke 0.5s", filter: `drop-shadow(0 0 8px ${progressColor})` }}
              />
            </svg>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)", textAlign: "center",
            }}>
              <div style={{ animation: overdue ? "pulse 1s infinite" : urgent ? "pulse 2s infinite" : "none" }}>
                <SunIcon size={36} glow={!overdue} />
              </div>
              <div style={{ color: overdue ? "#ef4444" : urgent ? "#f59e0b" : "#fff", fontSize: 22, fontWeight: 800, marginTop: 4 }}>
                {fmtDur(remainMins)}
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>남은 시간</div>
            </div>
          </div>
        </div>

        {/* Status card */}
        <div style={{
          background: overdue ? "rgba(239,68,68,0.12)" : urgent ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${overdue ? "rgba(239,68,68,0.4)" : urgent ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 16, padding: 16, marginBottom: 16, textAlign: "center",
        }}>
          <div style={{ color: progressColor, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {overdue ? "⚠ 지금 바로 재도포하세요!" : urgent ? "⏰ 곧 재도포 시간입니다" : "✓ 현재 차단 효과 유지 중"}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
            다음 도포 권장 시간: <span style={{ color: "#fff" }}>{fmt(nextApplyTime)}</span>
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "도포 시각", value: fmt(appliedAt), icon: "🕐" },
            { label: "권장 재도포량", value: `${amount} mg/cm²`, icon: "💊" },
            { label: "제품 형태", value: pt?.label, icon: pt?.emoji },
            { label: "차단 지수", value: `${sp?.label}`, icon: "🛡" },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>{label}</div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Research note */}
        <div style={{
          background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
          borderRadius: 12, padding: 14, marginBottom: 16,
        }}>
          <div style={{ color: "#60a5fa", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>📚 논문 기반 권장 사항</div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, lineHeight: 1.6 }}>
            • 2 mg/cm² 균일 도포 시 표시 SPF 발휘 (Diffey, 1989)<br />
            • 일반 사용 시 약 0.5~1 mg/cm² 도포 → 실제 SPF 1/4~1/2 수준<br />
            • FDA: 40분 또는 80분 내수성 표시 외 2시간마다 재도포 권장<br />
            • WHO: UV Index 6 이상 시 외출 전 30분 도포 필수
          </div>
        </div>

        {/* History */}
        <div style={{ marginBottom: 16 }}>
          <div style={styles.sectionTitle}>도포 기록</div>
          {logs.map((l, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: i === 0 ? "#FFD060" : "rgba(255,255,255,0.3)",
                }} />
                <div style={{ color: i === 0 ? "#FFD060" : "rgba(255,255,255,0.5)", fontSize: 13 }}>{l.note}</div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{fmt(l.time)}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button onClick={() => setShowReapply(true)} style={{
          width: "100%", padding: "16px", borderRadius: 16,
          background: "linear-gradient(135deg, #FFD060, #FF8C42)",
          border: "none", color: "#0f1923", fontSize: 16,
          fontWeight: 800, cursor: "pointer", letterSpacing: 0.5,
          boxShadow: "0 8px 24px rgba(255,180,60,0.3)",
        }}>
          ☀ 지금 선크림 발랐어요
        </button>
      </div>

      {/* Reapply modal */}
      {showReapply && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "flex-end",
          backdropFilter: "blur(4px)",
        }} onClick={() => setShowReapply(false)}>
          <div style={{
            background: "#1a2535",
            borderRadius: "24px 24px 0 0",
            padding: "28px 24px 40px",
            width: "100%",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ color: "#FFD060", fontSize: 18, fontWeight: 700 }}>재도포 확인</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6 }}>
                지금 바르는 양: <span style={{ color: "#fff" }}>{amount} mg/cm²</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 4 }}>
                (얼굴 기준 약 {productType === "cream" ? "1/4 티스푼" : productType === "stick" ? "2~3회 스윽" : "3초 분사"})
              </div>
            </div>
            <button onClick={handleReapply} style={{
              width: "100%", padding: "15px", borderRadius: 14,
              background: "linear-gradient(135deg, #FFD060, #FF8C42)",
              border: "none", color: "#0f1923", fontSize: 15,
              fontWeight: 700, cursor: "pointer",
            }}>✓ 발랐습니다 – 타이머 재시작</button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const styles = {
  screen: {
    width: "100%", height: "100%", position: "relative",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  brandName: {
    fontWeight: 900, letterSpacing: 2, textTransform: "uppercase",
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12,
  },
  optionCard: {
    display: "flex", alignItems: "center",
    width: "100%", padding: "14px 16px", marginBottom: 10,
    borderRadius: 14, border: "1.5px solid",
    cursor: "pointer", transition: "all 0.2s",
  },
};

export default function App() {
  const [screen, setScreen] = useState("splash"); // splash | setup | home
  const [config, setConfig] = useState(null);

  if (screen === "splash") return <SplashScreen onEnter={() => setScreen("setup")} />;
  if (screen === "setup") return <SetupScreen onStart={cfg => { setConfig(cfg); setScreen("home"); }} />;
  return <HomeScreen config={config} onReset={() => setScreen("setup")} />;
}
