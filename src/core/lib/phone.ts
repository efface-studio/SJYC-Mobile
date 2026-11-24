/** 국내 휴대전화 입력을 부분 입력 상태에서도 표시한다. 지원하지 않는 번호는 검증 단계로 넘긴다. */
export function formatMobilePhone(value: string) {
  const domestic = value.trim().replace(/^\+82[\s()-]*0?(?=1)/, '0');
  if (!/^[\d\s()-]*$/.test(domestic)) return value;
  const digits = domestic.replace(/\D/g, '');
  if (!digits.startsWith('01') || digits.length < 4 || digits.length > 11) return domestic;
  if (digits.length <= 6) return digits.slice(0, 3) + '-' + digits.slice(3);
  const middleEnd = digits.length === 11 ? 7 : 6;
  return [digits.slice(0, 3), digits.slice(3, middleEnd), digits.slice(middleEnd)].filter(Boolean).join('-');
}

/** 하이픈 바로 다음에서 지우기를 눌러도 같은 구분 기호에 커서가 걸리지 않게 한다. */
export function editMobilePhone(previous: string, next: string) {
  if (previous.length === next.length + 1 && previous.replace(/-/g, '') === next.replace(/-/g, '')) {
    let index = 0;
    while (index < next.length && next[index] === previous[index]) index++;
    if (previous[index] === '-' && index > 0) return formatMobilePhone(next.slice(0, index - 1) + next.slice(index));
  }
  return formatMobilePhone(next);
}
