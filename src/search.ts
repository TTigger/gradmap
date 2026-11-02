import type { Data, EventType } from "./types";
import { TYPE_META, fmtWhen, rows, toDate } from "./lib";

export type TabId = "timeline" | "calendar" | "compare" | "matrix" | "history" | "past" | "after" | "resources" | "pending";

/** 搜尋結果點下去要做的事 */
export interface Target {
  tab: TabId;
  focusId?: string;   // 要捲動並閃一下的元素 id
  date?: string;      // 行事曆要切到的日期
  school?: string;    // 直接套用學校篩選
}

export interface Hit {
  kind: "學校" | "日程" | "系所組" | "科目" | "歷年" | "情報" | "考古題" | "遞補";
  title: string;
  sub: string;
  target: Target;
  sort: string;
}

interface Entry extends Hit {
  text: string;               // 一般關鍵字比對用
  range?: [string, string];   // 日期比對用（YYYY-MM-DD）
}

/** 使用者常打的同義詞 → 節點類型 */
export const TYPE_WORDS: Record<EventType, string[]> = {
  register: ["報名", "開放報名", "報名截止", "網路報名"],
  payment: ["繳費", "報名費", "繳款"],
  upload: ["上傳", "審查資料", "繳交資料"],
  admit_card: ["准考證", "列印准考證"],
  venue: ["試場", "考場", "試場分配"],
  exam: ["考試", "筆試", "考試日期", "考試日"],
  result: ["放榜", "榜單", "錄取名單", "公告錄取"],
  regrade: ["複查", "成績複查"],
  enroll: ["報到", "註冊", "錄取報到"],
  waitlist: ["備取", "遞補", "備取報到"],
  other: ["公告"],
};

const WEEK = "日一二三四五六";
const iso = (d: Date) => {
  const t = new Date(d.getTime() + 8 * 3600000);
  return t.toISOString().slice(0, 10);
};

export function buildIndex(data: Data): Entry[] {
  const out: Entry[] = [];
  const reg = new Map(data.registry.map((r) => [r.id, r]));
  const schoolWords = (id: string) => {
    const r = reg.get(id);
    return r ? [r.name, r.short, ...r.aliases].join(" ") : id;
  };

  // 學校
  for (const r of data.registry) {
    const has = data.schools.find((s) => s.id === r.id);
    const status = !has ? "116 簡章未公告" : has.status === "verified" ? "116 已查證" : `${has.reference_year} 參考`;
    out.push({
      kind: "學校", title: r.name, sub: status, sort: "0" + r.short,
      text: schoolWords(r.id),
      target: has ? { tab: "compare", school: r.id } : { tab: "pending", focusId: `pd-${r.id}` },
    });
  }

  // 日程（只放 116 已查證的；參考年度的日期不當真）
  for (const s of data.schools) {
    for (const [i, e] of s.schedule.entries()) {
      const a = e.start ?? e.end!, b = e.end ?? e.start!;
      const ref = s.status !== "verified";
      out.push({
        kind: "日程",
        title: `${s.short} ${e.label}`,
        sub: `${fmtWhen(e)}${ref ? `（${s.reference_year} 參考）` : ""}`,
        sort: (ref ? "9" : "1") + a,
        text: [schoolWords(s.id), e.label, TYPE_META[e.type].label, ...TYPE_WORDS[e.type], e.note ?? ""].join(" "),
        range: [a.slice(0, 10), b.slice(0, 10)],
        target: ref ? { tab: "compare", school: s.id } : calTarget(s.id, i, e.type, e.start, e.end),
      });
    }
  }

  // 系所組
  for (const { school: s, program: p, group: g } of rows(data, true)) {
    const subj = g.papers.flatMap((x) => [x.name, ...x.covers.map((c) => data.subjects[c]?.name ?? c)]).join(" ");
    out.push({
      kind: "系所組",
      title: `${s.short} ${p.name}${g.name !== "—" ? " " + g.name : ""}`,
      sub: [g.quota.general != null ? `名額 ${g.quota.general}` : "", p.kind === "near_kin" ? "近親所" : "", p.review_only ? `不考筆試（${p.review_method}）` : ""].filter(Boolean).join(" · ") || "考科待整理",
      sort: "2" + s.short,
      text: [schoolWords(s.id), p.name, g.name, g.code ?? "", subj, p.kind === "near_kin" ? "近親所" : "", p.review_only ? `不考筆試 書審 只書審 ${p.review_method ?? ""}` : ""].join(" "),
      target: { tab: "compare", focusId: `cmp-${g.id}` },
    });
  }

  // 科目
  for (const [code, sub] of Object.entries(data.subjects)) {
    const who = rows(data, false).filter((r) => r.group.papers.some((p) => p.covers.includes(code))).map((r) => r.school.short);
    out.push({
      kind: "科目", title: sub.name, sub: who.length ? `${[...new Set(who)].join("、")} 有考` : "目前沒有學校考",
      sort: "3" + code, text: [code, sub.name, ...sub.aliases].join(" "),
      target: { tab: "matrix", focusId: `mxc-${code}` },
    });
  }

  // 歷年數據
  for (const h of data.history) {
    const r = reg.get(h.school);
    if (!r || !h.records.length) continue;
    const years = [...new Set(h.records.map((x) => x.year))].sort().join("、");
    out.push({
      kind: "歷年", title: `${r.short} 歷年數據`, sub: `${years} 學年度`, sort: "4" + r.short,
      text: [schoolWords(h.school), "歷年 報考人數 報名人數 錄取人數 錄取率 最低錄取分數 錄取分數 分數", years].join(" "),
      target: { tab: "history", focusId: `hs-${h.school}` },
    });
  }

  // 備考情報
  // 考古題、放榜遞補
  for (const x of data.pastExams.schools) {
    const short = reg.get(x.school)?.short ?? x.school;
    out.push({
      kind: "考古題", title: `${short} 考古題`, sub: x.years ? `${x.years[0]}–${x.years[1]} 學年度` : "到官方頁面查詢",
      target: { tab: "past", focusId: `pe-${x.school}` }, sort: "4" + x.school,
      text: `${schoolWords(x.school)} 考古題 歷屆試題 試題 past exam ${x.label}`,
    });
  }
  for (const s of data.schools.filter((x) => x.waitlist_info)) {
    out.push({
      kind: "遞補", title: `${s.short} 放榜後報到與遞補`, sub: s.waitlist_info!.alert ?? s.waitlist_info!.how.slice(0, 30),
      target: { tab: "after", focusId: `af-${s.id}` }, sort: "5" + s.id,
      text: `${schoolWords(s.id)} 遞補 備取 報到 放榜後 意願 ${s.waitlist_info!.alert ?? ""}`,
    });
  }
  for (const [i, x] of data.resources.entries()) {
    out.push({
      kind: "情報", title: x.title, sub: `${x.publisher}${x.grade === "A" ? "（官方）" : ""}`, sort: "5" + i,
      text: [x.title, x.publisher, x.note ?? "", ...(x.schools ?? []).map(schoolWords), ...(x.subjects ?? []).map((c) => data.subjects[c]?.name ?? c),
        { past_exam: "考古題", experience: "心得 經驗", stats: "統計 錄取率", forum: "討論區 論壇", course: "課程 補習班", tool: "工具" }[x.kind]].join(" "),
      target: { tab: "resources", focusId: `rs-${i}` },
    });
  }
  return out;
}

