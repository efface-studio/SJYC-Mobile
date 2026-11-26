import { useLiveSearch } from '~/shared/live-search';
import { openScreen } from '~/shared/navigation';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { APPLICATION_STATUS } from '@/domain/labels';
import type { ProgramApplication } from '@/domain/types';
import { formatDateTime } from '@/lib/format';
import {
  ButtonPair,
  FilterChip,
  HeaderButton,
  NoPermission,
  PagedList,
  StatusBadge,
  searchBar,
  useCan,
} from '~/admin-kit/components';
import { useDecision } from '~/admin-kit/decision';
import { sortOptions, usePaged, useStatusParam, type Option, type Sort } from '~/admin-kit/queries';
import { Button, Chips, GUTTER, ListRow, StickyFooter, Tap, Txt, space, useTheme } from '~/ds';
import { Icon } from '~/shared/icon';

const SORTS = sortOptions('프로그램명순');

/** 신청 목록의 프로그램 필터 선택지 — 제목순 최대 200개 (웹과 같은 조회) */
function useProgramOptions(enabled: boolean, current: string): Option<string>[] {
  const programs = useQuery({
    queryKey: ['admin', 'programs', { sort: 'title', pageSize: 200 }],
    queryFn: () => api.admin.programs.list({ sort: 'title', pageSize: 200 }),
    staleTime: 60_000,
    enabled,
  });
  const items = programs.data?.items.map((p) => ({ value: p.id, label: p.title })) ?? [];
  // 목록을 불러오기 전에도 파라미터로 받은 프로그램이 선택돼 보이도록
  const missing =
    current && !items.some((o) => o.value === current) ? [{ value: current, label: '선택한 프로그램' }] : [];
  return [{ value: '', label: '전체 프로그램' }, ...missing, ...items];
}

/** 일괄 처리는 접수 상태 신청만 대상이다 */
const selectable = (a: ProgramApplication) => a.status === 'submitted';

export default function Applications() {
  const t = useTheme();
  const allowed = useCan()('application.decide');
  const [status, setStatus, statusOpts] = useStatusParam(APPLICATION_STATUS, 'submitted');
  const programId = useLocalSearchParams<{ programId?: string }>().programId ?? '';
  const programOpts = useProgramOptions(allowed, programId);
  const [q, setQ] = useLiveSearch();
  const [sort, setSort] = useState<Sort>('newest');
  const filters = { q: q || undefined, status: status || undefined, programId: programId || undefined, sort };
  const paged = usePaged(
    ['admin', 'applications', filters],
    (pageSize) => api.admin.applications.list({ ...filters, pageSize }),
    allowed,
  );

  // 일괄 처리 선택 — 선택은 현재 조건에만 유효하다 (조건이 바뀌면 비운다)
  const listKey = JSON.stringify(filters);
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<{ key: string; ids: string[] }>({ key: listKey, ids: [] });
  const selected = sel.key === listKey ? sel.ids : [];
  const setSelected = (ids: string[]) => setSel({ key: listKey, ids });
  const stopSelecting = () => {
    setSelected([]);
    setSelecting(false);
  };
  const decision = useDecision('application', { onDone: stopSelecting });
  const items: ProgramApplication[] = paged.query.data?.items ?? [];
  const candidates = items.filter(selectable).map((a) => a.id);
  const allSelected = candidates.length > 0 && candidates.every((id) => selected.includes(id));
  const toggle = (id: string) =>
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const none = selected.length === 0;

  if (!allowed) {
    return (
      <>
        <Stack.Screen options={{ title: '프로그램 신청' }} />
        <NoPermission />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '프로그램 신청',
          headerSearchBarOptions: searchBar('신청자, 프로그램, 접수 번호', setQ),
          headerRight: () => (
            <HeaderButton
              label={selecting ? '완료' : '선택'}
              onPress={() => (selecting ? stopSelecting() : setSelecting(true))}
            />
          ),
        }}
      />
      <PagedList
        paged={paged}
        chips={<Chips options={statusOpts} value={status} onChange={setStatus} />}
        tools={
          <>
            <FilterChip
              title="프로그램"
              value={programId}
              options={programOpts}
              onChange={(v) => router.setParams({ programId: v })}
            />
            <FilterChip title="정렬" value={sort} options={SORTS} onChange={setSort} />
          </>
        }
        below={
          selecting ? (
            <View style={[styles.selectBar, { backgroundColor: t.brandSoft }]}>
              <Txt variant="captionStrong" color="action">
                {none ? '처리할 신청을 선택하세요' : `${selected.length}건 선택됨`}
              </Txt>
              <Tap
                onPress={() => setSelected(allSelected ? [] : candidates)}
                disabled={candidates.length === 0}
                style={{ paddingVertical: space.sm, paddingLeft: space.md }}
              >
                <Txt variant="captionStrong" color={candidates.length === 0 ? 'textTertiary' : 'action'}>
                  {allSelected ? '선택 해제' : '접수 건 모두 선택'}
                </Txt>
              </Tap>
            </View>
          ) : undefined
        }
        footer={
          selecting ? (
            <StickyFooter>
              <ButtonPair
                left={
                  <Button
                    label={none ? '반려' : `${selected.length}건 반려`}
                    variant="danger"
                    disabled={none || decision.busy}
                    onPress={() => void decision.reject(selected)}
                  />
                }
                right={
                  <Button
                    label={none ? '승인' : `${selected.length}건 승인`}
                    disabled={none}
                    loading={decision.busy}
                    onPress={() => void decision.approve(selected, `${selected.length}건`)}
                  />
                }
              />
            </StickyFooter>
          ) : undefined
        }
        emptyText="조건에 맞는 신청이 없습니다"
        renderRow={(a) => {
          const row = {
            meta: `${a.programTitle} · ${a.receiptNo ?? '접수 번호 미발급'}`,
            title: a.applicantName,
            subtitle: formatDateTime(a.createdAt) + (a.contentEdits?.length ? ' · 요청 사항 (수정됨)' : ''),
            trailing: <StatusBadge {...APPLICATION_STATUS[a.status]} />,
          };
          if (!selecting) {
            return (
              <ListRow
                {...row}
                onPress={() => openScreen({ pathname: '/applications/[id]', params: { id: a.id } })}
              />
            );
          }
          const on = selected.includes(a.id);
          const can = selectable(a);
          return (
            <ListRow
              {...row}
              chevron={false}
              leading={
                <View style={{ opacity: can ? 1 : 0.3 }}>
                  <Icon
                    ios={on ? 'checkmark.circle.fill' : 'circle'}
                    android={on ? 'check_circle' : 'radio_button_unchecked'}
                    color={on ? t.action : t.lineStrong}
                    size={24}
                  />
                </View>
              }
              onPress={can ? () => toggle(a.id) : undefined}
            />
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    minHeight: 44,
  },
});
