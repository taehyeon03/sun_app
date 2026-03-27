# 📱 SUNGARD — Google Play Store 배포 가이드

## 📋 목차
1. [사전 준비](#사전-준비)
2. [개발자 계정 설정](#개발자-계정-설정)
3. [앱 설정 완성](#앱-설정-완성)
4. [AAB 빌드](#aab-빌드)
5. [Google Play Console 업로드](#google-play-console-업로드)
6. [심사 및 배포](#심사-및-배포)

---

## 🔧 사전 준비

### 요구사항
- Node.js 18+
- npm 또는 yarn
- Google Play 개발자 계정 (등록료 USD $25)
- Google Cloud 프로젝트

### 설치
```bash
# Expo CLI 설치
npm install -g eas-cli expo-cli

# 프로젝트 디렉토리로 이동
cd ws_sun

# 의존성 설치
npm install
```

---

## 👤 개발자 계정 설정

### 1단계: Google Play 개발자 계정 등록
1. https://play.google.com/console 방문
2. "앱 만들기" 클릭
3. 앱 이름 입력: `SUNGARD - 선크림 타이머`
4. 기본 정보 입력 (개발자 이름, 이메일, 전화번호)

### 2단계: EAS 계정 연동
```bash
# EAS 로그인
eas login

# Expo 계정이 필요 (없으면 생성)
# https://expo.dev 에서 가입 후 진행
```

### 3단계: Google Play API 설정

**Google Cloud Console에서:**
1. https://console.cloud.google.com 방문
2. 새 프로젝트 생성: `sungard-android`
3. "Google Play Android Developer API" 활성화
4. 서비스 계정 생성
   - 역할: "편집자"
   - 키 유형: JSON
5. 다운로드한 JSON 파일을 `ws_sun/` 디렉토리에 저장
   - 파일명: `google-play-service-account.json`

**Google Play Console에서:**
1. 설정 → API 액세스
2. 생성한 서비스 계정 추가
3. 역할: "관리자" 선택

---

## ⚙️ 앱 설정 완성

### 1. `app.json` 수정

```json
{
  "expo": {
    "name": "SUNGARD - 선크림 타이머",
    "slug": "sungard",
    "version": "1.0.0",
    "description": "논문 기반 선크림 재도포 알림 앱",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0f1923"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0f1923"
      },
      "package": "com.sungard.sunscreentimer",
      "versionCode": 1,
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "POST_NOTIFICATIONS",
        "SCHEDULE_EXACT_ALARM"
      ]
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FFD060",
          "sounds": ["./assets/notification.wav"]
        }
      ],
      "expo-sensors"
    ],
    "extra": {
      "eas": {
        "projectId": "YOUR-EAS-PROJECT-ID-HERE"
      }
    }
  }
}
```

**수정 사항:**
- `description` 추가
- `android.package`: 고유한 패키지명 설정 (역도메인 포맷)
  - 예: `com.yourcompany.sungard` (company name으로 변경)
- `extra.eas.projectId`: EAS 프로젝트 ID로 변경

### 2. EAS 프로젝트 ID 확인
```bash
eas build:configure

# 또는 Expo 대시보드에서
# https://expo.dev/accounts/[username]/projects
```

### 3. 이미지 아셋 준비

필요한 파일들을 `assets/` 디렉토리에 저장:

| 파일명 | 크기 | 설명 |
|--------|------|------|
| `icon.png` | 1024×1024 | 앱 아이콘 (배경 포함) |
| `splash.png` | 1080×1920 | 스플래시 화면 |
| `adaptive-icon.png` | 1080×1080 | 적응형 아이콘 (배경 제외) |
| `notification-icon.png` | 96×96 | 알림 아이콘 (투명 배경) |
| `notification.wav` | | 알림 소리 (선택사항) |

**아이콘 생성 팁:**
- Figma 또는 Adobe Express에서 템플릿 사용
- 배경색: `#0f1923` (진한 네이비)
- 주색상: `#FFD060` (태양 금색)
- 투명도가 필요한 부분: PNG 포맷 사용

### 4. 개인정보 처리방침

`privacy-policy.html` 파일이 준비되어 있습니다.

Google Play Console에서:
1. 정책 → 앱 개인정보 처리방침
2. URL 입력: `https://[your-website]/privacy-policy.html`
   또는 파일 업로드

---

## 🏗️ AAB 빌드

### 1단계: 빌드 프로필 설정

```bash
# 프로덕션 빌드 설정 확인
cat eas.json
```

### 2단계: 빌드 실행

```bash
# Android 프로덕션 빌드 (AAB 포맷 — Play Store 필수)
eas build --platform android --profile production

# 또는
npm run build:android
```

빌드 중 선택사항:
- ✅ "Build for internal distribution" → No (Play Store용)
- 빌드 시간: **10-15분**

### 3단계: 빌드 완료
```bash
# 빌드 상태 확인
eas build:list

# 또는 대시보드에서 확인
# https://expo.dev/accounts/[username]/projects/sungard/builds
```

빌드 완료 시 다운로드 링크 제공됨 (`.aab` 파일)

---

## 📤 Google Play Console 업로드

### 1단계: 앱 정보 입력

**Google Play Console:**
1. 내 앱 → `SUNGARD - 선크림 타이머`
2. 앱 정보 작성:
   - **앱 이름**: SUNGARD - 선크림 타이머
   - **짧은 설명** (80자): 논문 기반 선크림 재도포 알림 앱
   - **설명** (4000자):
     ```
     여름철 자외선으로부터 피부를 보호하세요!

     SUNGARD는 과학 논문 기반의 선크림 재도포 알림 앱입니다.

     ✨ 주요 기능:
     • 제품 형태(크림/고체/스프레이)에 따른 맞춤 알림
     • SPF 단계별 재도포 주기 계산
     • UV 지수별 차단 강도 추천
     • 도포 기록 관리
     • 푸시 알림으로 재도포 시간 상기

     📚 과학적 근거:
     • FDA 2011 최종 규정 (선크림 내수성 기준)
     • WHO UV Index 가이드라인 2002
     • Diffey & Robson 1989 (SPF 측정 표준)
     • Autier et al. 2007 (자외선 노출 행동 연구)

     🔒 개인정보:
     모든 데이터는 기기에만 저장되며 외부로 전송되지 않습니다.
     ```
   - **카테고리**: 건강 & 피트니스
   - **콘텐츠 등급**: 3+ (전체이용가)

### 2단계: 앱 콘텐츠 등급

1. 설정 → 앱 콘텐츠 등급
2. 설문 완료 (대부분 "해당 없음")
3. 결과: **전체이용가 (3+)**

### 3단계: 프라이버시 정책

1. 설정 → 앱 개인정보 처리방침
2. URL 입력:
   ```
   https://[your-domain]/privacy-policy.html
   ```
   또는 `ws_sun/privacy-policy.html` 파일 제공 경로

### 4단계: 릴리스 준비

1. 출시 → 프로덕션 → 새 출시 생성
2. **AAB 업로드**:
   - eas build:list에서 `.aab` 파일 다운로드
   - "APK/AAB 업로드" → 파일 선택
3. 출시 이름: `1.0.0 (1)`
4. 출시 노트:
   ```
   초기 출시

   • 태양 차단 제스처 스플래시 화면
   • 3단계 선크림 설정
   • 원형 진행 타이머
   • 재도포 알림
   • 도포 기록 관리
   ```

### 5단계: 심사 제출

1. 출시 검토 페이지 확인
2. "검토를 위해 출시" 버튼 클릭
3. **소요 시간**: 2-3시간 ~ 2-3일

---

## ✅ 심사 및 배포

### 심사 기간
- **평균**: 2-24시간
- **최대**: 일주일

### 심사 거부 시 대응

**일반적인 거부 사유:**
1. **개인정보 처리방침 없음**
   → `privacy-policy.html` 제공
2. **권한 과다**
   → 불필요한 권한 제거
3. **타겟 API 레벨 낮음**
   → app.json에서 Android 버전 확인
4. **광고 함유**
   → 현재는 해당 없음

### 심사 통과 후

1. Google Play Console에서 "배포 대기" 상태 확인
2. "배포 시작" 클릭
3. **배포 시간**: 몇 시간 ~ 하루

### 배포 후 모니터링

```bash
# 다운로드 및 평점 추적
# https://play.google.com/console → 내 앱 → SUNGARD
```

---

## 🔄 업데이트 배포

### 버전 업데이트
```bash
# app.json에서 버전 증가
"version": "1.0.1",
"android": { "versionCode": 2 }
```

### 새 빌드
```bash
eas build --platform android --profile production
```

### 같은 과정 반복
1. Google Play Console에서 새 출시 생성
2. AAB 업로드
3. 출시 노트 작성
4. "검토를 위해 출시" 클릭

---

## 📋 체크리스트

배포 전 확인사항:

- [ ] `app.json` 패키지명 설정 (`com.yourname.sungard`)
- [ ] `app.json` EAS projectId 설정
- [ ] `assets/icon.png` (1024×1024) 준비
- [ ] `assets/splash.png` (1080×1920) 준비
- [ ] `assets/adaptive-icon.png` (1080×1080) 준비
- [ ] `assets/notification-icon.png` (96×96) 준비
- [ ] Google Play 개발자 계정 생성 ($25)
- [ ] Google Cloud 프로젝트 생성
- [ ] EAS 계정 설정 완료
- [ ] `google-play-service-account.json` 다운로드
- [ ] Google Play API 활성화
- [ ] EAS 프로젝트 생성 (`eas build:configure`)
- [ ] AAB 빌드 성공 확인
- [ ] Google Play Console 앱 생성
- [ ] 개인정보 처리방침 URL 준비
- [ ] 스크린샷 준비 (5-8장, 1080×1920)
  - 스플래시 화면
  - 설정 화면 (각 단계)
  - 타이머 화면
  - 재도포 모달
- [ ] 앱 설명 및 마케팅 자료 작성

---

## 🎥 스크린샷 준비 팁

**크기**: 1080×1920 (최소)
**권장 개수**: 5-8장
**순서**:
1. 스플래시 화면 (태양 차단 제스처)
2. 설정 화면 1 (제품 형태)
3. 설정 화면 2 (SPF)
4. 설정 화면 3 (UV 환경)
5. 타이머 화면 (메인)
6. 초과 상태 (맥박 애니메이션)
7. 재도포 모달

**텍스트 추가**:
- "타이머 시작!"
- "재도포 알림"
- "기록 관리"
- 등

---

## 🆘 문제 해결

### Q: "EAS 프로젝트 ID가 없습니다"
**A**:
```bash
eas build:configure
# 또는
eas project:create
```

### Q: "빌드 실패 — 아이콘 없음"
**A**: `assets/icon.png` (1024×1024) 파일 확인
```bash
ls -la assets/
```

### Q: "Google Play API 설정 오류"
**A**: Google Cloud Console에서:
1. 프로젝트 선택 확인
2. "Google Play Android Developer API" 활성화
3. 서비스 계정 키 다시 생성
4. Google Play Console의 API 액세스에서 계정 추가

### Q: "심사 거부 — 과다 권한"
**A**: app.json에서 불필요한 권한 제거:
```json
"permissions": [
  "VIBRATE",
  "POST_NOTIFICATIONS",
  "SCHEDULE_EXACT_ALARM"
]
```

---

## 📞 추가 리소스

- **EAS 공식 가이드**: https://docs.expo.dev/eas/
- **Google Play Console 도움말**: https://support.google.com/googleplay/android-developer
- **Android 개발자 가이드**: https://developer.android.com/

---

**배포 완료 후:**
- Play Store 링크 공유
- 스크린샷 및 설명을 GitHub README에 추가
- 사용자 피드백 수집
- 주기적 업데이트 계획

---

**성공적인 배포를 기원합니다! ☀️ SUNGARD가 많은 사람들이 자외선 차단하는 데 도움이 되기를 바랍니다.**
