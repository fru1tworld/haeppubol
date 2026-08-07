import { CanvasTexture, SRGBColorSpace } from 'three'

// 왁뿌볼 속에 비치는 당첨 결과 라벨. 캔버스에 글자를 굽고 텍스처로 쓴다.

const W = 768
const H = 384
const PAD = 48
const MAX_FONT = 132
const MIN_FONT = 44
const LINE_H = 1.22

const FONT = (px: number) =>
  `700 ${px}px Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

/** 한글은 단어 경계가 드물어 글자 단위로도 자른다 */
const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    const next = line + ch
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = ch === ' ' ? '' : ch
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/** 글자가 상자 안에 들어가는 가장 큰 폰트를 고른다 */
const fit = (ctx: CanvasRenderingContext2D, text: string): { font: number; lines: string[] } => {
  for (let px = MAX_FONT; px >= MIN_FONT; px -= 6) {
    ctx.font = FONT(px)
    const lines = wrap(ctx, text, W - PAD * 2)
    if (lines.length * px * LINE_H <= H - PAD * 2) return { font: px, lines }
  }
  ctx.font = FONT(MIN_FONT)
  return { font: MIN_FONT, lines: wrap(ctx, text, W - PAD * 2).slice(0, 4) }
}

/** 투명 배경에 글자만 있는 텍스처. 쓰는 쪽에서 dispose 한다 */
export const makeLabelTexture = (text: string): CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const { font, lines } = fit(ctx, text)
  ctx.font = FONT(font)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const step = font * LINE_H
  const top = H / 2 - ((lines.length - 1) * step) / 2

  // 어떤 속 색 위에서도 읽히도록 흰 글자 + 어두운 외곽선
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
  ctx.shadowBlur = 22
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(6, font * 0.14)
  ctx.strokeStyle = 'rgba(24, 12, 18, 0.85)'
  lines.forEach((l, i) => ctx.strokeText(l, W / 2, top + i * step))
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffffff'
  lines.forEach((l, i) => ctx.fillText(l, W / 2, top + i * step))

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

export const LABEL_ASPECT = W / H
