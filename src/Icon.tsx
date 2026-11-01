// 線條圖示（取代 emoji，深淺色模式都用文字顏色）
const P: Record<string, JSX.Element> = {
  pin: <><path d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></>,
  warn: <><path d="M12 3.5 2.8 19.5h18.4z" /><path d="M12 10v4.2" /><circle cx="12" cy="16.9" r=".6" fill="currentColor" /></>,
  star: <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12.2 2.7 2.7L16.2 9.4" /></>,
  plus: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  out: <path d="M8 16 16 8M9.5 8H16v6.5" />,
  cal: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  chevron: <path d="m7 10 5 5 5-5" />,
};

export type IconName = keyof typeof P;

export default function Icon({ name, fill, className = "" }: { name: IconName; fill?: boolean; className?: string }) {
  return (
    <svg className={`ico ${className}`} viewBox="0 0 24 24" aria-hidden="true" fill={fill ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </svg>
  );
}
