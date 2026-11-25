import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/api';
import {
  developerSections,
  type DevSection,
  type DevForm,
  type DevLocation,
} from '@/domain/developer-console';
import { useLogout, useSession } from '@/features/auth/session';
import { NoPermission, useCan } from '~/admin-kit/components';
import {
  Button,
  FormSection,
  Gutter,
  ListRow,
  QueryBoundary,
  Screen,
  SectionHeader,
  SelectField,
  SwitchRow,
  TextField,
  Txt,
  space,
} from '~/ds';
import { confirm, notify } from '~/shared/dialogs';
import { openScreen } from '~/shared/navigation';

function ActionForm({ form, done }: { form: DevForm; done: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((form.fields ?? []).map((f) => [f.key, f.value])),
  );
  const set = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const action = useMutation({
    mutationFn: () =>
      api.admin.developerAction({ command: form.command, id: form.id, version: form.version, values }),
    onSuccess: done,
    onError: (e) => notify('적용하지 못했습니다', errorMessage(e)),
  });
  return (
    <FormSection>
      {form.fields?.map((f) => {
        const v = values[f.key] ?? '';
        if (f.multiple && f.options)
          return (
            <View key={f.key}>
              <Txt variant="captionStrong">{f.label}</Txt>
              {f.options.map((o) => (
                <SwitchRow
                  key={o.value}
                  label={o.label}
                  value={v.split(',').includes(o.value)}
                  onValueChange={(on) =>
                    set(
                      f.key,
                      [...v.split(',').filter((x) => x && x !== o.value), ...(on ? [o.value] : [])].join(','),
                    )
                  }
                />
              ))}
            </View>
          );
        return f.options ? (
          <SelectField
            key={f.key}
            label={f.label}
            value={v}
            options={f.options}
            onChange={(s) => set(f.key, s)}
          />
        ) : (
          <TextField key={f.key} label={f.label} value={v} onChangeText={(s) => set(f.key, s)} />
        );
      })}
      <Button
        label={form.label}
        variant={form.destructive ? 'danger' : 'primary'}
        loading={action.isPending}
        onPress={async () => {
          if (
            !action.isPending &&
            (await confirm({
              title: form.label,
              message: form.message,
              confirmLabel: '확인',
              destructive: form.destructive,
            }))
          )
            action.mutate();
        }}
      />
    </FormSection>
  );
}

export default function DeveloperDetail() {
  const params = useLocalSearchParams<{ section: string; entry: string; search?: string }>();
  const allowed = useCan()('developer.access'),
    focused = useIsFocused();
  const section = Object.hasOwn(developerSections, params.section)
    ? (params.section as DevSection)
    : undefined;
  const item = params.entry === 'overview' ? '' : (params.entry ?? '').replace('~', '/');
  const [page, setPage] = useState(0),
    [search, setSearch] = useState(params.search ?? ''),
    [draft, setDraft] = useState(search);
  const cache = useQueryClient(),
    session = useSession(),
    logout = useLogout();
  const query = useQuery({
    queryKey: ['admin', 'dev-console', section, item, search, page],
    enabled: allowed && !!section,
    queryFn: () => api.admin.developerView({ section: section!, item, search, page }),
    refetchInterval: (q) => (focused ? (q.state.data?.interval ?? false) : false),
  });
  const go = (loc: DevLocation) =>
    openScreen({
      pathname: '/more/dev/[section]/[entry]',
      params: {
        section: loc.section,
        entry: loc.item?.replace('/', '~') || 'overview',
        ...(loc.search ? { search: loc.search } : {}),
      },
    });
  if (!allowed || !section) return <NoPermission />;
  return (
    <>
      <Stack.Screen options={{ title: query.data?.title ?? developerSections[section] }} />
      <Screen onRefresh={() => query.refetch()}>
        <QueryBoundary layout="settings" query={query}>
          {(view) => (
            <>
              {view.searchLabel && (
                <Gutter style={{ paddingVertical: space.md }}>
                  <TextField
                    label={view.searchLabel}
                    value={draft}
                    onChangeText={setDraft}
                    returnKeyType="search"
                    onSubmitEditing={() => {
                      setPage(0);
                      setSearch(draft.trim());
                    }}
                  />
                  <Button
                    label="검색"
                    size="md"
                    variant="text"
                    onPress={() => {
                      setPage(0);
                      setSearch(draft.trim());
                    }}
                  />
                </Gutter>
              )}
              {view.groups.map((group) => (
                <View key={group.title}>
                  <SectionHeader title={group.title} />
                  {group.rows.length ? (
                    group.rows.map((row, i) =>
                      !row.next ? (
                        <Gutter key={i} style={{ paddingVertical: space.md, gap: space.xs }}>
                          <Txt variant="bodyStrong">{row.title}</Txt>
                          {row.detail && (
                            <Txt color="textSecondary">
                              {row.detail}
                            </Txt>
                          )}
                          {row.value && <Txt variant="captionStrong">{row.value}</Txt>}
                        </Gutter>
                      ) : (
                        <ListRow
                          key={i}
                          title={row.title}
                          subtitle={row.detail}
                          numberOfLines={4}
                          trailing={row.value ? <Txt variant="captionStrong">{row.value}</Txt> : undefined}
                          onPress={row.next ? () => go(row.next!) : undefined}
                        />
                      ),
                    )
                  ) : (
                    <Gutter>
                      <Txt color="textSecondary">표시할 내역이 없습니다.</Txt>
                    </Gutter>
                  )}
                </View>
              ))}
              {view.forms?.map((f) => (
                <ActionForm
                  key={[item, f.command, f.version].join('/')}
                  form={f}
                  done={() => {
                    if (f.command === 'revoke' && session.data?.user.id === f.id) {
                      logout.mutate();
                      return;
                    }
                    if (
                      f.command === 'delete-role' ||
                      f.command === 'revoke' ||
                      (f.command === 'save-role' && !f.id)
                    )
                      router.back();
                    void cache.invalidateQueries({ queryKey: ['admin', 'dev-console'] });
                    notify('적용했습니다');
                  }}
                />
              ))}
              {(page > 0 || view.hasMore) && (
                <Gutter>
                  <Button
                    label="이전"
                    variant="text"
                    disabled={page === 0}
                    onPress={() => setPage((n) => n - 1)}
                  />
                  <Button
                    label="다음"
                    variant="text"
                    disabled={!view.hasMore}
                    onPress={() => setPage((n) => n + 1)}
                  />
                </Gutter>
              )}
            </>
          )}
        </QueryBoundary>
      </Screen>
    </>
  );
}
