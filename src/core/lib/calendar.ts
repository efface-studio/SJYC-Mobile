import type { Program } from '@/domain/types';
import { toDateInput } from './format';

/**
 * 달력용 순수 날짜 도우미 — 날짜는 서울 기준 'YYYY-MM-DD', 월은 'YYYY-MM' 문자열로 다룬다.
 * 시간대 영향을 받지 않도록 내부 계산은 UTC 자정으로만 한다.
 */

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string | null | undefined): value is string {
  return !!value && MONTH_RE.test(value);
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

function parseMonth(month: string): [number, number] {
  const [y, m] = month.split('-').map(Number);
  return [y!, m!];
}

/** 'YYYY-MM' 에서 n개월 이동 */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = parseMonth(month);
  return ymd(new Date(Date.UTC(y, m - 1 + n, 1))).slice(0, 7);
}

/** 일요일 시작 주 단위 격자. 앞뒤 달 날짜로 채워 항상 7일씩 끊는다. */
export function monthGrid(month: string): string[][] {
  const [y, m] = parseMonth(month);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const weeks: string[][] = [];
  for (let i = 0; i < cells; i++) {
    if (i % 7 === 0) weeks.push([]);
    weeks.at(-1)!.push(ymd(new Date(Date.UTC(y, m - 1, 1 - lead + i))));
  }
  return weeks;
}

export interface DayPrograms {
  /** 이 날 모집이 마감되는 프로그램 */
  deadline: Program[];
  /** 운영 기간(시작일~종료일)에 이 날이 포함되는 프로그램 */
  running: Program[];
}

export function programsOn(date: string, programs: Program[]): DayPrograms {
  return {
    deadline: programs.filter((p) => toDateInput(p.recruitEndsAt) === date),
    running: programs.filter((p) => toDateInput(p.startsAt) <= date && date <= toDateInput(p.endsAt)),
  };
}
