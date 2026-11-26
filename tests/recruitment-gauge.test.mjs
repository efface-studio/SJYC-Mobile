import assert from 'node:assert/strict';
import test from 'node:test';
import { recruitmentGauge } from '../src/user-kit/recruitment-gauge.ts';

test('정원이 있는 프로그램만 신청률을 표시하고 실제로 구간을 넘었을 때 색을 바꾼다', () => {
  for (const [applied, expected] of [
    [0, 'info'],
    [49, 'info'],
    [50, 'warning'],
    [79, 'warning'],
    [80, 'danger'],
    [100, 'danger'],
  ]) {
    assert.deepEqual(recruitmentGauge(applied, 100), { percent: applied, tone: expected });
  }
  assert.equal(recruitmentGauge(999, 1000).percent, 99);
  assert.equal(recruitmentGauge(25, 20).percent, 100);
  assert.equal(recruitmentGauge(0, 0), null);
});
