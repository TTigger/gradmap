import Icon from "../Icon";
import type { Data, Resource } from "../types";

const KINDS: { id: Resource["kind"]; label: string; desc: string }[] = [
  { id: "past_exam", label: "考古題", desc: "各校官方題庫優先；第三方整理的題解僅供參考" },
  { id: "stats", label: "錄取統計", desc: "官方以外的整理（補習班、新聞），與「歷年數據」分頁的官方數字可能不同" },
  { id: "experience", label: "上榜心得", desc: "個人經驗分享，準備方式因人而異" },
  { id: "forum", label: "討論區", desc: "即時消息與問答，內容未經查證" },
  { id: "course", label: "課程與教材", desc: "公開課程與教科書資源" },
  { id: "tool", label: "工具", desc: "" },
];

const GRADE = { A: "官方", B: "第三方整理", C: "個人分享" };

export default function Resources({ data, school }: { data: Data; school: string }) {
  const short = (id: string) => data.registry.find((r) => r.id === id)?.short ?? id;
  const list = data.resources
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => school === "all" || !x.schools?.length || x.schools.includes(school));

  return (
    <section className="card">
      <div className="notice">
        <b>這裡是參考資料，不是官方資訊。</b> 日期、名額、考科一律以各校簡章為準（見其他分頁）。
        每筆都標了來源等級：<span className="grade gA">A</span> 官方 · <span className="grade gB">B</span> 第三方整理（補習班、媒體）·{" "}
        <span className="grade gC">C</span> 個人分享。
      </div>
      {KINDS.map((k) => {
        const items = list.filter(({ x }) => x.kind === k.id);
        if (!items.length) return null;
        return (
          <div key={k.id} className="res-group">
            <h3>{k.label} <small className="hint">{k.desc}</small></h3>
            <ul className="res">
              {items.map(({ x, i }) => (
                <li key={i} data-focus={`rs-${i}`}>
                  <div className="res-head">
                    <span className={`grade g${x.grade}`} title={GRADE[x.grade]}>{x.grade}</span>
                    <a href={x.url} target="_blank" rel="noreferrer">{x.title}<Icon name="out" /></a>
                  </div>
                  <div className="hint">
                    {x.publisher}
                    {x.schools?.length ? ` · ${x.schools.map((s) => short(s)).join("、")}` : " · 不限學校"}
                    {x.subjects?.length ? ` · ${x.subjects.map((c) => data.subjects[c]?.name ?? c).join("、")}` : ""}
                  </div>
                  {x.note && <p>{x.note}</p>}
                  <div className="res-checked">連結確認於 {x.checked}</div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {list.length === 0 && <p className="empty">目前沒有符合的資料。</p>}
    </section>
  );
}
