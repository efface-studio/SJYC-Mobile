import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api, errorMessage } from '@/api';
import type { Decision } from '@/api/client';
import { parseValues, rejectReasonSchema } from '@/domain/schemas';
import type { BulkResult, Page, ProgramApplication } from '@/domain/types';
import { confirm, notify, promptText } from '~/shared/dialogs';
import { useInvalidateAdmin } from './queries';

/**
 * 승인/반려 대상: 프로그램 신청(일괄 가능) · 공간 예약 · 동아리 가입 신청(직원) ·
 * 담당 동아리 가입 신청(담당자 — id 는 `동아리ID:신청ID`)
 */
export type DecisionKind = 'application' | 'reservation' | 'club' | 'managed';

const KINDS: readonly DecisionKind[] = ['application', 'reservation', 'club', 'managed'];

export function isDecisionKind(value: unknown): value is DecisionKind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value);
}

export const APPROVE_LABEL: Record<DecisionKind, string> = {
  application: '승인',
  reservation: '확정',
  club: '승인',
  managed: '승인',
};

/** 프로그램 신청은 일괄 API, 나머지는 단건 API — 결과는 모두 BulkResult 로 맞춘다 */
export async function submitDecision(
  kind: DecisionKind,
  ids: string[],
  decision: Decision,
  reason: string | null,
): Promise<BulkResult> {
  if (kind === 'application') return api.admin.applications.decide(ids, decision, reason);
  for (const id of ids) {
    if (kind === 'reservation') await api.admin.spaces.decideReservation(id, decision, reason);
    else if (kind === 'managed') {
      const [clubId = '', applicationId = ''] = id.split(':');
      await api.manage.decideApplication(clubId, applicationId, decision, reason);
    } else await api.admin.clubs.decideApplication(id, decision, reason);
  }
  return { succeeded: ids, failed: [] };
}

/** 캐시된 신청 목록에서 "신청자 · 프로그램" 이름을 찾는다 (실패 사유 안내용) */
function nameFrom(qc: QueryClient): (id: string) => string {
  const items = qc
    .getQueriesData<Page<ProgramApplication>>({ queryKey: ['admin', 'applications'] })
    .flatMap(([, page]) => page?.items ?? []);
  return (id) => {
    const a = items.find((x) => x.id === id);
    return a ? `${a.applicantName} · ${a.programTitle}` : id;
  };
}

/** 처리 결과 안내 — 단건 성공은 화면 갱신으로 충분하므로 알리지 않는다 */
export function reportResult(result: BulkResult, qc: QueryClient): void {
  const ok = result.succeeded.length;
  const failed = result.failed;
  if (failed.length === 0) {
    if (ok > 1) notify(`${ok}건을 처리했습니다`);
    return;
  }
  if (ok + failed.length === 1) {
    notify('처리하지 못했습니다', failed[0]?.reason);
    return;
  }
  const nameOf = nameFrom(qc);
  notify(
    `성공 ${ok}건 / 실패 ${failed.length}건`,
    failed.map((f) => `${nameOf(f.id)}: ${f.reason}`).join('\n'),
  );
}

/**
 * 승인(확인 다이얼로그) / 반려(사유 입력) 흐름.
 * 반려 사유: iOS 는 Alert.prompt, Android 는 기본 입력 다이얼로그가 없어 입력 화면(decision/[kind]/[ids])을 띄운다.
 */
export function useDecision(kind: DecisionKind, opts: { onDone?: () => void } = {}) {
  const qc = useQueryClient();
  const invalidate = useInvalidateAdmin();
  const mutation = useMutation({
    mutationFn: (v: { ids: string[]; decision: Decision; reason: string | null }) =>
      submitDecision(kind, v.ids, v.decision, v.reason),
    onSuccess: async (result) => {
      reportResult(result, qc);
      opts.onDone?.();
      await invalidate();
    },
    onError: (e) => notify('처리하지 못했습니다', errorMessage(e)),
  });

  const approve = async (ids: string[], summary: string, askFirst = true): Promise<void> => {
    const label = APPROVE_LABEL[kind];
    const bulk = ids.length > 1;
    const ok =
      !askFirst ||
      (await confirm({
        title: bulk ? `선택한 ${ids.length}건을 ${label}할까요?` : `${label}할까요?`,
        message: bulk
          ? '승인 결과는 신청자 화면에 바로 표시됩니다. 접수 상태가 아닌 신청은 처리되지 않고 실패로 안내됩니다.'
          : summary,
        confirmLabel: bulk ? `${ids.length}건 ${label}` : label,
      }));
    if (ok) mutation.mutate({ ids, decision: 'approved', reason: null });
  };

  const reject = async (ids: string[]): Promise<void> => {
    const bulk = ids.length > 1;
    const prompt = promptText(
      bulk ? `선택한 ${ids.length}건을 반려할까요?` : '반려 사유',
      bulk
        ? '같은 반려 사유가 선택한 모든 신청자에게 안내됩니다.'
        : '신청자에게 안내되는 사유를 입력해 주세요.',
      '반려',
    );
    if (!prompt) {
      router.push({ pathname: '/decision/[kind]/[ids]', params: { kind, ids: ids.join(',') } });
      opts.onDone?.();
      return;
    }
    const reason = await prompt;
    if (reason === null) return;
    const parsed = parseValues(rejectReasonSchema, { reason });
    if (!parsed.ok) {
      notify('반려 사유를 확인해 주세요', parsed.errors.reason);
      return;
    }
    mutation.mutate({ ids, decision: 'rejected', reason: parsed.data.reason });
  };

  return { approve, reject, busy: mutation.isPending };
}