/** 把「1/26」「1月26日」「2027-01-26」「1月」轉成日期條件 */
function dateToken(tok: string): ((range: [string, string]) => boolean) | null {
  let m: RegExpMatchArray | null;
  const inRange = (r: [string, string], test: (d: Date) => boolean) => {
    for (let t = +toDate(r[0]); t <= +toDate(r[1]); t += 86400000) if (test(new Date(t))) return true;
    return false;
  };
  const md = (d: Date) => { const s = iso(d); return [Number(s.slice(5, 7)), Number(s.slice(8, 10))]; };
  if ((m = tok.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
    const want = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    return (r) => r[0] <= want && want <= r[1];
  }
  if ((m = tok.match(/^(\d{1,2})[/.](\d{1,2})$/)) || (m = tok.match(/^(\d{1,2})月(\d{1,2})[日號]?$/))) {
    const [M, D] = [Number(m[1]), Number(m[2])];
    return (r) => inRange(r, (d) => { const [a, b] = md(d); return a === M && b === D; });
  }
  if ((m = tok.match(/^(\d{1,2})月(份)?$/))) {
    const M = Number(m[1]);
    return (r) => inRange(r, (d) => md(d)[0] === M);
  }
  if ((m = tok.match(/^(?:週|周|星期|禮拜)([日天一二三四五六])$/))) {
    const w = m[1] === "天" ? 0 : WEEK.indexOf(m[1]);
    return (r) => inRange(r, (d) => new Date(d.getTime() + 8 * 3600000).getUTCDay() === w);
  }
  return null;
}

/** 空白分隔的每個詞都要符合（AND）。例：「台師大 報名」「1/26」「考試 2月」 */
export function search(index: Entry[], q: string, limit = 14): Hit[] {
  const toks = q.trim().toLowerCase().replace(/臺/g, "台").split(/\s+/).filter(Boolean);
  if (!toks.length) return [];
  const res = index.filter((e) => {
    const text = e.text.toLowerCase().replace(/臺/g, "台");
    return toks.every((t) => {
      const dt = dateToken(t);
      if (dt) return !!e.range && dt(e.range);
      return text.includes(t) || e.title.toLowerCase().replace(/臺/g, "台").includes(t);
    });
  });
  return res.sort((a, b) => a.sort.localeCompare(b.sort)).slice(0, limit);
}

/** 跳到行事曆：報名類跳到截止日那格，其他跳到開始那格（對應 Calendar 的 chip id） */
function calTarget(sid: string, i: number, type: EventType, start?: string, end?: string): Target {
  const a = (start ?? end)!, b = (end ?? start)!;
  const multi = !!start && !!end && a.slice(0, 10) !== b.slice(0, 10);
  const useEnd = ["register", "payment", "upload"].includes(type) && !!end;
  return { tab: "calendar", date: useEnd ? b : a, focusId: `ev-${sid}-${i}${multi && !useEnd ? "-s" : ""}` };
}
