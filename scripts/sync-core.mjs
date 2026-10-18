// 웹 저장소(SJYC-Client)의 공유 코드를 src/core 로 복사한다.
// 사용: npm run sync:core  (웹 저장소 위치: SJYC_CLIENT_DIR, 기본값 ../SJYC-Client → 없으면 ..)
// 공유 코드의 원본은 웹 저장소다. src/core 는 직접 고치지 말고 웹에서 고친 뒤 동기화한다.
import { cpSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const here = join(import.meta.dirname, '..');
const candidates = [process.env.SJYC_CLIENT_DIR, join(here, '..', 'SJYC-Client'), join(here, '..')].filter(Boolean);
const client = candidates.find((dir) => existsSync(join(dir, 'src', 'api', 'client.ts')));
if (!client) {
  process.stderr.write('SJYC-Client 저장소를 찾지 못했습니다. SJYC_CLIENT_DIR 를 지정해 주세요.\n');
  process.exit(1);
}

const SHARED = [
  'src/api',
  'src/domain',
  'src/config',
  'src/lib/format.ts',
  'src/lib/safe-redirect.ts',
  'src/lib/calendar.ts',
  'src/features/auth/session.ts',
];
const target = join(here, 'src', 'core');
rmSync(target, { recursive: true, force: true });

const isTest = (p) => /\.test\.tsx?$/.test(p);
let count = 0;
function copy(from, to) {
  if (statSync(from).isDirectory()) {
    for (const name of readdirSync(from)) copy(join(from, name), join(to, name));
    return;
  }
  if (isTest(from)) return;
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
  count += 1;
}
for (const rel of SHARED) copy(join(client, rel), join(target, relative('src', rel)));
process.stdout.write(`synced ${count} files from ${client}\n`);
