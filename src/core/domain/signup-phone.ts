export interface SignupPhoneState {
  phone: string;
  verificationMode: 'sms' | 'preview';
  resendAt: string;
  expiresAt: string;
}
