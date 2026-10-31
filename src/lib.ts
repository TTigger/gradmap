import type { Data, Row, School, ScheduleEvent, EventType } from "./types";

export const TYPE_META: Record<EventType, { label: string; color: string }> = {
  register: { label: "報名", color: "var(--c-register)" },
  payment: { label: "繳費", color: "var(--c-register)" },
  upload: { label: "上傳資料", color: "var(--c-register)" },
  admit_card: { label: "准考證", color: "var(--c-muted)" },
  venue: { label: "試場公告", color: "var(--c-muted)" },
  exam: { label: "考試", color: "var(--c-exam)" },
  result: { label: "放榜", color: "var(--c-result)" },
  regrade: { label: "複查", color: "var(--c-muted)" },
  enroll: { label: "報到", color: "var(--c-enroll)" },
  waitlist: { label: "備取", color: "var(--c-enroll)" },
  other: { label: "公告", color: "var(--c-muted)" },
};

/** "2026-11-10T09:00" → Date（以台灣時間解讀） */
export function toDate(s: string): Date {
  return new Date(s.length <= 10 ? `${s}T00:00:00+08:00` : `${s}:00+08:00`);
}

export function dayKey(s: string): string {
  return s.slice(0, 10);
}

const WEEK = "日一二三四五六";
export function fmtDay(s: string, withWeek = true): string {
  const d = toDate(s);
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  return withWeek ? `${md}（${WEEK[d.getDay()]}）` : md;
}

export function fmtTime(s: string): string {
  return s.length > 10 ? s.slice(11, 16) : "";
}

export function fmtWhen(e: ScheduleEvent): string {
  const one = (s: string) => `${fmtDay(s)}${fmtTime(s) ? " " + fmtTime(s) : ""}`;
  if (e.start && e.end) return `${one(e.start)} – ${one(e.end)}`;
  if (e.end) return `${one(e.end)} 前`;
  return one(e.start!);
}

export function rows(data: Data, showNearKin: boolean): Row[] {
  const out: Row[] = [];
  for (const school of data.schools) {
    for (const program of school.programs) {
      if (!showNearKin && program.kind === "near_kin") continue;
      for (const group of program.groups) out.push({ school, program, group });
    }
  }
  return out;
}

export function findEvent(s: School, type: EventType): ScheduleEvent | undefined {
  return s.schedule.find((e) => e.type === type);
}

export function weightLabel(p: { weight_pct?: number; weight_x?: number }): string {
  if (p.weight_pct != null) return `${p.weight_pct}%`;
  if (p.weight_x != null) return `×${p.weight_x}`;
  return "—";
}

/** 所有 116 年度（已查證）的日程，攤平成單一事件清單 */
export interface FlatEvent extends ScheduleEvent {
  school: School;
}
export function verifiedEvents(data: Data): FlatEvent[] {
  return data.schools
    .filter((s) => s.status === "verified")
    .flatMap((s) => s.schedule.map((e) => ({ ...e, school: s })));
}

/** 每校下一個重要節點（開放報名 → 報名截止 → 考試），依時間排序 */
export function nextDeadlines(data: Data, now: Date, n = 4) {
  const perSchool: { when: Date; text: string; school: School; kind: "open" | "close" | "exam" }[] = [];
  for (const s of data.schools.filter((x) => x.status === "verified")) {
    const reg = s.schedule.find((e) => e.type === "register");
    const exam = s.schedule.find((e) => e.type === "exam");
    const cands = [
      reg?.start && { when: toDate(reg.start), text: "開放報名", kind: "open" as const },
      reg?.end && { when: toDate(reg.end), text: "報名截止", kind: "close" as const },
      exam?.start && { when: toDate(exam.start), text: "考試", kind: "exam" as const },
    ].filter(Boolean) as { when: Date; text: string; kind: "open" | "close" | "exam" }[];
    const next = cands.filter((c) => c.when >= now).sort((a, b) => +a.when - +b.when)[0];
    if (next) perSchool.push({ ...next, school: s });
  }
  return perSchool.sort((a, b) => +a.when - +b.when).slice(0, n);
}

export function daysUntil(when: Date, now: Date): number {
  const a = new Date(now); a.setHours(0, 0, 0, 0);
  const b = new Date(when); b.setHours(0, 0, 0, 0);
  return Math.round((+b - +a) / 86400000);
}
