# 왁뿌볼 (Whack-a-Mole)

왁스볼을 뿌셔서 결과를 뽑는 인터랙티브 3D 앱.

왁스볼을 마우스로 꾹 누르면 금이 가고, 계속 누르면 뿌서지면서 랜덤 결과가 나옵니다.

## 주요 기능

- **점메추 왁뿌볼** — 성수 주변 맛집 중 하나를 랜덤 추천 (매장 식사 / 배달 시키기)
- **밍글 왁뿌볼** — 밍글 조 랜덤 추첨
- **커스텀 왁뿌볼** — 아이템을 직접 넣고 나만의 왁뿌볼 생성·저장·공유
- **크루 왁뿌볼** — 크루별 공유 왁뿌볼 (홈에서 바로 플레이 가능)

## 기술 스택

- **Frontend**: React, Three.js (React Three Fiber), Framer Motion, TypeScript
- **Backend**: Kotlin, Ktor, jOOQ, SQLite
- **3D**: 구면 보로노이 파쇄 기반 왁스볼 물성 시뮬레이션

## 실행

```bash
# Frontend
cd frontend
pnpm install
pnpm dev

# Backend
cd backend
./gradlew run
```
