import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createStartupUpdates } from '../src/shared/ota-startup.ts';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture(replace = {}, timing = {}) {
  const frames = [];
  let reloads = 0, listener;
  const native = {
    check: async () => ({ cached: false, notes: '- 알림 설정 UI 개선' }),
    download: async () => true,
    subscribeProgress: (fn) => { listener = fn; return () => { listener = undefined; }; },
    reload: async () => { reloads++; },
    ...replace,
  };
  return {
    controller: createStartupUpdates(async () => native, (frame) => frames.push(frame),
      { check: 200, download: 200, applied: 0, ...timing }),
    frames, progress: (value) => listener?.(value), reloads: () => reloads,
  };
}

test('첫 실행에서 다운로드 상태를 표시하고 한 번만 자동 적용한다', async () => {
  const fetch = deferred();
  const f = fixture({ download: () => fetch.promise });
  const work = f.controller.enter();
  await delay(0);
  await f.controller.enter();
  for (const fraction of [0.08, 0.76, 0.30, 1]) f.progress(fraction);
  assert.deepEqual(f.frames.map(v => v?.percent), [undefined, 0, 8, 76, 99]);
  fetch.resolve(true);
  await work;
  assert.equal(f.frames.at(-1).percent, 100);
  assert.equal(f.reloads(), 1);
});

test('백그라운드에서는 적용을 미루고 복귀할 때 같은 다운로드를 이어간다', async () => {
  const fetch = deferred();
  let calls = 0;
  const f = fixture({ download: () => { calls++; return fetch.promise; } });
  const cold = f.controller.enter();
  await delay(0);
  f.controller.background();
  const warm = f.controller.enter();
  await delay(0);
  fetch.resolve(true);
  await Promise.all([cold, warm]);
  assert.equal(calls, 1);
  assert.equal(f.reloads(), 1);
});

test('캐시된 업데이트는 다운로드 없이 적용하고 이미 최신이면 바로 진입한다', async () => {
  let pass = 0;
  const f = fixture({ check: async () => ++pass === 1 ? null : { cached: true, notes: '' },
    download: () => assert.fail('캐시 다운로드 중복') });
  await f.controller.enter();
  assert.equal(f.frames.at(-1), null);
  f.controller.background();
  await f.controller.enter();
  assert.equal(f.reloads(), 1);
});

test('오프라인 확인 시간 초과 후 뒤늦은 응답으로 사용 중인 화면을 재시작하지 않는다', async () => {
  const check = deferred();
  const f = fixture({ check: () => check.promise }, { check: 8 });
  await f.controller.enter();
  check.resolve({ cached: true, notes: '' });
  await delay(5);
  assert.equal(f.frames.at(-1), null);
  assert.equal(f.reloads(), 0);
});

test('다운로드 실패 시 이전 버전으로 진행하거나 재시도할 수 있다', async () => {
  let pass = 0;
  const f = fixture({ download: async () => { if (++pass === 1) throw Error('network'); return true; } });
  await f.controller.enter();
  assert.equal(f.frames.at(-1).phase, 'error');
  f.controller.skip();
  assert.equal(f.frames.at(-1), null);
  await f.controller.enter(true);
  assert.equal(f.reloads(), 1);
});

test('업데이트 적용 직전에 백그라운드로 가면 복귀 후에만 재시작한다', async () => {
  const f = fixture({ check: async () => ({ cached: true, notes: '' }) }, { applied: 20 });
  const work = f.controller.enter();
  await delay(4);
  f.controller.background();
  await work;
  assert.equal(f.reloads(), 0);
  await f.controller.enter();
  assert.equal(f.reloads(), 1);
});
