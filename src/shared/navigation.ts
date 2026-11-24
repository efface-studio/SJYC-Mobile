import { router, type Href } from 'expo-router';

/** 같은 경로와 동적 ID로 들어온 이동은 네이티브 스택의 한 화면을 공유한다. */
export function openScreen(href: Href) {
  router.push(href, { dangerouslySingular: true });
}
