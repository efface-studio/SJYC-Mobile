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
  seen: number;
  running: number;
}

export type UpdateControl =
  { action: 'rollout'; percent: number } | { action: 'rollback'; target: 'previous' | 'embedded' };
