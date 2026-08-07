// 밍글 선정 룰. 5인 이상 모인 팀이 신청하고, 매달 2팀이 뽑힌다.

/** 매달 뽑는 팀 수 */
export const PICK_COUNT = 2

/** 후보에서 최대 n개를 겹치지 않게 뽑는다 */
export const pickSome = (
  pool: readonly string[],
  n: number,
  rng: () => number = Math.random,
): string[] => {
  const rest = [...pool]
  const picked: string[] = []
  while (picked.length < n && rest.length > 0) {
    picked.push(...rest.splice(Math.floor(rng() * rest.length), 1))
  }
  return picked
}
