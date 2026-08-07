import { useEffect } from 'react'

/**
 * 볼을 부수는 동안은 상단 헤더를 접고 화면을 넓게 쓴다.
 * 앱 껍데기(App.css)가 body의 클래스를 보고 레이아웃을 바꾼다.
 */
export const useImmersive = (on: boolean): void => {
  useEffect(() => {
    if (!on) return
    document.body.classList.add('immersive')
    return () => document.body.classList.remove('immersive')
  }, [on])
}
