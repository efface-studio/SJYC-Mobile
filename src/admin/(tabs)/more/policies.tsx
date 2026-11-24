import { openScreen } from '~/shared/navigation';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { POLICY_TITLE } from '@/domain/labels';
import { formatDate, formatDateTime } from '@/lib/format';
import { NoPermission, Rows, StatusBadge, useCan } from '~/admin-kit/components';
import { policiesQuery } from '~/admin-kit/queries';
import { Gutter, ListRow, QueryBoundary, Screen, Txt, space } from '~/ds';

/** 이용약관·개인정보처리방침 등 — 센터가 확정한 문안만 게시한다 */
export default function Policies() {
  const allowed = useCan()('policy.manage');
  const docs = useQuery({ ...policiesQuery, enabled: allowed });

  return (
    <>
      <Stack.Screen options={{ title: '정책 문서' }} />
      {allowed ? (
        <Screen onRefresh={() => docs.refetch()}>
          <Gutter style={{ paddingTop: space.sm, paddingBottom: space.md }}>
            <Txt variant="caption" color="textTertiary">
              센터가 확정한 문안만 게시하세요. 개정본은 게시 즉시 사용자 화면에 반영됩니다.
            </Txt>
          </Gutter>
          <QueryBoundary
            query={docs}
            isEmpty={(d) => d.length === 0}
            empty={{ title: '정책 문서가 없습니다' }}
          >
            {(list) => (
              <Rows
                items={list}
                rowKey={(d) => d.key}
                render={(d) => (
                  <ListRow
                    meta={`시행일 ${d.effectiveAt ? formatDate(d.effectiveAt) : '없음'}`}
                    title={POLICY_TITLE[d.key]}
                    subtitle={`최종 수정 ${formatDateTime(d.updatedAt)}`}
                    trailing={
                      <StatusBadge
                        {...(d.confirmed
                          ? { text: '확정', tone: 'success' as const }
                          : { text: '확정본 미등록', tone: 'warning' as const })}
                      />
                    }
                    onPress={() => openScreen({ pathname: '/more/policy/[key]', params: { key: d.key } })}
                  />
                )}
              />
            )}
          </QueryBoundary>
        </Screen>
      ) : (
        <NoPermission />
      )}
    </>
  );
}
