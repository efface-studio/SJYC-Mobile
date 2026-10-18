/**
 * 로그인 후 이동 경로(next 파라미터) 검증 — 오픈 리다이렉트 방지.
 * 같은 출처의 내부 경로만 허용하고, 그 외에는 fallback 으로 보낸다.
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target) return fallback;
  if (!target.startsWith('/')) return fallback;
  // "//evil.com", "/\evil.com" 은 브라우저가 외부 출처로 해석한다
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback;
  // 제어문자·역슬래시가 섞인 경로는 브라우저별 해석이 달라 거부한다
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\\]/.test(target)) return fallback;
  try {
    const url = new URL(target, 'http://internal.invalid');
    if (url.origin !== 'http://internal.invalid') return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

/** 일반 회원 로그인 흐름에서 관리자 경로로 보내지 않는다 — 관리자는 /admin/login 에서 서버 권한 확인 후 진입한다. */
export function memberRedirect(target: string | null | undefined): string {
  const path = safeRedirect(target, '/my');
  return path === '/admin' || path.startsWith('/admin/') ? '/my' : path;
}
