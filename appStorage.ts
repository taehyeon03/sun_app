import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SunscreenConfig } from "./SetupScreen";
import type { ProductType } from "./sunscreen";
import type { SkinTypeResult } from "./skintype";

export interface StoredHistoryEntry {
  time: Date;
  productType: ProductType;
  spfLabel: string;
}

export interface TimerSession {
  config: SunscreenConfig;
  appliedAt: Date;
  history: StoredHistoryEntry[];
}

const TIMER_SESSION_KEY = "sungard.timerSession.v1";
const SKIN_RESULT_KEY = "sungard.skinResult.v1";

type JsonTimerSession = Omit<TimerSession, "config" | "appliedAt" | "history"> & {
  config: Omit<SunscreenConfig, "appliedAt"> & { appliedAt: string };
  appliedAt: string;
  history: Array<Omit<StoredHistoryEntry, "time"> & { time: string }>;
};

function parseDate(value: unknown, fallback = new Date()): Date {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export async function loadTimerSession(): Promise<TimerSession | null> {
  const raw = await AsyncStorage.getItem(TIMER_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as JsonTimerSession;
    const appliedAt = parseDate(parsed.appliedAt, parseDate(parsed.config?.appliedAt));

    return {
      config: {
        ...parsed.config,
        appliedAt: parseDate(parsed.config?.appliedAt, appliedAt),
      },
      appliedAt,
      history: Array.isArray(parsed.history)
        ? parsed.history.map((entry) => ({
            ...entry,
            time: parseDate(entry.time, appliedAt),
          }))
        : [],
    };
  } catch {
    await AsyncStorage.removeItem(TIMER_SESSION_KEY);
    return null;
  }
}

export async function saveTimerSession(session: TimerSession): Promise<void> {
  const payload: JsonTimerSession = {
    config: {
      ...session.config,
      appliedAt: session.config.appliedAt.toISOString(),
    },
    appliedAt: session.appliedAt.toISOString(),
    history: session.history.map((entry) => ({
      ...entry,
      time: entry.time.toISOString(),
    })),
  };

  await AsyncStorage.setItem(TIMER_SESSION_KEY, JSON.stringify(payload));
}

export async function clearTimerSession(): Promise<void> {
  await AsyncStorage.removeItem(TIMER_SESSION_KEY);
}

export async function loadSkinResult(): Promise<SkinTypeResult | undefined> {
  const raw = await AsyncStorage.getItem(SKIN_RESULT_KEY);
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as SkinTypeResult;
  } catch {
    await AsyncStorage.removeItem(SKIN_RESULT_KEY);
    return undefined;
  }
}

export async function saveSkinResult(result: SkinTypeResult): Promise<void> {
  await AsyncStorage.setItem(SKIN_RESULT_KEY, JSON.stringify(result));
}
