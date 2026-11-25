import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionAccess } from '../src/shared/session-access.ts';

test('재확인 응답이 오기 전에는 만료 시각만으로 로그인 화면으로 이동하지 않는다', () => {
  const expiry = new Date(10000).toISOString();
  assert.equal(sessionAccess(expiry, false, false, 10000), 'checking');
  assert.equal(sessionAccess(expiry, false, true, 10000), 'error');
  assert.equal(sessionAccess(undefined, true, false, 10001), 'guest');
});
test('네트워크 오류가 발생하면 유효한 세션만 기존 화면에 머무른다', () => {
  assert.equal(sessionAccess(new Date(10000).toISOString(), false, true, 9000), 'signed-in');
  assert.equal(sessionAccess(undefined, false, true, 9000), 'error');
});
