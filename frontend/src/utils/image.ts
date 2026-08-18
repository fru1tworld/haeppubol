/**
 * 업로드 사진을 data URL로 변환. 원본(폰 카메라 수 MB)을 그대로 저장하면
 * localStorage 5MB 쿼터를 넘겨 저장이 터지므로 긴 변을 maxDim으로 줄여 JPEG로 압축한다.
 */
export const fileToDataUrl = (file: File, maxDim = 1024): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 읽을 수 없습니다'))
    }
    img.src = url
  })

/** 쿼터 초과 등으로 localStorage 저장이 터져도 앱이 죽지 않게 한다 */
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
