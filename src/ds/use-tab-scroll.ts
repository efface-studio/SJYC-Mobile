import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, ScrollView } from 'react-native';

/** 탭을 바꿀 때만 선택한 화면을 맨 위로 돌린다. 같은 스택의 뒤로 가기는 읽던 위치를 보존한다. */
export function useTabScroll(headerHeight: number) {
  const scroll = useRef<ScrollView>(null);
  const navigation = useNavigation();
  useEffect(() => {
    let tabs = navigation.getParent();
    while (tabs && tabs.getState().type !== 'tab') tabs = tabs.getParent();
    if (!tabs) return;
    let previous = tabs.getState().index;
    let frame = 0;
    const unsubscribe = tabs.addListener('state', ({ data: { state } }) => {
      if (previous === state.index) return;
      previous = state.index;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!navigation.isFocused()) return;
        const view = scroll.current;
        view?.getNativeScrollRef()?.measureInWindow((_x, y) => {
          if (view !== scroll.current || !navigation.isFocused()) return;
          // 투명 헤더 아래로 확장된 iOS 스크롤 뷰의 시작점은 음수다.
          const inset = Platform.OS === 'ios' ? Math.max(0, headerHeight - y) : 0;
          view.scrollTo({ y: -inset, animated: false });
        });
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [headerHeight, navigation]);
  return scroll;
}
