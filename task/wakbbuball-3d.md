# 왁뿌볼 3D 물성 시뮬레이터 이식

레퍼런스: `/Users/june/Downloads/wakbboolball-3d.html` (three.js r128 인라인 번들 + 앱 코드 730줄).
3층 구조(고무막/왁스셸/클레이), 구면 보로노이 2단 파쇄, 구면 스칼라 변형장, 3단 파괴 캐스케이드, 온도 취성까지 React + R3F 구조로 이식해 기존 왁뿌볼(`three/Ball.tsx` + `three/waxFracture.ts`)을 교체한다. 적용 범위는 왁뿌볼·점메추·밍글 세 페이지 전부.

## 공통 규칙 (모든 워커)

- 작업 디렉터리: `/Users/june/Downloads/haeppubol/frontend`
- 컨벤션: `~/opi-workspace/services/ap-service`의 `spec/code-pattern/`. No robustness(명시된 케이스만, 추측성 fallback 금지), sans-IO 코드만 테스트(순수 코어는 반드시, 렌더/오디오 셸은 테스트 금지), 좁은 타입.
- 이모지 금지. 레퍼런스 버튼 라벨의 이모지는 빼고 옮긴다.
- 검증 명령: `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/vitest run <파일>` (pnpm 래퍼는 workspace 파일 문제로 깨져 있음).
- `noUnusedLocals`/`noUnusedParameters` 켜져 있음.
- 랜덤은 `Rng = () => number`로 주입. 레퍼런스의 전역 `seed`/`rnd()`를 그대로 옮기지 말 것.
- 모듈 간 계약은 `src/three/waxTypes.ts`. **읽기만 하고 수정 금지.** 자기 소유 파일 밖은 건드리지 않는다.
- 레퍼런스의 임시 벡터 재사용(`_tmpA` 등) 최적화는 각 모듈 내부에서 자유. 외부로 노출되는 API는 계약 타입을 따른다.

## Worker A — 구면 보로노이 셸

소유: `src/three/waxShell.ts`, `src/three/waxShell.test.ts`. 레퍼런스 133~139, 160~341행.

`buildShell(rng: Rng): WaxShell`. 순수 함수로 옮긴다:
- `fibSphere(n, jitter, rng)`: 피보나치 구면 + jitter
- `clipSphere(poly, nrm)`: 원점 통과 평면으로 구면 다각형 절단(현 보간 후 정규화)
- `capPoly(a, ang, n)`, `randInCap(a, ang, rng)`, `voronoiSph(sites, i, cap)`, `sphCentroid(poly)`
- 큰 판 22개(cap 1.15) → 각 판 안 서브 사이트 6~9개(cap 0.70, 최대 500회 리젝션 샘플링) → 잔조각 약 165개
- 셀마다 입체각 근사 `area`, `rot=(rng-0.5)*0.75`, `tone=(rng-0.5)*0.07`
- `triCount = Σ 7·nv`

테스트: 같은 rng 시드 → 동일 셸(결정성), 모든 셀 `poly.length >= 3`, 셀 중심이 자기 그룹 캡 안, 잔조각 총수 기대 범위, `triCount === Σ 7·nv`.

## Worker B — 변형장

소유: `src/three/deformField.ts`, `src/three/deformField.test.ts`. 레퍼런스 141~294행.

레퍼런스의 모듈 전역 `DENTS`/`bulge`/`plasticTotal`을 `DeformState`로 명시적으로 넘기는 형태로 바꾼다(sans-IO):
- `createDeformState(): DeformState` (squeeze 반경 0.95rad)
- `addDent(state, dir, depth, radAng)`: dot > 0.982면 병합(depth 상한 0.22, dir lerp 0.30), 최대 20개 유지, `plasticTotal` 누적
- `fall(ca, cosr, invr)`: smoothstep 감쇠
- `deformSmooth(state, d)`: dents 합 + squeeze + `bulge*(1-near*0.92)` 체적 보존 팽창
- `strainAt(state, d)`, `deformClay(state, d)`: ridged 노이즈 2옥타브(6.5, 15.0 주파수) × strain
- `updateBulge(state)`: `Σ depth*(1-cosr)` 기반, 계수 0.42
- 해시 노이즈 `h3`/`vnoise`/`ridged`도 이 파일에
- `DeformField` 인터페이스 구현을 반환하는 헬퍼(`fieldOf(state): DeformField`) 포함

테스트: 가까운 dent 병합 시 개수 유지·depth 상한, `plasticTotal` 단조증가, 캡 밖 방향 기여 0, bulge가 눌린 부피에 비례, 같은 입력 → 같은 출력.

