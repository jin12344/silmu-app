# 🐭 두더지 잡기 게임

Firebase Realtime Database + Vercel 기반 온라인 2인 실시간 대전 두더지 잡기 게임입니다.

---

## 파일 구조

```
지뢰게임/
├── index.html      ← 메인 게임 (모든 화면 포함)
├── rules.html      ← 게임 규칙 페이지
├── vercel.json     ← Vercel 정적 배포 설정
└── README.md       ← 이 파일
```

---

## 1단계: Firebase 프로젝트 설정

### 1-1. Firebase 콘솔에서 프로젝트 생성
1. [https://console.firebase.google.com](https://console.firebase.google.com) 접속
2. **프로젝트 추가** 클릭 → 프로젝트 이름 입력 (예: `두더지게임`)
3. Google 애널리틱스는 선택 사항 → 계속

### 1-2. Realtime Database 활성화
1. 왼쪽 메뉴 → **빌드 → Realtime Database** 클릭
2. **데이터베이스 만들기** 클릭
3. 위치: `asia-southeast1` (싱가포르, 한국과 가깝습니다) 선택
4. 보안 규칙: **테스트 모드로 시작** 선택 → 활성화

### 1-3. 보안 규칙 설정 (선택 — 30일 후 만료 방지)
Firebase 콘솔 → Realtime Database → **규칙** 탭에 아래 내용 붙여넣기:

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read":  true,
        ".write": true
      }
    }
  }
}
```

### 1-4. 웹앱 등록 및 설정 코드 복사
1. Firebase 콘솔 → 프로젝트 설정(톱니바퀴) → **일반** 탭
2. 아래로 스크롤 → **앱 추가** → 웹(`</>`) 아이콘 클릭
3. 앱 닉네임 입력 → **앱 등록**
4. `firebaseConfig` 객체를 복사

---

## 2단계: index.html에 Firebase 설정 입력

`index.html` 파일을 열고, 아래 부분을 찾아서 복사한 값으로 교체하세요:

```javascript
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",           // ← 교체
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

> **주의**: `databaseURL`은 Firebase 콘솔 → Realtime Database → 데이터 탭 상단에서 확인할 수 있습니다.
> 형식: `https://<project-id>-default-rtdb.<region>.firebasedatabase.app`

---

## 3단계: 로컬 테스트

별도 빌드 없이 브라우저에서 바로 열 수 있습니다:

```
index.html 파일을 더블클릭하거나 브라우저로 드래그
```

또는 VS Code Live Server 확장을 사용하면 더 편리합니다.

---

## 4단계: Vercel 배포

### 방법 A — Vercel CLI 사용 (터미널)

```bash
# Vercel CLI 설치 (최초 1회)
npm install -g vercel

# 배포 (지뢰게임 폴더에서 실행)
cd 지뢰게임
vercel

# 이후 배포 업데이트
vercel --prod
```

### 방법 B — GitHub 연동 (권장)

1. 이 폴더를 GitHub 저장소에 업로드
2. [https://vercel.com](https://vercel.com) → **Add New Project** → GitHub 저장소 선택
3. Framework: **Other** (정적 파일) → **Deploy** 클릭
4. 배포 완료 → Vercel이 URL을 제공합니다 (예: `https://두더지게임.vercel.app`)

---

## 게임 방법 요약

| 단계 | 1P (방장)                          | 2P (참가자)                       |
|------|------------------------------------|-----------------------------------|
| 1    | 닉네임 입력 → **방 만들기**        | 닉네임 입력 → **방 참가하기**     |
| 2    | 화면에 표시된 **4자리 코드** 공유  | 코드 입력 → **입장**              |
| 3    | 자동 카운트다운 시작               | 자동 카운트다운 시작              |
| 4    | 두더지 클릭으로 점수 획득          | 두더지 클릭으로 점수 획득         |
| 5    | 라운드 종료 후 **다음 라운드** 클릭| 호스트 결정 대기                  |
| 6    | 3라운드 합산 → 최종 우승자 발표    | 3라운드 합산 → 최종 우승자 발표   |

---

## 기술 스택

- **Frontend**: 순수 HTML / CSS / JavaScript (빌드 불필요)
- **실시간 DB**: Firebase Realtime Database
- **배포**: Vercel (정적 호스팅)
