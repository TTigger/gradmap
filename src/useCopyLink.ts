import { useState } from "react";

/** 手機、平板（觸控為主且支援系統分享）→ 跳出分享選單（可直接傳 LINE）；電腦 → 複製連結 */
export const canShare =
  typeof navigator !== "undefined" && typeof navigator.share === "function" &&
  typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

/** 分享或複製一個網址；回傳 "copied"（已複製）、"shared"（已開分享選單）、"cancel"（使用者取消） */
export async function shareOrCopy(url: string, title?: string): Promise<"copied" | "shared" | "cancel"> {
  if (canShare) {
    try { await navigator.share({ title, url }); return "shared"; }
    catch (e) { if ((e as Error)?.name === "AbortError") return "cancel"; }
  }
  try { await navigator.clipboard.writeText(url); return "copied"; }
  catch { window.prompt("複製這個連結", url); return "cancel"; }
}

/** 某一列的專屬網址（#分頁:目標）：手機跳分享選單、電腦複製；複製後短暫顯示「已複製」 */
export function useCopyLink(tab: string) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (target: string, title?: string) => {
    const url = `${location.origin}${location.pathname}#${tab}:${target}`;
    if ((await shareOrCopy(url, title)) !== "copied") return;
    setCopied(target);
    setTimeout(() => setCopied((c) => (c === target ? null : c)), 1600);
  };
  return [copied, copy] as const;
}

/** 按鈕文字的動詞：手機「分享」、電腦「複製」 */
export const linkVerb = canShare ? "分享" : "複製";