## Worker C — 물성/파괴

소유: `src/three/waxPhysics.ts`, `src/three/waxPhysics.test.ts`. 레퍼런스 543~596, 743~781행.

- `waxIntegrity(shell)`: 셀별 `max(0, 1-0.22·c1-0.30·c2-0.48·wear)` 평균
- `crackThreshold(integrity, temp) = (0.22+0.62·integrity)·(0.60+0.40·temp)`
- `resistance(integrity, give, temp) = (0.34+0.66·integrity)·(1-0.42·give)·(1+0.18·(1-temp))`
- `fracture(shell, deform, pressDir, force, temp, rng): CrackEvent[]` — 3단 캐스케이드:
  1. 반경 내 아직 안 깨진 큰 판(`c1t=1`, size 1.0)
  2. 1이 비었으면: 깨진 판의 잔조각(`c2t=1`, sink+0.20, size `clamp(0.26+area·2.2, 0.26, 0.82)`)
  3. 2도 비었으면: 이미 깨진 잔조각 갈기(반경 ×1.15, wear+0.18+rng·0.16, sink+0.18, size 0.09+rng·0.13, 최대 19개, wear>=1이면 alive=false)
  - 반경 `rad = (0.30+0.44·min(F,1.4))·(1+(1-temp)·0.42)`
  - 이벤트 있으면: `addDent(deform, pressDir, 0.030+0.055·min(F,1.4), 0.30+0.10·min(F,1.4))` 호출, size 내림차순 정렬 후 최대 13개에 `delayMs`(첫 0, 이후 `6+rng·30·i`) 부여
  - 이벤트 없으면 빈 배열 (호출측이 force 상한 조정과 클레이 dent를 처리)
- snap-through/force 적분/온도 해동(90초)/종료(integrity<0.06)는 프레임 루프용 순수 헬퍼로: `stepPhysics(state, {pressing, dt, nowMs}, ...)` 형태 권장 — 레퍼런스 743~781행의 수식(초당 힘 +1.75, 크랙 시 ×0.50, 비압착 시 -4.2/s, give -4.0/s, squash 보간 dt·20, 최소 파괴 간격 45ms)을 따른다.
- `DeformState`는 Worker B의 `addDent`를 import해 쓴다 (B 파일 수정은 금지, import만).

테스트: 냉동 임계 < 상온 임계, 캐스케이드 단계 순서(큰 판 우선, 비어야 다음 단계), 크랙 후 저항 급락·시간 경과 회복, 왁스 전멸 시 이벤트 0, integrity 단조감소, 같은 rng → 같은 이벤트 목록.
주의: B가 아직 없으면 `addDent` 호출부는 컴파일이 안 되므로, C 테스트는 B 완료 후 실행하거나 fracture의 dent 위임을 콜백 파라미터(`onDent: (dir, depth, rad) => void`)로 받아 B 의존을 끊는다. **콜백 방식을 권장** — 그러면 C는 B 없이 독립 완결된다.

## Worker D — 사운드

소유: `src/audio/crackSounds.ts`, `src/audio/sounds.ts`, `src/audio/AudioManager.ts`, `src/audio/useSound.ts`. 레퍼런스 598~643, 804~807행.

- `playCrack(ctx, dest, event: CrackEvent, cond: {integrity, temp}, rng)`: 노이즈 버퍼 → bandpass(중심 `(4600-3250·size)·(1+0.34·cold)·(1+0.42·wear)`, 1.25배→0.62배 하강 스윕, Q `1.0+3.4·size`) → highpass 240Hz, 지속 `(0.014+0.072·size)·(1-0.20·cold)`s, 볼륨 `(0.16+0.50·size)·(0.35+0.65·integrity)·(1+0.22·cold)`. `size > 0.45`면 triangle 바디 톤(150+90·size → 58Hz) 추가.
- `playCrackCluster(...events)`: 한 압착의 이벤트들을 delayMs대로 흩어 재생(빠자작). 루프 금지.
- rub 루프: lowpass 노이즈(260Hz), `setRubbing(force)` → gain `0.030·min(force,1.2)`, 컷오프 `180+230·force`, `setTargetAtTime` 0.06.
- 기존 `fractureSounds`/`FracturePlayer`(sounds.ts), `AudioManager.playFracture`, `useSound.playFracture`는 새 API로 교체. `waxFracture.ts` import를 모두 끊고 `waxTypes.ts`의 `CrackEvent`를 쓴다.
- 기존 SoundSet(slime/keycap 등)과 `play(name)` 경로는 유지.

