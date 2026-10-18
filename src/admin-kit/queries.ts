import {
  keepPreviousData,
  queryOptions,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api';
import type { Page } from '@/domain/types';

/** 관리자 앱의 모든 쿼리 키는 ['admin', ...] 로 시작한다 — 변경 후 한 번에 무효화한다 */
export const ADMIN_KEY = ['admin'] as const;

export const dashboardQuery = (days: number) =>
  queryOptions({ queryKey: ['admin', 'dashboard', days], queryFn: () => api.admin.dashboard(days) });

/** FAQ·정책 문서는 목록 API 만 있어 편집 화면도 목록에서 찾는다 (목록과 캐시 공유) */
export const faqsQuery = queryOptions({ queryKey: ['admin', 'faqs'], queryFn: () => api.admin.faqs.list() });
export const policiesQuery = queryOptions({
  queryKey: ['admin', 'policies'],
  queryFn: () => api.admin.policies.list(),
});

/** 처리·저장 후 목록과 대시보드 카운트를 함께 갱신한다 */
export function useInvalidateAdmin(): () => Promise<void> {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ADMIN_KEY });
}

const PAGE_STEP = 30;

export interface Paged<T> {
  query: UseQueryResult<Page<T>>;
  more: () => void;
}

/**
 * "더 보기" 목록 — 페이지 크기를 늘려 다시 받는다.
 * ponytail: 수백 건 이상 쌓이면 useInfiniteQuery(page 증가)로 바꾼다.
 */
export function usePaged<T>(
  key: readonly unknown[],
  fetch: (pageSize: number) => Promise<Page<T>>,
  enabled = true,
): Paged<T> {
  const [limit, setLimit] = useState(PAGE_STEP);
  const query = useQuery({
    queryKey: [...key, limit],
    queryFn: () => fetch(limit),
    placeholderData: keepPreviousData,
    enabled,
  });
  return { query, more: () => setLimit((n) => n + PAGE_STEP) };
}

/** 칩·선택 필드 선택지 (디자인 시스템 Chips/SelectField 와 같은 모양) */
export interface Option<V extends string> {
  value: V;
  label: string;
}

/** 상태 라벨 맵 → 필터 선택지 ('' = 전체) */
export function statusOptions<K extends string>(labels: Record<K, { text: string }>): Option<K | ''>[] {
  const keys = Object.keys(labels) as K[];
  return [{ value: '', label: '전체' }, ...keys.map((k) => ({ value: k, label: labels[k].text }))];
}

export type Sort = 'newest' | 'oldest' | 'title';

/** 웹 관리자와 같은 정렬 선택지 — 세 번째 라벨만 목록마다 다르다 (제목순·이름순·동아리명순) */
export function sortOptions(titleLabel = '제목순', newest = '최신순', oldest = '오래된 순'): Option<Sort>[] {
  return [
    { value: 'newest', label: newest },
    { value: 'oldest', label: oldest },
    { value: 'title', label: titleLabel },
  ];
}

/**
 * 목록 필터를 라우트 파라미터로 둔다 — 대시보드가 `?status=pending` 처럼 조건을 넘겨 열 수 있다.
 * 파라미터가 없으면 fallback, 'all' 이면 전체('').
 */
export function useParamFilter<V extends string>(
  name: string,
  allowed: readonly V[],
  fallback: V | '',
): [V | '', (value: V | '') => void] {
  const param = useLocalSearchParams()[name];
  const raw = Array.isArray(param) ? param[0] : param;
  const value = raw === 'all' ? '' : (allowed.find((v) => v === raw) ?? fallback);
  return [value, (next) => router.setParams({ [name]: next || 'all' })];
}

/** 상태 라벨 맵을 쓰는 상태 필터 (파라미터 이름 'status') */
export function useStatusParam<K extends string>(
  labels: Record<K, { text: string }>,
  fallback: K | '',
): [K | '', (value: K | '') => void, Option<K | ''>[]] {
  const [value, set] = useParamFilter('status', Object.keys(labels) as K[], fallback);
  return [value, set, statusOptions(labels)];
}
