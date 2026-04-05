// TimerTab.tsx — 타이머 탭 (설정 → 타이머)
import React, { useState } from "react";
import SetupScreen, { SunscreenConfig } from "./SetupScreen";
import HomeScreen from "./HomeScreen";
import { SkinTypeResult } from "./skintype";

interface Props {
  skinResult?: SkinTypeResult;
}

type TimerState = "setup" | "running";

export default function TimerTab({ skinResult }: Props) {
  const [state, setState] = useState<TimerState>("setup");
  const [config, setConfig] = useState<SunscreenConfig | null>(null);

  if (state === "running" && config) {
    return (
      <HomeScreen
        config={config}
        skinResult={skinResult}
        onReset={() => { setConfig(null); setState("setup"); }}
      />
    );
  }

  return (
    <SetupScreen
      skinResult={skinResult}
      onStart={(cfg) => { setConfig(cfg); setState("running"); }}
    />
  );
}
