// skintype.ts — 피부 타입 결정 트리 & 무기/유기자차 추천 로직

export type SkinTypeAnswer = string;

export interface QuizQuestion {
  id: string;
  question: string;
  subtext?: string;
  options: { id: string; label: string; emoji: string; mineral: number; chemical: number }[];
}

export type SunscreenType = "mineral" | "chemical" | "hybrid";

export interface SkinTypeResult {
  type: SunscreenType;
  title: string;
  description: string;
  pros: string[];
  ingredients: string[];
  caution: string;
}

// ── 설문 문항 ─────────────────────────────────────────────────────────────────
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "skinType",
    question: "평소 피부 타입은 어떤가요?",
    subtext: "세안 후 아무것도 바르지 않았을 때 기준",
    options: [
      { id: "dry",       label: "건성 / 극건성",  emoji: "🌵", mineral: 1,  chemical: 0 },
      { id: "oily",      label: "지성",           emoji: "💧", mineral: 0,  chemical: 2 },
      { id: "combo",     label: "복합성",          emoji: "⚖️", mineral: 0,  chemical: 1 },
      { id: "sensitive", label: "민감성",          emoji: "🌸", mineral: 3,  chemical: 0 },
      { id: "normal",    label: "정상",            emoji: "✨", mineral: 0,  chemical: 0 },
    ],
  },
  {
    id: "trouble",
    question: "피부 트러블이 있나요?",
    subtext: "해당하는 항목을 선택해주세요",
    options: [
      { id: "acne",    label: "여드름 / 모공 트러블",   emoji: "😤", mineral: 1,  chemical: 1 },
      { id: "eczema",  label: "아토피 / 피부염",        emoji: "🔴", mineral: 3,  chemical: -1 },
      { id: "rosacea", label: "로사세아 / 홍조",        emoji: "🫧", mineral: 3,  chemical: -2 },
      { id: "none",    label: "없음",                  emoji: "😊", mineral: 0,  chemical: 0 },
    ],
  },
  {
    id: "special",
    question: "해당 사항이 있나요?",
    options: [
      { id: "child",     label: "어린이 (12세 미만)",   emoji: "👶", mineral: 4,  chemical: -2 },
      { id: "pregnant",  label: "임산부 / 수유 중",     emoji: "🤰", mineral: 4,  chemical: -2 },
      { id: "none",      label: "해당 없음",            emoji: "🙋", mineral: 0,  chemical: 0 },
    ],
  },
  {
    id: "activity",
    question: "주로 어디서 선크림을 사용하나요?",
    options: [
      { id: "indoor",    label: "실내 위주",             emoji: "🏠", mineral: 0,  chemical: 1 },
      { id: "outdoor",   label: "가벼운 야외 활동",      emoji: "🚶", mineral: 1,  chemical: 0 },
      { id: "sport",     label: "격한 야외 / 수영 / 레저", emoji: "🏊", mineral: 2, chemical: 0 },
    ],
  },
  {
    id: "texture",
    question: "선크림 바른 후 느낌 선호는?",
    subtext: "실제 사용 경험 기준",
    options: [
      { id: "light",  label: "가볍고 산뜻한 느낌",       emoji: "🍃", mineral: 0,  chemical: 2 },
      { id: "safe",   label: "백탁 있어도 안심되는 게 좋다", emoji: "🛡️", mineral: 2, chemical: 0 },
      { id: "either", label: "상관없음",                  emoji: "😌", mineral: 0,  chemical: 0 },
    ],
  },
];

// ── 추천 결과 정의 ─────────────────────────────────────────────────────────────
export const RESULTS: Record<SunscreenType, SkinTypeResult> = {
  mineral: {
    type: "mineral",
    title: "무기자차",
    description:
      "산화아연(Zinc Oxide), 이산화티탄(Titanium Dioxide) 성분이 피부 위에서 자외선을 물리적으로 반사·산란합니다. 자극이 적어 민감성 피부, 어린이, 임산부에게 적합합니다.",
    pros: ["저자극 · 안전성 높음", "도포 즉시 효과 발휘", "넓은 파장 차단 (UVA+UVB)", "호르몬 교란 성분 없음"],
    ingredients: ["Zinc Oxide (산화아연)", "Titanium Dioxide (이산화티탄)"],
    caution: "백탁 현상이 생길 수 있으며, 땀에 약해 자주 덧바르는 것이 중요합니다.",
  },
  chemical: {
    type: "chemical",
    title: "유기자차",
    description:
      "아보벤존(Avobenzone), 옥시벤존(Oxybenzone) 등 유기 화합물이 자외선을 흡수해 열에너지로 전환합니다. 가볍고 산뜻한 사용감으로 지성·복합성 피부에 잘 맞습니다.",
    pros: ["가볍고 얇은 사용감", "백탁 없음", "일상 메이크업 베이스로 적합", "다양한 제형 선택지"],
    ingredients: ["Avobenzone (아보벤존)", "Octinoxate (옥티녹세이트)", "Octocrylene (옥토크릴렌)"],
    caution: "도포 후 15~30분 후 효과가 발휘됩니다. 일부 성분이 민감성 피부를 자극할 수 있습니다.",
  },
  hybrid: {
    type: "hybrid",
    title: "혼합형 (하이브리드)",
    description:
      "무기자차와 유기자차 성분을 모두 포함한 하이브리드 제품이 적합합니다. 광범위한 UV 차단력과 산뜻한 사용감을 동시에 만족시킵니다.",
    pros: ["넓은 파장 차단", "비교적 가벼운 사용감", "범용적으로 활용 가능"],
    ingredients: ["Zinc Oxide + Avobenzone 혼합", "Tinosorb M / Tinosorb S"],
    caution: "제품마다 성분 비율이 다르므로 민감성이 있다면 성분표를 꼭 확인하세요.",
  },
};

// ── 점수 기반 추천 계산 ────────────────────────────────────────────────────────
export function calcRecommendation(
  answers: Record<string, string>
): SkinTypeResult {
  let mineralScore = 0;
  let chemicalScore = 0;

  for (const question of QUIZ_QUESTIONS) {
    const answerId = answers[question.id];
    const option = question.options.find((o) => o.id === answerId);
    if (option) {
      mineralScore += option.mineral;
      chemicalScore += option.chemical;
    }
  }

  if (mineralScore >= 4) return RESULTS.mineral;
  if (chemicalScore >= 4) return RESULTS.chemical;
  if (mineralScore > chemicalScore + 1) return RESULTS.mineral;
  if (chemicalScore > mineralScore + 1) return RESULTS.chemical;
  return RESULTS.hybrid;
}
