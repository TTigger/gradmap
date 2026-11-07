import { useState } from "react";

/** 複製某一列的專屬網址（#分頁:目標），按下後短暫顯示「已複製」 */
export function useCopyLink(tab: string) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (target: string) => {
    const url = `${location.origin}${location.pathname}#${tab}:${target}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(target);
      setTimeout(() => setCopied((c) => (c === target ? null : c)), 1600);
    }, () => window.prompt("複製這個連結", url));
  };
  return [copied, copy] as const;
}
