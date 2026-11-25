import type { OAuthProvider } from './types';

export interface SocialAccounts {
  linked: OAuthProvider[];
  available: OAuthProvider[];
  hasPassword: boolean;
}
export interface LoginDevice {
  id: string;
  label: string;
  current: boolean;
  createdAt: string;
  expiresAt: string;
}
