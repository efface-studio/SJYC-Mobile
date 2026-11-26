import { useAppColorScheme } from '~/shared/appearance';
import { createContext, useContext } from 'react';
import type { Tone } from '@/domain/labels';

export const CENTER_RED = '#E41D25';
const USER_ACTION = '#B51E28';

const light = {
  bg: '#FFFEFC',
  bgSubtle: '#F5F1EB',
  card: '#FFFFFF',
  text: '#242120',
  textSecondary: '#514944',
  textTertiary: '#685F59',
  line: '#E8E1DA',
  lineStrong: '#91857A',
  action: USER_ACTION,
  actionText: USER_ACTION,
  onAction: '#FFFFFF',
  brand: CENTER_RED,
  brandSoft: '#FFF3C6',
  pressed: 'rgba(0,0,0,0.05)',
  overlay: 'rgba(0,0,0,0.4)',
  tone: {
    neutral: { fg: '#514944', bg: '#F5F5F5' },
    brand: { fg: USER_ACTION, fill: USER_ACTION, bg: '#FFF3C6' },
    success: { fg: '#1D6B2F', bg: '#EAF6EC' },
    danger: { fg: '#B42318', bg: '#FDECEB' },
    warning: { fg: '#7A4D00', bg: '#FFF6DD' },
    info: { fg: '#1F5FA8', bg: '#EAF2FB' },
  } satisfies Record<Tone, { fg: string; bg: string; fill?: string }>,
};

type Palette = typeof light;

const dark: Palette = {
  bg: '#1A1716',
  bgSubtle: '#25211F',
  card: '#25211F',
  text: '#F2F2F2',
  textSecondary: '#C8C8C8',
  textTertiary: '#A6A6A6',
  line: '#333333',
  lineStrong: '#555555',
  action: USER_ACTION,
  actionText: '#F2F2F2',
  onAction: light.onAction,
  brand: CENTER_RED,
  brandSoft: '#4A2426',
  pressed: 'rgba(255,255,255,0.08)',
  overlay: 'rgba(0,0,0,0.6)',
  tone: {
    neutral: { fg: '#C8C8C8', bg: '#2A2A2A' },
    brand: { fg: '#F2F2F2', fill: USER_ACTION, bg: '#4A2426' },
    success: { fg: '#8FD49C', bg: '#16301C' },
    danger: { fg: '#F2B8B5', bg: '#3B1715' },
    warning: { fg: '#F5C46B', bg: '#382A0E' },
    info: { fg: '#A8C7FA', bg: '#152A45' },
  },
};

function adminPalette(base: Palette, night: boolean): Palette {
  const action = night ? '#EEEEEE' : '#59418C';
  const soft = night ? '#2C2C2C' : '#F0ECF6';
  return {
    ...base,
    action,
    actionText: action,
    onAction: night ? '#161616' : base.onAction,
    brand: action,
    brandSoft: soft,
    bg: night ? '#101010' : '#FFFFFF',
    bgSubtle: night ? '#191919' : '#F2F3F5',
    card: night ? '#242424' : '#FFFFFF',
    text: night ? '#F5F5F5' : '#202126',
    textSecondary: night ? '#D0D0D0' : '#434448',
    textTertiary: night ? '#ACACAC' : '#62646C',
    line: night ? '#363636' : '#E2E3E6',
    lineStrong: night ? '#808080' : '#8E8499',
    tone: { ...base.tone, brand: { fg: night ? '#A783DC' : action, fill: night ? '#A783DC' : action, bg: night ? '#30263F' : soft } },
  };
}
const staffLight = adminPalette(light, false);
const staffDark = adminPalette(dark, true);

export type Theme = Palette;
export const ThemeAudience = createContext<'user' | 'admin'>('user');

export function useTheme(): Theme {
  const night = useAppColorScheme() === 'dark';
  return useContext(ThemeAudience) === 'admin' ? (night ? staffDark : staffLight) : night ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, sheet: 24 } as const;
/** 화면 좌우 여백 */
export const GUTTER = 20;
