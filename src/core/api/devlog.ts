import { ApiError } from './errors';

/**
 * API 요청 로그 — 개발자 도구에서 보는 최근 호출 기록 (메모리에만, 최근 200건).
 * 요청 인자·응답 본문은 개인정보가 담길 수 있어 기록하지 않고 메서드 이름·시간·결과만 남긴다.
 * DOM 에 의존하지 않아 모바일 앱에서도 같이 쓴다.
 */
export interface ApiLogEntry {
  id: number;
  at: string;
  /** 예: admin.members.list */
  method: string;
  durationMs: number;
  ok: boolean;
  /** 실패 시 ApiError 코드 또는 오류 이름 */
  error?: string;
}

const MAX_ENTRIES = 200;
let entries: ApiLogEntry[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function push(entry: Omit<ApiLogEntry, 'id'>) {
  entries = [{ ...entry, id: ++seq }, ...entries].slice(0, MAX_ENTRIES);
  listeners.forEach((l) => l());
}

export const apiLog = {
  /** 최신순 */
  entries: (): readonly ApiLogEntry[] => entries,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  clear(): void {
    entries = [];
    listeners.forEach((l) => l());
  },
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** 객체 안의 모든 비동기 메서드 호출을 기록하는 래퍼 (중첩 객체 포함) */
export function withLogging<T extends object>(target: T, prefix = ''): T {
  const cache = new Map<PropertyKey, unknown>();
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value: unknown = Reflect.get(obj, prop, receiver);
      if (typeof prop === 'symbol' || value === null) return value;
      if (cache.has(prop)) return cache.get(prop);
      const name = prefix ? `${prefix}.${prop}` : prop;
      let wrapped: unknown = value;
      if (typeof value === 'function') {
        wrapped = (...args: unknown[]) => {
          const start = now();
          const at = new Date().toISOString();
          const result: unknown = (value as (...a: unknown[]) => unknown).apply(obj, args);
          if (!(result instanceof Promise)) return result;
          return result.then(
            (data) => {
              push({ at, method: name, durationMs: Math.round(now() - start), ok: true });
              return data;
            },
            (error: unknown) => {
              push({
                at,
                method: name,
                durationMs: Math.round(now() - start),
                ok: false,
                error: error instanceof ApiError ? error.code : error instanceof Error ? error.name : 'Error',
              });
              throw error;
            },
          );
        };
      } else if (typeof value === 'object') {
        wrapped = withLogging(value as object, name);
      }
      cache.set(prop, wrapped);
      return wrapped;
    },
  });
}
