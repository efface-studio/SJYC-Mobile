export interface SocialDraft {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  verifiedEmail: string | null;
  needsConsent: boolean;
  previewCode: boolean;
}

export interface SocialDetails {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  code?: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
}
