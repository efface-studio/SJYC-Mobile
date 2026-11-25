import { z } from 'zod';

export const earliestBirthDate = '1920-01-01';

export function birthDateError(date: string, today: string) {
  if (!date) return '생년월일을 선택해 주세요.';
  if (!z.iso.date().safeParse(date).success || date < earliestBirthDate) return '생년월일을 확인해 주세요.';
  if (date > today) return '미래 날짜는 선택할 수 없습니다.';
}

export const passwordRules = [
  { label: '8~64자', test: (value: string) => value.length >= 8 && value.length <= 64 },
  { label: '영문 포함', test: (value: string) => /[A-Za-z]/.test(value) },
  { label: '숫자 포함', test: (value: string) => /\d/.test(value) },
];

export function confirmFeedback(password: string, confirmation: string) {
  if (!confirmation) return;
  if (password === confirmation) return '일치합니다.';
  if (confirmation.length >= password.length) return '비밀번호가 일치하지 않습니다.';
}
