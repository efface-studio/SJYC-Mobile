import { Platform, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLogout, useSession } from '@/features/auth/session';
import { api, errorMessage } from '@/api';
import type { DevLocation, DevRow, DevSection, DevView } from '@/domain/developer-console';
import { Badge, Divider, SwitchRow, Tap, Txt, useTheme } from '~/ds';
import { Icon } from '~/shared/icon';
import { confirm, notify } from '~/shared/dialogs';

const mono = { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 0 };
type Go = (location: DevLocation) => void;
export function DevHeading({ title }: { title: string }) {
  return (
    <Txt accessibilityRole="header" variant="label" color="textSecondary" style={styles.heading}>
      {title}
    </Txt>
  );
}
export function ControlRows({ go }: { go: Go }) {
  const userId = useSession().data?.user.id;
  const cache = useQueryClient(),
    query = useQuery({
      queryKey: ['admin', 'dev-console', 'operations', userId, true, 'settings', '', 0],
      queryFn: () => api.admin.developerView({ section: 'operations', item: 'settings' }),
    });
  const form = query.data?.forms?.find((f) => f.command === 'save-controls');
  const controls = useMutation({
    mutationFn: (values: Record<string, string>) =>
      api.admin.developerAction({ command: 'save-controls', version: form?.version, values }),
    onSettled: () => cache.invalidateQueries({ queryKey: ['admin', 'dev-console', 'operations'] }),
    onError: (e) => notify('설정을 저장하지 못했습니다', errorMessage(e)),
  });
  if (!form?.fields)
    return (
      <Txt variant="label" color="textSecondary" style={styles.heading}>
        {query.isError ? '설정을 불러오지 못했습니다.' : '접수 설정 불러오는 중…'}
      </Txt>
    );
  const values = Object.fromEntries(form.fields.map((f) => [f.key, f.value]));
  const options = form.fields.find((f) => f.key === 'disabled')?.options ?? [];
  async function save(label: string, next: Record<string, string>) {
    if (
      !controls.isPending &&
      (await confirm({ title: label, message: '변경한 접수 정책을 즉시 적용할까요?', confirmLabel: '적용' }))
    )
      controls.mutate(next);
  }
  return (
    <>
      <DevHeading title="유지보수 모드" />
      <View style={styles.inset}>
        <SwitchRow
          label="유지보수 모드"
          description={values.maintenance === 'true' ? '활성 · 접수 점검 중' : '비활성'}
          value={values.maintenance === 'true'}
          disabled={controls.isPending}
          onValueChange={(on) => void save('유지보수 모드 변경', { ...values, maintenance: String(on) })}
        />
      </View>
      <ListItem
        row={{
          title: '메시지·대상 편집',
          detail: values.message,
          next: { section: 'operations', item: 'settings' },
        }}
        go={go}
      />
      <DevHeading title="기능별 접수" />
      {options.map((opt) => (
        <View style={styles.inset} key={opt.value}>
          <SwitchRow
            label={opt.label}
            value={!(values.disabled ?? '').split(',').includes(opt.value)}
            disabled={controls.isPending}
            onValueChange={(on) =>
              void save(opt.label, {
                ...values,
                disabled: [
                  ...(values.disabled ?? '').split(',').filter((v) => v && v !== opt.value),
                  ...(on ? [] : [opt.value]),
                ].join(','),
              })
            }
          />
        </View>
      ))}
    </>
  );
}
function ListItem({
  row,
  go,
  leading,
  tag,
  code = false,
}: {
  row: DevRow;
  go: Go;
  leading?: React.ReactNode;
  tag?: string;
  code?: boolean;
}) {
  const t = useTheme();
  const inner = (
    <>
      {leading}
      <View style={styles.grow}>
        <Txt variant="label">{row.title}</Txt>
        {!!row.detail && (
          <Txt variant="caption" color="textSecondary" style={code ? mono : undefined}>
            {row.detail}
          </Txt>
        )}
      </View>
      {tag && <Badge text={tag} />}
      {row.value && (
        <Txt
          variant="caption"
          color={
            row.value === '정상'
              ? t.tone.success.fg
              : row.value === '연결 오류'
                ? t.tone.danger.fg
                : t.textSecondary
          }
          style={[styles.value, code && mono]}
        >
          {row.value}
        </Txt>
      )}
      {row.next && <Icon ios="chevron.right" android="chevron_right" size={14} color={t.lineStrong} />}
    </>
  );
  return row.next ? (
    <Tap accessibilityLabel={row.title} onPress={() => go(row.next!)} style={styles.row}>
      {inner}
    </Tap>
  ) : (
    <View style={styles.row}>{inner}</View>
  );
}
function SessionRow({ row, go }: { row: DevRow; go: Go }) {
  const t = useTheme(),
    id = row.next?.item,
    cache = useQueryClient(),
    me = useSession(),
    logout = useLogout();
  const revoke = useMutation({
    mutationFn: () => api.admin.developerAction({ command: 'revoke', id }),
    onSuccess: () => {
      if (me.data?.user.id === id) logout.mutate();
      else void cache.invalidateQueries({ queryKey: ['admin', 'dev-console', 'security'] });
    },
    onError: (e) => notify('세션을 종료하지 못했습니다', errorMessage(e)),
  });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 16 }}>
      <View style={{ flex: 1 }}>
        <ListItem
          row={row}
          go={go}
          leading={
            <View style={[styles.avatar, { backgroundColor: t.bgSubtle }]}>
              <Txt variant="label">{row.title.slice(0, 1)}</Txt>
            </View>
          }
        />
      </View>
      <Tap
        accessibilityLabel={row.title + ' 모든 기기 로그아웃'}
        disabled={!id || revoke.isPending}
        style={{ minHeight: 44, justifyContent: 'center' }}
        onPress={async () => {
          if (
            id &&
            !revoke.isPending &&
            (await confirm({
              title: '세션을 강제 종료할까요?',
              message: row.title + ' 계정이 모든 기기에서 로그아웃됩니다.',
              confirmLabel: '강제 로그아웃',
              destructive: true,
            }))
          )
            revoke.mutate();
        }}
      >
        <Txt variant="label" color={t.tone.danger.fg}>
          {revoke.isPending ? '종료 중' : '로그아웃'}
        </Txt>
      </Tap>
    </View>
  );
}
function ServerLine({ row, go }: { row: DevRow; go: Go }) {
  const t = useTheme(),
    split = row.title.indexOf(' '),
    [at, duration] = row.detail?.split(' · ') ?? [],
    status = Number(row.value);
  return (
    <Tap
      accessibilityLabel={[row.title, row.value].join(', ')}
      style={styles.log}
      onPress={row.next ? () => go(row.next!) : undefined}
    >
      <View style={styles.line}>
        <Txt variant="caption" style={mono} color="textTertiary">
          {at}
        </Txt>
        <Txt variant="caption" style={mono}>
          {row.title.slice(0, split)}
        </Txt>
        <View style={{ flex: 1 }} />
        <Txt
          variant="caption"
          style={mono}
          color={status >= 500 ? t.tone.danger.fg : status >= 400 ? t.tone.warning.fg : t.tone.success.fg}
        >
          {row.value}
        </Txt>
        <Txt variant="caption" style={mono} color="textTertiary">
          {duration}
        </Txt>
      </View>
      <Txt variant="caption" style={mono}>
        {row.title.slice(split + 1)}
      </Txt>
    </Tap>
  );
}
export function DevGroups({
  section,
  item,
  view,
  go,
  filter = '',
  writable,
}: {
  writable: boolean;
  section: DevSection;
  item: string;
  view: DevView;
  go: Go;
  filter?: string;
}) {
  const t = useTheme();
  return (
    <>
      {view.groups.map((group) => {
        const systemStats = section === 'system' && group.title === '사용량';
        const sessions = section === 'security' && !item,
          sysRoles = section === 'permissions' && !item && group.title === '기본 역할';
        if (writable && section === 'operations' && !item && group.title === '접수 제어')
          return <ControlRows go={go} key={group.title} />;
        const rows = group.rows.filter(
          (r) =>
            (r.next?.item !== 'new' || section !== 'permissions') &&
            (!filter ||
              [r.title, r.detail, r.next?.item].some((v) => v?.toLowerCase().includes(filter.toLowerCase()))),
        );
        return (
          <View key={group.title}>
            <DevHeading
              title={
                group.title +
                (sessions
                  ? ' · 15초마다 갱신'
                  : section === 'system' && group.title === '연결 상태'
                    ? ' · 10초마다 갱신'
                    : '')
              }
            />
            {systemStats ? (
              <View style={styles.grid}>
                {rows.map((r, i) => (
                  <View
                    key={r.title}
                    style={[styles.cell, { borderColor: t.line }, i % 2 === 1 && styles.right]}
                  >
                    <Txt variant="caption" color="textSecondary">
                      {r.title}
                    </Txt>
                    <Txt variant="title1">{r.value}</Txt>
                  </View>
                ))}
              </View>
            ) : (
              rows.map((r, i) => (
                <View key={r.next?.item ?? r.title + i}>
                  {i > 0 && <Divider inset={sessions ? 68 : 16} />}
                  {sessions && writable ? (
                    <SessionRow row={r} go={go} />
                  ) : section === 'logs' && (item === 'requests' || item === 'errors') ? (
                    <ServerLine row={r} go={go} />
                  ) : (
                    <ListItem
                      row={r}
                      go={go}
                      code={section === 'logs' || (section === 'permissions' && !!item)}
                      tag={sysRoles ? '시스템' : undefined}
                    />
                  )}
                </View>
              ))
            )}
            {!rows.length && (
              <Txt variant="caption" color="textTertiary" style={styles.inset}>
                표시할 내역이 없습니다.
              </Txt>
            )}
          </View>
        );
      })}
    </>
  );
}
const styles = StyleSheet.create({
  heading: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 6 },
  inset: { paddingHorizontal: 16 },
  grow: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  value: { maxWidth: '50%', textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  cell: { width: '50%', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12, gap: 2 },
  right: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  log: { paddingHorizontal: 16, paddingVertical: 8, gap: 2, minHeight: 44 },
  line: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
});
