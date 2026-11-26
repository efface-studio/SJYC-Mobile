import type { Permission } from './permissions';
import type { Role } from './types';

export interface AppUpdate {
  id: string;
  flavor: 'user' | 'admin';
  platform: 'ios' | 'android';
  channel: 'production' | 'preview';
  runtime: string;
  message: string;
  createdAt: string;
  kind: 'UPDATE' | 'ROLLBACK';
  status: 'ACTIVE' | 'ROLLED_BACK';
  assetCount: number;
  rolloutPercent: number;
  live: boolean;
  manual?: boolean;
  planVersion?: number;
  waves?: DistributionWave[];
  seen: number;
  running: number;
}

export type UpdateControl =
  { action: 'rollout'; percent: number } | { action: 'rollback'; target: 'previous' | 'embedded' };

export type SplashOptions = { percent: boolean; bar: boolean; notes: boolean };
export const defaultSplash: SplashOptions = { percent: true, bar: true, notes: true };
export interface PublicationSettings {
  automatic: boolean;
  splash: SplashOptions;
  version: number;
}
export type Audience =
  | { kind: 'everyone' }
  | { kind: 'users'; emails: string[] }
  | { kind: 'role'; role: Role }
  | { kind: 'permission'; permission: Permission };
export interface DistributionWave {
  id: string;
  at: string;
  label: string;
  count: number;
  everyone: boolean;
  percent: number;
  state: 'active' | 'scheduled' | 'cancelled' | 'rolledBack';
}
export type WaveAction =
  | { action: 'publish'; scope: Audience; percent: number; at?: string; version: number }
  | { action: 'undo' | 'cancel'; waveId: string; version: number };
export const waveStateLabels = {
  active: '배포 중',
  scheduled: '예약',
  cancelled: '예약 취소',
  rolledBack: '되돌림',
};
export function scheduledTime(value: string) {
  if (!value.trim()) return undefined;
  const local = value.trim().replace(' ', 'T');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
    throw new Error('예약 일시를 연-월-일 시:분으로 입력해 주세요.');
  const date = new Date(local + ':00+09:00');
  if (
    !Number.isFinite(date.getTime()) ||
    date.getTime() <= Date.now() ||
    new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 16) !== local
  )
    throw new Error('올바른 미래의 한국시간을 선택해 주세요.');
  return date.toISOString();
}
