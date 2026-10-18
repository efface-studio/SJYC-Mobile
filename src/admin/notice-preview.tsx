import { useQueryClient } from '@tanstack/react-query';
import { NOTICE_CATEGORY_LABEL } from '@/domain/labels';
import { formatDateTime } from '@/lib/format';
import { DetailHeader, ScreenMessage } from '~/admin-kit/components';
import { NOTICE_PREVIEW_KEY, type NoticePreviewValues } from '~/admin-kit/notice-preview';
import { Divider, Gutter, Screen, Txt, space } from '~/ds';

/** 사용자 앱 공지 상세와 같은 구성으로 저장 전 내용을 보여준다 */
export default function NoticePreview() {
  const v = useQueryClient().getQueryData<NoticePreviewValues>(NOTICE_PREVIEW_KEY);
  if (!v) return <ScreenMessage title="미리볼 내용이 없습니다" />;
  return (
    <Screen>
      <DetailHeader
        meta={`공지사항 · ${NOTICE_CATEGORY_LABEL[v.category]}`}
        title={v.title || '(제목 없음)'}
        caption={v.publishedAt ? formatDateTime(v.publishedAt) : '저장 전 내용입니다'}
      />
      <Gutter>
        <Divider />
      </Gutter>
      <Gutter style={{ paddingTop: space.xl }}>
        <Txt variant="body">{v.body || '(본문 없음)'}</Txt>
      </Gutter>
    </Screen>
  );
}
