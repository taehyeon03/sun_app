# 🚀 SUNGARD — Google Play Store 배포 5분 가이드

> ⏱️ **예상 시간**: 총 2-5일 (대부분 자동)

---

## ✅ 제가 이미 준비한 것

```
✓ 아이콘 (1024x1024) — assets/icon.png
✓ 스플래시 화면 (1080x1920) — assets/splash.png
✓ 적응형 아이콘 (1080x1080) — assets/adaptive-icon.png
✓ 알림 아이콘 (96x96) — assets/notification-icon.png
✓ app.json 최종 설정
✓ eas.json 빌드 설정
✓ 개인정보 처리방침 — privacy-policy.html
✓ 배포 가이드 — DEPLOYMENT_GUIDE.md
```

---

## 🔥 당신이 해야 할 일

### 1️⃣ **Google Play 개발자 계정 만들기** (5분, $25)

1. https://play.google.com/console 방문
2. "앱 만들기" 클릭
3. 정보 입력:
   - 앱 이름: `SUNGARD - 선크림 타이머`
   - 기본 언어: `한국어`
   - 애플리케이션 유형: `앱`
   - 무료 여부: `무료`
   - 이용 약관 동의

---

### 2️⃣ **Expo 계정 만들기** (3분, 무료)

```bash
# 1. Expo 회원가입
# https://expo.dev → "Sign up" → 이메일 입력

# 2. 로컬 PC에서 로그인
cd ws_sun
npx eas login

# 3. 메시지에 따라 (Expo 이메일/비밀번호 입력)
```

---

### 3️⃣ **EAS 프로젝트 설정** (2분)

```bash
cd ws_sun
npx eas build:configure

# 메시지:
# "Choose an EAS project to link to" → Create new project
# "Project name" → sungard
# "Project name in EAS" → sungard (기본값)
```

**완료 후**: `app.json`의 `YOUR_EAS_PROJECT_ID_HERE` 부분이 자동으로 채워집니다.

---

### 4️⃣ **로컬에서 앱 테스트** (5분)

```bash
cd ws_sun
npm install          # 의존성 설치
npm start            # 앱 시작

# 그러면 QR 코드가 나타남
# → 휴대폰의 Expo Go 앱 설치 후 QR 코드 스캔
# → 앱이 실행되는지 확인
```

⏹️ **테스트 완료 후** `Ctrl+C` 누르기

---

### 5️⃣ **프로덕션 빌드** (15분, 자동)

```bash
cd ws_sun
npm run build:production

# 또는
eas build --platform android --profile production

# 메시지:
# "Build type for android" → aab (Play Store용)
```

**빌드 중...**
- 창을 닫지 마세요!
- 10-15분 대기
- 완료 시: Expo 대시보드에서 다운로드 가능

---

### 6️⃣ **Google Play Console에 업로드** (10분)

1. https://play.google.com/console 로그인
2. 좌측 메뉴: "출시" → "프로덕션"
3. "새 출시 생성" 클릭
4. **AAB 파일 업로드**:
   - eas build:list 명령어로 빌드 ID 확인
   - Expo 대시보드에서 `.aab` 파일 다운로드
   - "APK/AAB 업로드" → 파일 선택
5. "저장" → "검토를 위해 출시"

---

### 7️⃣ **심사 대기** ⏳

| 단계 | 시간 |
|------|------|
| Google 자동 검사 | 2-3시간 |
| **심사** | **2-24시간** |
| 배포 | 몇 시간 ~ 1일 |

심사 거부 시:
- Google Play Console → 거부 사유 확인
- 수정 후 같은 과정 반복

---

### 8️⃣ **배포 완료!** 🎉

```
Google Play Store에서 검색 가능:
"SUNGARD" 또는 "선크림 타이머"

다운로드 링크:
https://play.google.com/store/apps/details?id=com.sungard.sunscreentimer
```

---

## 📋 **복사 & 붙여넣기 명령어 모음**

```bash
# 1️⃣ 로그인
npx eas login

# 2️⃣ 프로젝트 설정
npx eas build:configure

# 3️⃣ 테스트
npm install
npm start
# (QR 코드 나오면 휴대폰으로 스캔)

# 4️⃣ 빌드
npm run build:production

# 5️⃣ 빌드 상태 확인
npx eas build:list

# 6️⃣ (선택) 대시보드 열기
npx eas login # 후 웹 대시보드에서 파일 다운로드
```

---

## ⚠️ **주의사항**

### 패키지명 변경 (선택사항)
기본값: `com.sungard.sunscreentimer`

다른 이름으로 하려면:
```json
// app.json의 android.package 수정
"package": "com.yourname.sungard"  // 자신의 이름으로
```

### 심사 거부 시
가장 흔한 거부 사유:
```
❌ 개인정보 처리방침 없음
→ Google Play Console에서 privacy-policy.html URL 추가

❌ 타겟 API 레벨 낮음
→ app.json의 android 설정 확인 (자동)

❌ 권한 과다
→ 현재 설정은 최소한으로 구성됨 ✓
```

---

## 🎯 **다음 단계**

1. **Google Play 개발자 계정 만들기** (필수)
2. **Expo 로그인** (`npx eas login`)
3. **프로젝트 설정** (`npx eas build:configure`)
4. **테스트** (`npm start`)
5. **빌드** (`npm run build:production`)
6. **업로드** (Google Play Console)
7. **심사 대기** (자동)
8. **배포!** 🚀

---

## 📞 **문제 발생 시**

### "eas login 오류"
```bash
npm install -g eas-cli  # EAS CLI 최신 버전으로 업그레이드
eas login               # 다시 시도
```

### "빌드 실패"
```bash
npm install            # 의존성 재설치
npm run build:production  # 빌드 재시도
```

### "Google Play 업로드 오류"
```
→ DEPLOYMENT_GUIDE.md 의 "문제 해결" 섹션 참고
```

---

## ✨ **축하합니다!**

모든 준비가 완료되었습니다. 이제 Google Play Store에 배포할 수 있습니다! 🌞

**제가 준비한 것들이 제대로 작동하는지 확인하려면:**

```bash
cd ws_sun
npm install
npm start

# QR 코드 나오면 성공! Ctrl+C로 종료
```

**질문이 있으면 DEPLOYMENT_GUIDE.md를 참고하세요.**
