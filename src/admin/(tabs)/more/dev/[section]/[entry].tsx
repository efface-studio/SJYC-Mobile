import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Segmented } from '~/admin-kit/developer/segmented';
import { DevGroups } from '~/admin-kit/developer/rows';
import { devHref } from '~/admin-kit/developer/menu';
import { Icon } from '~/shared/icon';
import { AppState, View, Pressable } from 'react-native';
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
  useTheme,
  QueryBoundary,
  Screen,
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
  const can = useCan();
  const allowed = can('developer.view'),
    writable = can('developer.access'),
    focused = useIsFocused();
  const section = Object.hasOwn(developerSections, params.section)
    ? (params.section as DevSection)
    : undefined;
  const entry = params.entry === 'overview' ? '' : (params.entry ?? '').replace('~', '/');
  const mainLogs = section === 'logs' && !entry;
  const [logPanel, setPanel] = useState<'requests' | 'audit'>('requests');
  const item = mainLogs ? logPanel : entry;
  const [page, setPage] = useState(0),
    [search, setSearch] = useState(params.search ?? ''),
    [draft, setDraft] = useState(params.search ?? '');
  const [appState, setAppState] = useState(AppState.currentState);
  const t = useTheme();
  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(draft.trim());
      setPage(0);
    }, 220);
    return () => clearTimeout(timer);
  }, [draft]);
  const roleList = section === 'permissions' && !item;
  const cache = useQueryClient(),
    session = useSession(),
    logout = useLogout();
  const query = useQuery({
    queryKey: ['admin', 'dev-console', section, session.data?.user.id, writable, item, search, page],
    enabled: allowed && !!section && focused,
    queryFn: () =>
      api.admin.developerView({ section: section!, item, search: roleList ? undefined : search, page }),
    refetchInterval: (q) => (focused && appState === 'active' ? (q.state.data?.interval ?? false) : false),
  });
  const go = (loc: DevLocation) => openScreen(devHref(loc.section, loc.item || 'overview', loc.search));
  if (!allowed || !section) return <NoPermission />;
  const searchLabel = roleList
    ? '역할 이름·코드'
    : mainLogs
      ? logPanel === 'audit'
        ? '작업·실행자 검색'
        : '상태·메서드·경로 검색'
      : query.data?.searchLabel;
  return (
    <>
      <Stack.Screen
        options={{
          title: mainLogs ? '로그' : (query.data?.title ?? developerSections[section]),
          ...(searchLabel
            ? {
                headerSearchBarOptions: {
                  placement: 'integratedButton',
                  allowToolbarIntegration: false,
                  hideWhenScrolling: false,
                  placeholder: searchLabel,
                  cancelButtonText: '취소',
                  autoCapitalize: 'none',
                  onChangeText: (e) => setDraft(e.nativeEvent.text),
                  onCancelButtonPress: () => setDraft(''),
                },
              }
            : {}),
          ...(roleList && writable
            ? {
                headerRight: () => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="역할 추가"
                    hitSlop={10}
                    onPress={() => go({ section: 'permissions', item: 'new' })}
                  >
                    <Icon ios="plus" android="add" size={22} color={t.text} />
                  </Pressable>
                ),
              }
            : {}),
          ...((section === 'logs' && item.includes('/') && !item.startsWith('top')) ||
          item === 'new' ||
          item === 'settings'
            ? { presentation: 'modal' }
            : {}),
        }}
      />
      <Screen onRefresh={() => query.refetch()}>
        {mainLogs && (
          <Segmented
            label="로그 종류"
            style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}
            options={[
              { value: 'requests', label: '서버 로그' },
              { value: 'audit', label: '감사 로그' },
            ]}
            value={logPanel}
            onChange={(tab) => {
              setPanel(tab);
              setPage(0);
              setDraft('');
              setSearch('');
            }}
          />
        )}
        <QueryBoundary layout="settings" query={query}>
          {(view) => (
            <>
              <DevGroups writable={writable} section={section} item={item} view={view} go={go} filter={roleList ? draft : ''} />
              {writable && view.forms?.map((f) => (
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
