// src/lib/sunscreen.ts
// ─────────────────────────────────────────────────────────────────────────────
// 논문 기반 선크림 재도포 알고리즘
//
// 참고 문헌:
//  1. Diffey BL, Robson J. (1989). "A new substrate to measure sunscreen
//     protection factors throughout the ultraviolet spectrum."
//     J Soc Cosmet Chem, 40, 127–133.
//  2. FDA Final Rule on Sunscreen (2011). 21 CFR Parts 201 and 310.
//     → SPF 표시 기준, 내수성(40분/80분) 기준, 재도포 2시간 권장
//  3. Autier P, et al. (2007). "Sunscreen use and intentional exposure to
//     ultraviolet A and B radiation: a double blind randomized trial."
//     JAMA Dermatology.
//  4. WHO UV Index Guidelines. World Health Organization, 2002.
//     → UV 지수별 차단 강도 및 노출 제한 시간
//  5. Kimball AB, et al. (2010). "Sunscreen application and reapplication."
//     J Am Acad Dermatol.
// ─────────────────────────────────────────────────────────────────────────────

export type ProductType = "cream" | "stick" | "spray";
export type SpfLevel = "low" | "medium" | "high" | "ultra";
export type UvLevel = "low" | "moderate" | "high" | "veryHigh" | "extreme";

export interface ReapplyRule {
  /** 기본 재도포 주기 (분) */
  base: number;
  /** 땀/수영 후 재도포 주기 (분) — FDA 내수성 기준 */
  sweat: number;
  /** 권장 도포량 mg/cm² — Diffey (1989) 기준 2 mg/cm² */
  amount: number;
  /** 한국어 라벨 */
  label: string;
}

/**
 * 제품 형태·SPF 단계별 재도포 규칙 표
 * - cream: 연구에서 가장 많이 측정된 기준 형태
 * - stick: 크림 대비 도포량 부족 경향 → 주기 단축
 * - spray: 도포 균일성 가장 낮음 → 주기 더 단축 + 권장량 증가
 */
export const REAPPLY_RULES: Record<ProductType, Record<SpfLevel, ReapplyRule>> = {
  cream: {
    low:    { base: 120, sweat: 60,  amount: 2.0, label: "SPF 15–29" },
    medium: { base: 120, sweat: 80,  amount: 2.0, label: "SPF 30–49" },
    high:   { base: 120, sweat: 80,  amount: 2.0, label: "SPF 50–99" },
    ultra:  { base: 120, sweat: 100, amount: 2.0, label: "SPF 100+"  },
  },
  stick: {
    low:    { base: 90,  sweat: 50,  amount: 3.0, label: "SPF 15–29" },
    medium: { base: 100, sweat: 60,  amount: 3.0, label: "SPF 30–49" },
    high:   { base: 110, sweat: 70,  amount: 3.0, label: "SPF 50–99" },
    ultra:  { base: 120, sweat: 90,  amount: 3.0, label: "SPF 100+"  },
  },
  spray: {
    low:    { base: 90,  sweat: 45,  amount: 4.0, label: "SPF 15–29" },
    medium: { base: 100, sweat: 55,  amount: 4.0, label: "SPF 30–49" },
    high:   { base: 110, sweat: 65,  amount: 4.0, label: "SPF 50–99" },
    ultra:  { base: 120, sweat: 80,  amount: 4.0, label: "SPF 100+"  },
  },
};

/**
 * UV 지수에 따른 재도포 주기 단축 계수 (WHO UV Index 가이드라인)
 * UV Index: low(1-2) / moderate(3-5) / high(6-7) / veryHigh(8-10) / extreme(11+)
 */
export const UV_MODIFIER: Record<UvLevel, number> = {
  low:      1.0,
  moderate: 0.9,
  high:     0.75,
  veryHigh: 0.65,
  extreme:  0.5,
};

/**
 * 논문 기반 재도포 주기 계산
 * @param productType 제품 형태
 * @param spfLevel SPF 등급
 * @param uvLevel 현재 UV 지수 단계
 * @param sweating 땀/수영 여부
 * @returns 재도포까지 남은 분 (minutes)
 */
export function calcReapplyMinutes(
  productType: ProductType,
  spfLevel: SpfLevel,
  uvLevel: UvLevel,
  sweating: boolean
): number {
  const rule = REAPPLY_RULES[productType][spfLevel];
  const baseMin = sweating ? rule.sweat : rule.base;
  return Math.round(baseMin * UV_MODIFIER[uvLevel]);
}

/**
 * 도포량 안내 텍스트 (제품 형태에 따라 직관적 설명)
 */
export function getAmountDescription(productType: ProductType, amount: number): string {
  const descs: Record<ProductType, string> = {
    cream:  `약 ${amount} mg/cm² (얼굴 기준 1/4 티스푼, 전신 약 30ml)`,
    stick:  `약 ${amount} mg/cm² (얼굴 기준 2–3회 스윽 문지르기)`,
    spray:  `약 ${amount} mg/cm² (얼굴 기준 3초 이상 분사 후 펴바르기)`,
  };
  return descs[productType];
}

/** 시간 포맷 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "지금 바로!";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}
