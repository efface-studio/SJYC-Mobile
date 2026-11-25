import { ListRow, pickOption } from '~/ds';
import { notify } from './dialogs';
import { modeLabels, modes, setAppearance, useAppearancePreference } from './appearance';

export function AppearanceRow() {
  const mode = useAppearancePreference();
  async function select() {
    const index = await pickOption('화면 테마', modes.map((item) => modeLabels[item]), modes.indexOf(mode));
    const next = index === null ? undefined : modes[index];
    if (!next || next === mode) return;
    try { setAppearance(next); }
    catch { notify('테마를 저장하지 못했어요', '기기 저장 공간을 확인해 주세요.'); }
  }
  return <ListRow title="화면 테마" meta={modeLabels[mode]} onPress={() => void select()} />;
}