테스트 없음(IO 셸). `tsc --noEmit`만. 주의: 기존 `sounds.ts`가 `waxFracture.ts`를 import 중 — 이 참조 제거가 이 워커 몫이다.

## Worker E — 지오메트리 빌더

소유: `src/three/waxGeometry.ts`. 레퍼런스 421~541행.

- `createWaxBuffers(triCount)`: position/normal/color Float32Array(각 triCount·9)와 BufferGeometry 어태치.
- `updateWax(shell, field: DeformField, buffers)`: 셀마다
  - 그룹 수축 `s1 = 1-c1·0.035`, 셀 수축 `s2 = (1-c2·0.075)·(1-wear·0.34)`, `rigid = min(1,c2)`, 두께 `TH·(1-wear·0.55)`
  - 접선 프레임 → 중심/모서리/변중점/반경중점 정점(변중점은 방향 공간에서 계산 — 이웃과 맞물림)
  - `shardVert`: 구면 투영 위치(field.smooth 따라감)와 평면 강체판 위치를 `rigid`로 lerp
  - 바깥면 4분할 + 안쪽면 + 옆면(WAX_DEEP 어두운 단면), 회전 `ph=rot·c2·0.55`, sink 반영
  - 남은 버퍼 0 채움, needsUpdate, computeBoundingSphere
- `normalAt(d, fn, out)`: 유한차분 법선 (e=0.035)
- `updateSoftMesh(geo, base, fn, radius)`: 클레이/고무막 정점 변위 + computeVertexNormals
- `field`는 `waxTypes.ts`의 `DeformField` 인터페이스로만 받는다. B 구현 import 금지.

테스트 없음(렌더 셸). `tsc --noEmit`만.

## Worker F — HUD

소유: `src/components/PhysicsPanel.tsx`, `src/components/PhysicsPanel.css`, `src/components/Controls.tsx`, `src/components/Controls.css`. 레퍼런스 29~51, 74~97, 710~739행.

- `PhysicsPanel({ snapshot, history })`: `PhysicsSnapshot`으로 integrity/force·threshold/plastic/temp(°C 환산 `-18+40·temp`)/cracks/shards 바 + 힘 곡선 canvas 그래프(150 샘플, 임계 점선, 크랙 세로선). 기본 숨김.
- `Controls`: 기존 음량·크기 슬라이더 유지 + 냉동실(클릭 시 90초 동안 "해동 중" 라벨), 자동 회전 토글, 물성 패널 토글, 새 왁뿌볼 버튼. 이모지 없이.
- 콜백 프로퍼티는 부모가 배선: `onFreeze`, `onToggleSpin`, `onTogglePanel`, `onNew`, `spinOn`, `panelOn`.
- history는 `{ force: number, cracked: boolean }[]`를 프로퍼티로 받는다(직접 계산하지 않음).

테스트 없음(프레젠테이션). `tsc --noEmit`만.

## Wave 2 — 통합 (워커 전원 완료 후 단독)

소유: `src/three/WaxBall.tsx`(신규), `src/three/BallScene.tsx`, `src/pages/SmashPage.tsx`, `src/pages/MainPage.tsx`, `src/pages/MinglePage.tsx`.

- `WaxBall.tsx`: 클레이(SphereGeometry 80×54, 반경 0.940, `#e0405c` clearcoat 0.30)/왁스(BufferGeometry, vertexColors, clearcoat 0.55, DoubleSide)/고무막(반경 1.030, opacity 0.13, clearcoat 1.0, depthWrite false) + 입력 상태기계(`idle → undecided → rotate|press`, 홀드 190ms 초과 press 확정, 공 밖은 즉시 rotate, undecided에서 9px 이상 이동 시 rotate) + 프레임 루프(force 적분 → fracture → c1/c2 보간(dt·9, dt·7) → 변화 시에만 메시 갱신 → 회전 관성 0.94 감쇠/자동 회전 dt·0.16).
- `BallScene.tsx`: 캔버스 환경맵(그라디언트+소프트박스 2 → PMREMGenerator), hemisphere/key/fill/rim 라이트, ACESFilmicToneMapping(노출 1.05), 종횡비 기반 카메라 거리 `max(1.55/t, 1.18/(t·aspect))`.
- 세 페이지 배선. `onSmash` = integrity < 0.06 진입 시 1회 — 점메추·밍글 추첨 트리거 유지.
- 삭제: `three/waxFracture.ts`, `three/waxFracture.test.ts`, `three/Ball.tsx`. `SmashEffect.tsx`/`pastel.ts`/`Background.tsx`는 미사용이면 정리.
- 최종: `tsc --noEmit` + `vitest run` 전체 통과.
