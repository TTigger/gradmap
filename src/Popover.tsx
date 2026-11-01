import { useEffect, useRef, useState, type ReactNode } from "react";

/** 按鈕＋下拉面板；點外面或按 Esc 會關閉 */
export default function Popover({ label, className, children, align = "left" }: {
  label: ReactNode; className?: string; children: (close: () => void) => ReactNode; align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="pop" ref={ref}>
      <button className={className} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{label}</button>
      {open && <div className={`pop-panel ${align}`}>{children(() => setOpen(false))}</div>}
    </div>
  );
}
