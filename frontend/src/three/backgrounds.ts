export interface BackgroundTheme {
  id: string
  label: string
  gradient: string
  dotColors: string[]
  dotOpacity: number
  light: boolean
}

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    id: 'peach',
    label: '포트원 피치',
    gradient: 'linear-gradient(180deg, #FFF9F4 0%, #FDE8D8 100%)',
    dotColors: ['#E8A97E', '#F5C6A0', '#C9B4A3'],
    dotOpacity: 0.5,
    light: true,
  },
  {
    id: 'mono',
    label: '모노',
    gradient: 'linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 100%)',
    dotColors: ['#111827', '#9CA3AF', '#D1D5DB'],
    dotOpacity: 0.3,
    light: true,
  },
  {
    id: 'charcoal',
    label: '차콜',
    gradient: 'linear-gradient(180deg, #1C1C1C 0%, #000000 100%)',
    dotColors: ['#F5C6A0', '#FDE8D8', '#4B5563'],
    dotOpacity: 0.5,
    light: false,
  },
]

export const DEFAULT_BACKGROUND = 'peach'

export const isBackgroundId = (v: string): boolean =>
  BACKGROUND_THEMES.some(t => t.id === v)

export const getBackgroundTheme = (id?: string): BackgroundTheme =>
  BACKGROUND_THEMES.find(t => t.id === id)
  ?? BACKGROUND_THEMES.find(t => t.id === DEFAULT_BACKGROUND)!
