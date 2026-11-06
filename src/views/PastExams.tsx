import Icon from "../Icon";
import type { Data, PastExam } from "../types";
import { fmtMD, type Sel } from "../lib";

const COLS = [115, 114, 113, 112, 111];
const ACCESS: Record<PastExam["access"], string> = {
  online: "線上下載",
  onsite: "館內紙本",
  database: "資料庫查詢",
  unknown: "待確認",
};

function has(x: PastExam, y: number): "yes" | "no" | "unsure" | "unknown" {
  if (!x.years) return "unknown";
  if (x.unsure?.includes(y)) return "unsure";
  return y >= x.years[0] && y <= x.years[1] ? "yes" : "no";
}

/** 考古題索引：各校官方考古題放哪裡、有哪些年度 */
export default function PastExams({ data, sel }: { data: Data; sel: Sel }) {
  const short = (id: string) => data.registry.find((r) => r.id === id)?.short ?? id;
  const list = data.pastExams.schools.filter((x) => sel(x.school));
  return (
    <section className="card">
      <p className="lead">
        各校<b>碩士班考試（筆試）</b>的官方考古題位置，多半放在學校圖書館，由教務處提供、<b>不附解答</b>。甄試與轉學考試題不列。
        年度格子只標我們實際在官方頁面上看到的年度；「?」表示要自己點進去看。
      </p>
      <div className="table-wrap">
        <table className="pe freeze">
          <thead>
            <tr>
              <th>學校</th>
              <th>取得方式</th>
              {COLS.map((y) => <th key={y} className="c">{y}</th>)}
              <th>收錄範圍</th>
              <th>官方頁面與備註</th>
            </tr>
          </thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.school} data-focus={`pe-${x.school}`}>
                <td className="who"><b>{short(x.school)}</b></td>
                <td className="nowrap"><span className={`acc a-${x.access}`}>{ACCESS[x.access]}</span></td>
                {COLS.map((y) => {
                  const h = has(x, y);
                  return <td key={y} className="c" data-label={y}><span className={`pe-${h}`}>{h === "yes" ? "●" : h === "no" ? "—" : "?"}</span></td>;
                })}
                <td className="nowrap pe-range" data-label="收錄範圍">{x.years ? `${x.years[0]}–${x.years[1]}` : "—"}</td>
                <td className="pe-note">
                  <a href={x.url} target="_blank" rel="noreferrer">{x.label}<Icon name="out" /></a>
                  {x.extra?.map((e) => <a key={e.url} href={e.url} target="_blank" rel="noreferrer" className="pe-extra">{e.label}<Icon name="out" /></a>)}
                  {x.note && <div className="hint">{x.note}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">● 有試題　— 沒有收錄　? 待確認。查證日期 {fmtMD(data.pastExams.checked)}。補習班整理的題解放在「備考情報」分頁。</p>
    </section>
  );
}
