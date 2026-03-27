# ☀ SUNGARD — 선크림 타이머 앱

논문 기반 선크림 재도포 알림 앱. Google Play Store 배포 가능.

---

## 📱 앱 기능

### 1. 태양 차단 제스처 스플래시
- 앱 실행 시 일몰 배경에 태양이 뜬 스플래시 화면 표시
- 사용자가 손으로 화면을 **왼쪽→오른쪽 스와이프** 해 태양을 가리면 앱 진입
- 진행 바, 햅틱 피드백, 태양 흐려지는 애니메이션 제공
- 진입 시각 자동 기록 → 타이머 시작점으로 사용

### 2. 선크림 정보 설정 (3단계)
| 단계 | 선택 항목 |
|------|-----------|
| 1 | 제품 형태: 크림/로션 · 고체/스틱 · 스프레이 |
| 2 | SPF 등급: SPF 15-29 / 30-49 / 50-99 / 100+ |
| 3 | UV 지수 환경, 땀/수영 여부 |

### 3. 메인 타이머 화면
- **원형 진행 아크** — 남은 시간 시각화
- 재도포 시간 임박 시 색상 변경 (노랑→주황→빨강)
- 권장 도포량 안내 (mg/cm² + 직관적 표현)
- 도포 기록 히스토리
- **"지금 발랐어요" 버튼** → 타이머 재시작 + 새 알림 스케줄

### 4. 푸시 알림
- 재도포 20분 전: 예고 알림
- 재도포 시간: 주 알림 (도포량 안내 포함)
- 재도포 후 새 알림 자동 스케줄

---

## 📚 논문 근거 (알고리즘)

| 규칙 | 출처 |
|------|------|
| 2 mg/cm² 기준 SPF 측정 | Diffey & Robson (1989), J Soc Cosmet Chem |
| 2시간마다 재도포 권장 | FDA Final Rule on Sunscreen (2011) |
| 내수성: 40분/80분 기준 | FDA 21 CFR Parts 201 and 310 |
| UV Index별 노출 제한 | WHO UV Index Guidelines (2002) |
| 행동 변화 중요성 | Autier et al. (2007), JAMA Dermatology |

---

## 🚀 빠른 시작

### 1. 환경 설정
```bash
# Node.js 18+ 필요
npm install -g eas-cli
npm install
```

### 2. 개발 실행
```bash
npx expo start
# Android 에뮬레이터 또는 실제 기기에서 Expo Go 앱으로 확인
```

### 3. Play Store 빌드 & 배포

#### 📱 Google Play Store 배포 가이드
**완전한 단계별 가이드는 [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)를 참고하세요.**

빠른 요약:
```bash
# EAS 계정 설정
eas login
eas build:configure

# app.json에서 패키지명 수정
# "android": { "package": "com.yourname.sungard" }

# AAB 빌드 (Play Store용)
eas build --platform android --profile production

# Google Play Console에 업로드
# (자세한 과정은 DEPLOYMENT_GUIDE.md 참고)
```

**필요한 파일:**
- 📄 [`eas.json`](./eas.json) — 빌드 설정
- 🔒 [`privacy-policy.html`](./privacy-policy.html) — 개인정보 처리방침
- 📋 [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) — 상세 배포 가이드

---

## 📁 프로젝트 구조

```
sungard/
├── App.tsx                      # 루트 엔트리
├── app.json                     # Expo 설정
├── package.json
└── src/
    ├── lib/
    │   ├── sunscreen.ts         # 핵심 알고리즘 (논문 기반)
    │   └── notifications.ts     # 푸시 알림 서비스
    └── screens/
        ├── SplashScreen.tsx     # 태양 차단 제스처
        ├── SetupScreen.tsx      # 선크림 정보 입력
        └── HomeScreen.tsx       # 메인 타이머
```

---

## 🎨 디자인 스펙

- **컬러 팔레트**: Deep Navy `#0f1923` · Sun Gold `#FFD060` · Warm Orange `#FF8C42`
- **상태별 색상**: 정상 `#FFD060` · 임박 `#f59e0b` · 초과 `#ef4444`
- **테마**: 다크 + 일몰 그라디언트

---

## 🔧 주요 의존성

| 패키지 | 용도 |
|--------|------|
| `expo-notifications` | 푸시 알림 |
| `expo-sensors` | 가속도계 (기울기 감지 확장 시) |
| `expo-haptics` | 햅틱 피드백 |
| `react-native-svg` | 타이머 아크 |
| `react-native-reanimated` | 고성능 애니메이션 |

---

## 📋 Play Store 등록 체크리스트

- [ ] `app.json` 패키지명 변경
- [ ] EAS Project ID 설정
- [ ] 앱 아이콘 (`assets/icon.png` 1024x1024)
- [ ] 스플래시 이미지 (`assets/splash.png`)
- [ ] 스크린샷 준비 (폰/태블릿)
- [ ] 개인정보 처리방침 URL (알림 권한 필요)
- [ ] `eas build --platform android --profile production`
- [ ] Google Play Console 앱 생성 및 AAB 업로드
