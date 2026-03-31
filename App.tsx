// App.tsx — SUNGARD 메인 엔트리 (MVP)
import React, { useState } from "react";
import SetupScreen, { SunscreenConfig } from "./SetupScreen";
import HomeScreen from "./HomeScreen";

type Screen = "setup" | "home";

export default function App() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [config, setConfig] = useState<SunscreenConfig | null>(null);

  return (
    <>
      {screen === "setup" && (
        <SetupScreen
          onStart={(cfg) => {
            setConfig(cfg);
            setScreen("home");
          }}
        />
      )}
      {screen === "home" && config && (
        <HomeScreen
          config={config}
          onReset={() => setScreen("setup")}
        />
      )}
    </>
  );
}
