import { useEffect, useRef, useState } from 'react'

const FREEZE_MS = 90_000

/** 냉동실 버튼 상태. freeze()가 freezeKey를 올리고 90초 뒤 해동 표시를 끈다 */
export const useFreeze = () => {
  const [frozen, setFrozen] = useState(false)
  const [freezeKey, setFreezeKey] = useState(0)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const freeze = () => {
    setFreezeKey(k => k + 1)
    setFrozen(true)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setFrozen(false), FREEZE_MS)
  }

  const unfreeze = () => {
    window.clearTimeout(timerRef.current)
    setFrozen(false)
  }

  return { frozen, freezeKey, freeze, unfreeze }
}
