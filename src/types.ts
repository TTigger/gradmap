export type EventType =
  | "register" | "payment" | "upload" | "admit_card" | "venue"
  | "exam" | "result" | "regrade" | "enroll" | "waitlist" | "other";

export interface ScheduleEvent {
  type: EventType;
  start?: string;
  end?: string;
  label: string;
  note?: string;
  src: string;
  year?: number;
}

export interface Paper {
  name: string;
  covers: string[];
  weight_pct?: number;
  weight_x?: number;
  sub_weights?: Record<string, number>;
  period?: string;
  note?: string;
}

export interface Group {
  id: string;
  name: string;
  code?: string;
  quota: { general?: number; in_service?: number };
  quota_note?: string;
  quota_src?: string;
  exam_day?: string;
  papers: Paper[];
  papers_note?: string;
  scoring?: string;
  second_stage?: string;
  tie_break?: string[];
  calculator?: string;
  notes?: string[];
  year?: number;
}

export interface Program {
  id: string;
  name: string;
  kind: "main" | "near_kin";
  url?: string;
  note?: string;
  notes?: string[];
  stub?: boolean;
  review_only?: boolean;
  exclusive_groups?: boolean;
  groups: Group[];
}

export interface School {
  id: string;
  name: string;
  short: string;
  year: number;
  status: "verified" | "pending";
  status_note?: string;
  reference_year?: number;
  brochure: { title: string; url: string; verified: string; published?: string; url_note?: string; page_note?: string };
  fee?: { amount: number; note?: string; src?: string };
  joint_admission?: { name: string; rule: string; src: string };
  schedule: ScheduleEvent[];
  programs: Program[];
  rules?: Record<string, string>;
}

export interface PendingSchool {
  id: string;
  name: string;
  short: string;
  site: string;
  note: string;
  note_src?: string;
}

export interface Data {
  generated: string;
  subjects: Record<string, { name: string; aliases: string[] }>;
  schools: School[];
  pending: { checked: string; schools: PendingSchool[] };
}

/** 比較表、矩陣用的扁平列 */
export interface Row {
  school: School;
  program: Program;
  group: Group;
}
