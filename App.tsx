// App.tsx — SUNGARD 메인 엔트리
import React, { useState, useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import SplashScreen from "./SplashScreen";
import SetupScreen, { SunscreenConfig } from "./SetupScreen";
import HomeScreen from "./HomeScreen";
import { requestNotificationPermission } from "./notifications";

type Screen = "splash" | "setup" | "home";

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [config, setConfig] = useState<SunscreenConfig | null>(null);

  useEffect(() => {
    // 앱 시작 시 알림 권한 요청
    requestNotificationPermission().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {screen === "splash" && (
        <SplashScreen onEnter={() => setScreen("setup")} />
      )}
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
    </GestureHandlerRootView>
  );
}
