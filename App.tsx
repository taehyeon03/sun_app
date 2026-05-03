// App.tsx — SUNGARD 메인 엔트리
import React, { useEffect, useState } from "react";
import SplashScreen from "./SplashScreen";
import MainTabs from "./MainTabs";
import { loadSkinResult, loadTimerSession } from "./appStorage";
import type { TimerSession } from "./appStorage";
import type { SkinTypeResult } from "./skintype";

type Screen = "splash" | "main";

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [timerSession, setTimerSession] = useState<TimerSession | null>(null);
  const [skinResult, setSkinResult] = useState<SkinTypeResult | undefined>();

  useEffect(() => {
    let mounted = true;

    Promise.all([loadTimerSession(), loadSkinResult()])
      .then(([storedTimer, storedSkin]) => {
        if (!mounted) return;
        setTimerSession(storedTimer);
        setSkinResult(storedSkin);
      })
      .catch(() => {
        // 저장 데이터 복원 실패는 앱 실행을 막지 않습니다.
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      {screen === "splash" && (
        <SplashScreen onEnter={() => setScreen("main")} />
      )}
      {screen === "main" && (
        <MainTabs
          initialTimerSession={timerSession}
          initialSkinResult={skinResult}
        />
      )}
    </>
  );
}
