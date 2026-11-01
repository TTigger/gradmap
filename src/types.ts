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
  changes?: Change[];
  venue?: { city: string; place: string; src: string; year?: number; choose?: boolean };
  waitlist_info?: { alert?: string; how: string; where?: { label: string; url: string }; deadline?: string; src: string };
}

/** 簡章更正、日程異動的紀錄（每週查核發現變動時新增） */
export interface Change {
  date: string; // 發現／公告變動的日期
  where: string; // schedule.<type>、group:<組別 id>、fee、school
  what: string; // 一句話說明
  before?: string;
  after?: string;
  src: string;
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
  registry: RegistrySchool[];
  history: HistorySchool[];
  resources: Resource[];
  pastExams: { checked: string; schools: PastExam[] };
}

/** data/past_exams.yaml：各校官方考古題位置 */
export interface PastExam {
  school: string;
  url: string;
  label: string;
  access: "online" | "onsite" | "database" | "unknown";
  years?: [number, number];
  unsure?: number[];
  note?: string;
  extra?: { label: string; url: string }[];
}

/** 比較表、矩陣用的扁平列 */
export interface Row {
  school: School;
  program: Program;
  group: Group;
}

/** data/registry.yaml：全部收錄學校的清單、別名、資料來源（排程查核也依這份） */
export interface RegistrySchool {
  id: string;
  name: string;
  short: string;
  aliases: string[];
  links: { label: string; url: string; kind: "admission" | "brochure" | "stats" | "dept" | "past_exam" | "other" }[];
}

/** data/history/<id>.yaml：歷年考試入學數據 */
export interface HistoryRecord {
  year: number;
  program: string;
  group?: string;
  quota?: number;
  applicants?: number;
  takers?: number;
  admitted?: number;
  waitlist?: number;
  min_score?: number | string;
  min_score_note?: string;
  src: string;
  note?: string;
  main?: boolean; // 畫進趨勢圖的主列（每校資工本所一列）
}
export interface HistorySchool {
  school: string;
  sources: Record<string, { title: string; url: string; grade: "A" | "B"; checked?: string }>;
  records: HistoryRecord[];
  published: string; // 這所學校官方公開了哪些統計（給使用者看）
}

/** data/resources.yaml：備考情報（非官方，僅供參考） */
export interface Resource {
  title: string;
  url: string;
  grade: "A" | "B" | "C";
  kind: "past_exam" | "experience" | "stats" | "forum" | "course" | "tool";
  publisher: string;
  schools?: string[];
  subjects?: string[];
  note?: string;
  checked: string;
}

