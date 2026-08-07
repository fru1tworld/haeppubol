export type SoundName = 'smash' | 'pop' | 'reveal' | 'click' | 'toggle' | 'reset'

export type SoundPlayer = (ctx: AudioContext, destination: AudioNode, pitch: number) => void

const createWhiteNoise = (ctx: AudioContext, duration: number): AudioBufferSourceNode => {
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  return source
}

const smash: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime

  const noise = createWhiteNoise(ctx, 0.06)
  noise.playbackRate.value = pitch
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.4, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
  noise.connect(noiseGain).connect(destination)
  noise.start(now)
  noise.stop(now + 0.06)

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(100 * pitch, now)
  osc.frequency.exponentialRampToValueAtTime(40 * pitch, now + 0.08)
  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(0.3, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
  osc.connect(oscGain).connect(destination)
  osc.start(now)
  osc.stop(now + 0.08)
}

const pop: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800 * pitch, now)
  osc.frequency.exponentialRampToValueAtTime(400 * pitch, now + 0.05)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.3, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
  osc.connect(gain).connect(destination)
  osc.start(now)
  osc.stop(now + 0.05)
}

const reveal: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  const notes = [523, 659, 784]
  notes.forEach((freq, i) => {
    const start = now + i * 0.06
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * pitch, start)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.25, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06)
    osc.connect(gain).connect(destination)
    osc.start(start)
    osc.stop(start + 0.06)
  })
}

const click: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1000 * pitch, now)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02)
  osc.connect(gain).connect(destination)
  osc.start(now)
  osc.stop(now + 0.02)
}

const toggle: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  const notes = [523, 784]
  notes.forEach((freq, i) => {
    const start = now + i * 0.04
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * pitch, start)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.25, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.04)
    osc.connect(gain).connect(destination)
    osc.start(start)
    osc.stop(start + 0.04)
  })
}

const reset: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(784 * pitch, now)
  osc.frequency.exponentialRampToValueAtTime(262 * pitch, now + 0.2)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  osc.connect(gain).connect(destination)
  osc.start(now)
  osc.stop(now + 0.2)
}

export const sounds: Record<SoundName, SoundPlayer> = {
  smash,
  pop,
  reveal,
  click,
  toggle,
  reset,
}
