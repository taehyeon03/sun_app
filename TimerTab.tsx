// TimerTab.tsx — 타이머 탭 (설정 → 타이머)
import React, { useEffect, useState } from "react";
import SetupScreen, { SunscreenConfig } from "./SetupScreen";
import HomeScreen from "./HomeScreen";
import { SkinTypeResult } from "./skintype";
import { REAPPLY_RULES } from "./sunscreen";
import {
  clearTimerSession,
  saveTimerSession,
} from "./appStorage";
import type { TimerSession } from "./appStorage";

interface Props {
  skinResult?: SkinTypeResult;
  initialSession?: TimerSession | null;
  onSessionChange?: (session: TimerSession | null) => void;
}

type TimerState = "setup" | "running";

export default function TimerTab({ skinResult, initialSession, onSessionChange }: Props) {
  const [state, setState] = useState<TimerState>(initialSession ? "running" : "setup");
  const [session, setSession] = useState<TimerSession | null>(initialSession ?? null);

  useEffect(() => {
    if (!session && initialSession) {
      setSession(initialSession);
      setState("running");
    }
  }, [initialSession, session]);

  const handleStart = (cfg: SunscreenConfig) => {
    const nextSession: TimerSession = {
      config: cfg,
      appliedAt: cfg.appliedAt,
      history: [{
        time: cfg.appliedAt,
        productType: cfg.productType,
        spfLabel: REAPPLY_RULES[cfg.productType][cfg.spfLevel].label,
      }],
    };

    setSession(nextSession);
    setState("running");
    onSessionChange?.(nextSession);
    saveTimerSession(nextSession).catch(() => {});
  };

  const handleReset = () => {
    setSession(null);
    setState("setup");
    onSessionChange?.(null);
    clearTimerSession().catch(() => {});
  };

  const handleSessionChange = (nextSession: TimerSession) => {
    setSession(nextSession);
    onSessionChange?.(nextSession);
    saveTimerSession(nextSession).catch(() => {});
  };

  if (state === "running" && session) {
    return (
      <HomeScreen
        config={session.config}
        initialAppliedAt={session.appliedAt}
        initialHistory={session.history}
        skinResult={skinResult}
        onReset={handleReset}
        onSessionChange={handleSessionChange}
      />
    );
  }

  return (
    <SetupScreen
      skinResult={skinResult}
      onStart={handleStart}
    />
  );
}
