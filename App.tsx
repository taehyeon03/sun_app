// App.tsx — SUNGARD 메인 엔트리
import React, { useState } from "react";
import SplashScreen from "./SplashScreen";
import MainTabs from "./MainTabs";

type Screen = "splash" | "main";

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");

  return (
    <>
      {screen === "splash" && (
        <SplashScreen onEnter={() => setScreen("main")} />
      )}
      {screen === "main" && <MainTabs />}
    </>
  );
}
