import type { Data } from "../types";

export default function Pending({ data }: { data: Data }) {
  const refs = data.schools.filter((s) => s.status === "pending");
  return (
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
            <a href={s.brochure.url} target="_blank" rel="noreferrer">{s.brochure.title} ↗</a>
          </li>
        ))}
        {data.pending.schools.map((s) => (
          <li key={s.id}>
            <div className="p-head"><b>{s.name}</b></div>
            <p>{s.note}</p>
            <a href={s.site} target="_blank" rel="noreferrer">招生網站 ↗</a>
            {s.note_src && <> · <a href={s.note_src} target="_blank" rel="noreferrer">公告來源 ↗</a></>}
          </li>
        ))}
      </ul>
    </section>
  );
}
