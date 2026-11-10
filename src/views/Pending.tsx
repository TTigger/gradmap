import Icon from "../Icon";
import type { Data } from "../types";
import { fmtMD } from "../lib";

export default function Pending({ data }: { data: Data }) {
  const refs = data.schools.filter((s) => s.status === "pending");
  const out = data.schools.filter((s) => s.status !== "pending");
  return (
    <>
    <section className="card">
      <p className="lead">已公告的 116 學年度考試入學簡章（點名稱開啟學校官方檔案）。</p>
      <ul className="pending">
        {out.map((s) => (
          <li key={s.id}>
            <div className="p-head"><b>{s.name}</b></div>
            <a href={s.brochure.url} target="_blank" rel="noreferrer">{s.brochure.title}<Icon name="out" /></a>
            <p className="verified">{s.brochure.published && `${fmtMD(s.brochure.published)} 公告・`}查證 {fmtMD(s.brochure.verified)}</p>
          </li>
        ))}
      </ul>
    </section>
    {refs.length + data.pending.schools.length === 0 ? (
      <section className="card">
        <p className="lead">目前追蹤的 {out.length} 所學校，116 學年度考試入學簡章都已公告並查證。之後若有簡章更正，會標在比較表和首頁「最近的簡章更正」。</p>
      </section>
    ) : (
    <section className="card">
      <p className="lead">
        下列學校的 116 學年度考試入學簡章還沒公告（最後查核：{data.pending.checked}）。
        公告後會查證並移到其他分頁。
      </p>
      <ul className="pending">
        {refs.map((s) => (
          <li key={s.id}>
            <div className="p-head">
              <b>{s.name}</b>
              <span className="badge ref">已有 {s.reference_year} 參考資料</span>
            </div>
            <p>{s.status_note}</p>
            <a href={s.brochure.url} target="_blank" rel="noreferrer">{s.brochure.title}<Icon name="out" /></a>
          </li>
        ))}
        {data.pending.schools.map((s) => (
          <li key={s.id} data-focus={`pd-${s.id}`}>
            <div className="p-head"><b>{s.name}</b></div>
            <p>{s.note}</p>
            <a href={s.site} target="_blank" rel="noreferrer">招生網站<Icon name="out" /></a>
            {s.note_src && <> · <a href={s.note_src} target="_blank" rel="noreferrer">公告來源<Icon name="out" /></a></>}
          </li>
        ))}
      </ul>
    </section>
    )}
    </>
  );
}
