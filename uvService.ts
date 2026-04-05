// uvService.ts — GPS 기반 실시간 UV 지수 조회
// OpenMeteo API 사용 (무료, API 키 불필요)

import * as Location from "expo-location";
import { UvLevel } from "./sunscreen";

export interface UvResult {
  uvIndex: number;
  uvLevel: UvLevel;
  label: string;
  description: string;
  city?: string;
}

/** UV 지수 숫자 → UvLevel 타입 변환 */
export function uvIndexToLevel(index: number): UvLevel {
  if (index <= 2)  return "low";
  if (index <= 5)  return "moderate";
  if (index <= 7)  return "high";
  if (index <= 10) return "veryHigh";
  return "extreme";
}

/** UV 지수에 대한 한국어 설명 */
export function uvLevelInfo(level: UvLevel): { label: string; description: string; color: string } {
  const map: Record<UvLevel, { label: string; description: string; color: string }> = {
    low:      { label: "낮음 (1–2)",     description: "자외선 위험 낮음. 일반적 활동 가능",      color: "#4ade80" },
    moderate: { label: "보통 (3–5)",     description: "중간 위험. 낮 시간대 그늘 이용 권장",     color: "#facc15" },
    high:     { label: "높음 (6–7)",     description: "높은 위험. 선크림 필수, 모자 착용 권장",  color: "#fb923c" },
    veryHigh: { label: "매우 높음 (8–10)", description: "매우 높은 위험. 10~16시 외출 자제",   color: "#f87171" },
    extreme:  { label: "극한 (11+)",     description: "극단적 위험. 가능하면 야외 활동 금지",   color: "#c084fc" },
  };
  return map[level];
}

/** GPS + OpenMeteo로 현재 UV 지수 조회 */
export async function fetchCurrentUv(): Promise<UvResult> {
  // 1. 위치 권한 요청
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("위치 권한이 필요합니다");
  }

  // 2. 현재 좌표 획득
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const { latitude, longitude } = location.coords;

  // 3. OpenMeteo API — 현재 시간 UV 지수 조회 (무료, API 키 불필요)
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}` +
    `&hourly=uv_index&forecast_days=1&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("UV 데이터를 가져올 수 없습니다");

  const data = await res.json();

  // 현재 시각에 맞는 시간대 인덱스 찾기
  const now = new Date();
  const currentHour = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:00`;
  const timeIndex = (data.hourly.time as string[]).findIndex((t) => t === currentHour);
  const uvIndex = timeIndex >= 0
    ? Math.round(data.hourly.uv_index[timeIndex] * 10) / 10
    : Math.round(data.hourly.uv_index[Math.min(12, data.hourly.uv_index.length - 1)] * 10) / 10;

  // 4. 역지오코딩으로 도시명 조회 (선택적)
  let city: string | undefined;
  try {
    const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
    city = geo[0]?.city ?? geo[0]?.district ?? undefined;
  } catch {
    // 도시명 조회 실패해도 UV 결과는 반환
  }

  const uvLevel = uvIndexToLevel(uvIndex);
  const info = uvLevelInfo(uvLevel);

  return {
    uvIndex,
    uvLevel,
    label: info.label,
    description: info.description,
    city,
  };
}
