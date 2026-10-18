import { createSeed, type MockDb } from './seed';

/**
 * mock 저장소 — 브라우저 sessionStorage 에만 저장되는 개발용 상태.
 * 탭을 닫으면 사라지며, 실제 저장·인증이 아니다.
 */
const DB_KEY = 'sjyc.mock.db.v8';
const SESSION_KEY = 'sjyc.mock.session.v1';
const SCENARIO_KEY = 'sjyc.mock.scenario.v1';

export type Scenario = 'normal' | 'slow' | 'empty' | 'error';

export interface MockSession {
  userId: string;
  expiresAt: string;
}

const SESSION_TTL_MS = 60 * 60 * 1000;

let memoryDb: MockDb | null = null;

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** React Native(앱)에는 sessionStorage 가 없다 — 앱 실행 중에만 유지되는 메모리 저장소로 대신한다 */
const memoryStore: KeyValueStore = (() => {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
})();

function storage(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined') return null; // 서버 렌더링 중에는 저장하지 않는다
    return window.sessionStorage ?? memoryStore;
  } catch {
    return memoryStore;
  }
}

export function loadDb(): MockDb {
  if (memoryDb) return memoryDb;
  const raw = storage()?.getItem(DB_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed.version === 8) return (memoryDb = parsed);
    } catch {
      // 손상된 값은 버리고 시드로 다시 시작
    }
  }
  memoryDb = createSeed();
  saveDb(memoryDb);
  return memoryDb;
}

export function saveDb(db: MockDb): void {
  memoryDb = db;
  storage()?.setItem(DB_KEY, JSON.stringify(db));
}

/** 개발자 도구: 현재 mock 데이터를 JSON 으로 내보낸다 */
export function exportDb(): string {
  return JSON.stringify(loadDb(), null, 2);
}

/** 개발자 도구: 내보낸 JSON 을 불러온다. 버전·구조가 다르면 거부하고 기존 데이터를 유지한다. */
export function importDb(json: string): void {
  const parsed: unknown = JSON.parse(json);
  const fresh = createSeed();
  const ok =
    typeof parsed === 'object' &&
    parsed !== null &&
    (parsed as { version?: unknown }).version === fresh.version &&
    Object.entries(fresh).every(
      ([k, v]) => Array.isArray(v) === Array.isArray((parsed as Record<string, unknown>)[k]),
    );
  if (!ok) throw new Error(`mock 데이터 형식이 맞지 않습니다 (버전 ${fresh.version} 이 필요합니다).`);
  saveDb(parsed as MockDb);
}

export function resetDb(): void {
  memoryDb = null;
  storage()?.removeItem(DB_KEY);
  storage()?.removeItem(SESSION_KEY);
}

export function readSession(): MockSession | null {
  const raw = storage()?.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockSession;
  } catch {
    return null;
  }
}

export function writeSession(userId: string | null): MockSession | null {
  if (!userId) {
    storage()?.removeItem(SESSION_KEY);
    return null;
  }
  const session = { userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() };
  storage()?.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** 개발 패널: 세션 만료 재현 */
export function expireSession(): void {
  const s = readSession();
  if (s) storage()?.setItem(SESSION_KEY, JSON.stringify({ ...s, expiresAt: new Date(0).toISOString() }));
}

export function readScenario(): Scenario {
  const v = storage()?.getItem(SCENARIO_KEY);
  return v === 'slow' || v === 'empty' || v === 'error' ? v : 'normal';
}

export function writeScenario(s: Scenario): void {
  storage()?.setItem(SCENARIO_KEY, s);
}
