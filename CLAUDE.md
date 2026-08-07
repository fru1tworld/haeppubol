# 왁뿌볼 (Whack-a-Mole)

포트원 해커톤 프로젝트. 3D 왁뿌볼을 부숴서 스트레스 해소 + 점심 메뉴 추천 + 밍글 조 추첨.

## 구조

```
frontend/   React + Three.js (Vite, pnpm)
backend/    Kotlin/Ktor + jOOQ + SQLite
```

## 프론트엔드

- `src/three/` — 3D 왁뿌볼 렌더링 (react-three/fiber). WaxBall: 3층 메시(클레이·왁스·러버), 구면 보로노이 파쇄, 변형장.
- `src/audio/` — Web Audio API 합성 사운드 (7개 테마)
- `src/pages/` — 해시 라우팅 (#/wakbbu, #/lunch, #/mingle, #/request)
- `src/api/client.ts` — 백엔드 REST 연동 (fetch). 실패 시 하드코딩 폴백.
- `src/constants/` — 레스토랑, 크루볼 정적 데이터

### 명령어

```bash
cd frontend
pnpm install
pnpm dev          # 개발 서버 (Vite)
pnpm build        # 프로덕션 빌드
npx tsc --noEmit  # 타입 체크
```

## 백엔드

- Ktor + kotlinx.serialization
- jOOQ + SQLite (파일 DB)
- Arrow Either 기반 에러 처리
- API: `/api/restaurants`, `/api/restaurants/random`, `/api/smash-logs`

### 명령어

```bash
cd backend
./gradlew run     # 서버 실행
```

## 커밋 관례

- 한국어 명사형 종결 ("~추가", "~수정", "~제거")
- AI 서명 금지 (Co-Authored-By, Generated with 등)
- main 직접 푸시 또는 feature 브랜치에서 force-with-lease
