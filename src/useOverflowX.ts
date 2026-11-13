import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

// 這個區塊是否需要左右捲（手機寬度）。會捲時給 tabIndex=0，鍵盤使用者才能聚焦後用方向鍵捲；
// 裡面沒有可聚焦的東西（時間軸、倒數卡片）才需要。不捲時不多一個 Tab 停留點。
export function useOverflowX(ref: RefObject<HTMLElement | null>): boolean {
  const [over, setOver] = useState(false);
  const check = () => { const el = ref.current; setOver(!!el && el.scrollWidth > el.clientWidth + 1); };
  useLayoutEffect(check); // 每次重繪都量（內容多寡會變），值沒變 React 不會再重繪
  useEffect(() => { window.addEventListener("resize", check); return () => window.removeEventListener("resize", check); });
  return over;
}
