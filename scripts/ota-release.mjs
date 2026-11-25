// 두 앱의 iOS·Android 산출물을 모두 완성한 뒤 디렉터리 이름을 한 번 바꿔 공개한다.
import { execFileSync } from 'node:child_process';
import { createHash, createSign, randomUUID, X509Certificate, verify } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rename, link, rm } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatReleaseNotes } from '../src/shared/release-notes.mjs';
import { tmpdir } from 'node:os';
const root = fileURLToPath(new URL('../', import.meta.url));
const {
  OTA_DIRECTORY,
  SJYC_OTA_PRIVATE_KEY,
  SJYC_OTA_CERTIFICATE,
  EXPO_PUBLIC_API_BASE_URL,
  SJYC_OTA_CHANNEL = 'production',
} = process.env;
const note = formatReleaseNotes(process.argv.slice(2));
if (
  !OTA_DIRECTORY ||
  !SJYC_OTA_PRIVATE_KEY ||
  !SJYC_OTA_CERTIFICATE ||
  !EXPO_PUBLIC_API_BASE_URL ||
  !note ||
  note.length > 240 ||
  !['production', 'preview'].includes(SJYC_OTA_CHANNEL)
)
  throw Error('배포 디렉터리, 서명 키·인증서, API 주소, 채널, 변경 내용을 확인해 주세요.');
const api = new URL(EXPO_PUBLIC_API_BASE_URL);
if (
  api.protocol !== 'https:' &&
  !(['localhost', '127.0.0.1'].includes(api.hostname) && SJYC_OTA_CHANNEL === 'preview')
)
  throw Error('운영 업데이트는 HTTPS가 필요합니다.');
const key = await readFile(SJYC_OTA_PRIVATE_KEY),
  certificate = new X509Certificate(await readFile(SJYC_OTA_CERTIFICATE));
const certEnd = Date.parse(certificate.validTo);
if (Date.now() < Date.parse(certificate.validFrom) || Date.now() >= certEnd)
  throw Error('서명 인증서 유효 기간을 확인해 주세요.');
const assets = join(resolve(OTA_DIRECTORY), 'assets'),
  batches = join(resolve(OTA_DIRECTORY), 'releases');
await Promise.all([mkdir(assets, { recursive: true }), mkdir(batches, { recursive: true })]);
const draft = await mkdtemp(join(batches, '.staging-')),
  temp = await mkdtemp(join(tmpdir(), 'sjyc-export-'));
const types = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  otf: 'font/otf',
  gif: 'image/gif',
  json: 'application/json',
};
async function asset(file, ext, bundle) {
  const data = await readFile(file),
    hash = createHash('sha256').update(data).digest(),
    hex = hash.toString('hex');
  const intermediate = join(draft, randomUUID());
  await writeFile(intermediate, data);
  try {
    await link(intermediate, join(assets, hex));
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const stored = await readFile(join(assets, hex));
    if (!createHash('sha256').update(stored).digest().equals(hash)) throw Error('기존 에셋 무결성 확인 실패');
  }
  await rm(intermediate);
  return {
    hash: hash.toString('base64url'),
    key: createHash('md5').update(data).digest('hex'),
    contentType: bundle ? 'application/javascript' : (types[ext] ?? 'application/octet-stream'),
    url: api.href.replace(/\/$/, '') + '/ota/assets/' + hex,
    ...(bundle ? {} : { fileExtension: '.' + ext }),
  };
}
try {
  const batch = {
    createdAt: new Date().toISOString(),
    message: note,
    channel: SJYC_OTA_CHANNEL,
    user: {},
    admin: {},
  };
  for (const flavor of ['user', 'admin']) {
    const options = {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        APP_FLAVOR: flavor,
        EXPO_PUBLIC_API_MODE: 'http',
        SJYC_OTA_CHANNEL,
      },
      encoding: 'utf8',
    };
    const out = join(temp, flavor);
    execFileSync(
      join(root, 'node_modules/.bin/expo'),
      ['export', '--platform', 'ios', '--platform', 'android', '--output-dir', out, '--max-workers', '2'],
      { ...options, stdio: 'inherit' },
    );
    const meta = JSON.parse(await readFile(join(out, 'metadata.json'), 'utf8'));
    const config = JSON.parse(
      execFileSync(join(root, 'node_modules/.bin/expo'), ['config', '--type', 'public', '--json'], options),
    );
    // 인증서 경로 등 로컬 빌드 설정은 전달하지 않는다.
    const expoClient = {
      name: config.name,
      slug: config.slug,
      version: config.version,
      scheme: config.scheme,
      extra: config.extra,
    };
    for (const platform of ['ios', 'android']) {
      const { runtimeVersion: runtime } = JSON.parse(
        execFileSync(
          join(root, 'node_modules/.bin/expo-updates'),
          ['runtimeversion:resolve', '--platform', platform],
          options,
        ),
      );
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(runtime ?? '')) throw Error('런타임을 확인할 수 없습니다.');
      const info = meta.fileMetadata[platform],
        id = randomUUID();
      const launchAsset = await asset(join(out, info.bundle), '', true),
        files = [];
      for (const item of info.assets) files.push(await asset(join(out, item.path), item.ext, false));
      const manifest = JSON.stringify({
        id,
        createdAt: batch.createdAt,
        runtimeVersion: runtime,
        launchAsset,
        assets: files,
        metadata: {},
        extra: { expoClient, message: note },
      });
      const signature = createSign('RSA-SHA256').update(manifest).sign(key);
      if (!verify('RSA-SHA256', Buffer.from(manifest), certificate.publicKey, signature))
        throw Error('서명 키와 앱 인증서가 일치하지 않습니다.');
      await writeFile(join(draft, flavor + '-' + platform + '.json'), manifest);
      await writeFile(join(draft, flavor + '-' + platform + '.sig'), signature.toString('base64'));
      batch[flavor][platform] = { id, runtime, assetCount: files.length + 1 };
    }
  }
  await writeFile(join(draft, 'release.json'), JSON.stringify(batch));
  const target = join(batches, Date.now() + '-' + randomUUID());
  await rename(draft, target);
  console.log('전체 배포 완료', basename(target));
} finally {
  await rm(draft, { recursive: true, force: true });
  await rm(temp, { recursive: true, force: true });
}
