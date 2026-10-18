import { useColorScheme } from 'react-native';
import type { Tone } from '@/domain/labels';

/**
 * 모바일 디자인 토큰 — 웹(docs/design-system.md)과 같은 브랜드 규칙.
 * action(버튼·링크·강조 텍스트)은 AA 대비를 만족하는 색, brand(#F6891F)는 장식·채움 전용.
 */
const light = {
  bg: '#FFFFFF',
  bgSubtle: '#F4F5F7',
  card: '#FFFFFF',
  text: '#222222',
  textSecondary: '#444444',
  textTertiary: '#595959',
  line: '#DDDDDD',
  lineStrong: '#BBBBBB',
  action: '#B35400',
  onAction: '#FFFFFF',
  brand: '#F6891F',
  brandSoft: '#FFF3E6',
  pressed: 'rgba(0,0,0,0.05)',
  overlay: 'rgba(0,0,0,0.4)',
  tone: {
    neutral: { fg: '#444444', bg: '#F5F5F5' },
    brand: { fg: '#B35400', bg: '#FFF3E6' },
    success: { fg: '#1D6B2F', bg: '#EAF6EC' },
    danger: { fg: '#B42318', bg: '#FDECEB' },
    warning: { fg: '#7A4D00', bg: '#FFF6DD' },
    info: { fg: '#1F5FA8', bg: '#EAF2FB' },
  } satisfies Record<Tone, { fg: string; bg: string }>,
};

type Palette = typeof light;

const dark: Palette = {
  bg: '#111113',
  bgSubtle: '#1C1C1F',
  card: '#1C1C1F',
  text: '#F2F2F2',
  textSecondary: '#C8C8C8',
  textTertiary: '#A6A6A6',
  line: '#333333',
  lineStrong: '#555555',
  action: '#FF9B3D',
  onAction: '#222222',
  brand: '#F6891F',
  brandSoft: '#3A2410',
  pressed: 'rgba(255,255,255,0.08)',
  overlay: 'rgba(0,0,0,0.6)',
  tone: {
    neutral: { fg: '#C8C8C8', bg: '#2A2A2A' },
    brand: { fg: '#FFB066', bg: '#3A2410' },
    success: { fg: '#8FD49C', bg: '#16301C' },
    danger: { fg: '#F2B8B5', bg: '#3B1715' },
    warning: { fg: '#F5C46B', bg: '#382A0E' },
    info: { fg: '#A8C7FA', bg: '#152A45' },
  },
};

export type Theme = Palette;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
/** 웹과 같은 반경 — 구획은 둥근 카드 대신 선과 여백. sheet 는 하단 시트 상단 모서리 전용 */
export const radius = { sm: 2, md: 4, lg: 6, sheet: 12 } as const;
/** 화면 좌우 여백 */
export const GUTTER = 20;
