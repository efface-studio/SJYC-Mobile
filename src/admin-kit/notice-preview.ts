import { openScreen } from '~/shared/navigation';
import type { QueryClient } from '@tanstack/react-query';

import type { NoticeCategory } from '@/domain/types';

/** 저장 전 공지 미리보기 값 — 본문을 URL 에 싣지 않도록 쿼리 캐시로 넘긴다 */
export interface NoticePreviewValues {
  title: string;
  category: NoticeCategory;
  body: string;
  publishedAt: string | null;
}

export const NOTICE_PREVIEW_KEY = ['notice-preview'] as const;

export function openNoticePreview(qc: QueryClient, values: NoticePreviewValues): void {
  qc.setQueryData(NOTICE_PREVIEW_KEY, values);
  openScreen('/notice-preview');
}
