import { shareOrCopy, linkVerb } from "./useCopyLink";
import Icon from "./Icon";
import { useState } from "react";
import type { Data } from "./types";
import Popover from "./Popover";

/** 我的志願：勾選要報的學校，時間軸、行事曆、比較表、.ics 都可以只看這幾校 */
export default function MyList({ data, mine, setMine, mineOnly, setMineOnly }: {
  data: Data; mine: string[]; setMine: (v: string[]) => void; mineOnly: boolean; setMineOnly: (v: boolean) => void;
}) {
  const toggle = (id: string) => setMine(mine.includes(id) ? mine.filter((x) => x !== id) : [...mine, id]);
  const on = mineOnly && mine.length > 0;
  return (
    <Popover className={`btn mylist-btn ${on ? "on" : ""}`} label={<><Icon name="star" fill={mine.length > 0} /> 我的志願{mine.length > 0 && <b>{mine.length}</b>}</>}>
      {() => (
        <div className="mylist">
          <label className="mylist-only">
            <input type="checkbox" checked={mineOnly} disabled={!mine.length} onChange={(e) => setMineOnly(e.target.checked)} />
            只看我的志願
          </label>
          <p className="hint">勾選想報考的學校。開啟「只看我的志願」後，時間軸、行事曆、比較表、考科、倒數都只顯示這幾校；行事曆選單可以下載只有這幾校的 .ics。只存在這台裝置的瀏覽器裡。</p>
          <div className="mylist-grid">
            {data.registry.map((r) => {
              const s = data.schools.find((x) => x.id === r.id);
              return (
                <label key={r.id} className={mine.includes(r.id) ? "on" : ""}>
                  <input type="checkbox" checked={mine.includes(r.id)} onChange={() => toggle(r.id)} />
                  {r.short}
                  {!s || s.status !== "verified" ? <small>未公告</small> : null}
                </label>
              );
            })}
          </div>
          {mine.length > 0 && <FeeSum data={data} mine={mine} />}
          {mine.length > 0 && <ShareLink mine={mine} />}
          {mine.length > 0 && <button className="chipbtn" onClick={() => { setMine([]); setMineOnly(false); }}>清空</button>}
        </div>
      )}
    </Popover>
  );
}

/** 報名費合計：已查證的用 116 金額，未公告的用參考年度（另外標示） */
function FeeSum({ data, mine }: { data: Data; mine: string[] }) {
  const items = mine.map((id) => {
    const s = data.schools.find((x) => x.id === id);
    const short = data.registry.find((r) => r.id === id)?.short ?? id;
    return { short, fee: s?.fee?.amount, ref: s?.status === "pending" ? s.reference_year : undefined, note: s?.fee?.note };
  });
  const known = items.filter((x) => x.fee != null);
  const total = known.reduce((a, x) => a + x.fee!, 0);
  const unknown = items.filter((x) => x.fee == null);
  return (
    <div className="feesum">
      <div className="feesum-total">報名費合計 <b>${total.toLocaleString()}</b>{unknown.length > 0 && <small>＋{unknown.length} 校未公告</small>}</div>
      <ul>
        {items.map((x) => (
          <li key={x.short} title={x.note}>
            <span>{x.short}</span>
            <span>{x.fee != null ? `$${x.fee.toLocaleString()}${x.ref ? `（${x.ref} 參考）` : ""}` : "未公告"}</span>
          </li>
        ))}
      </ul>
      <p className="hint">只算筆試報名費；有面試的學校可能另收面試費，聯招報多個志願可能加價，詳見比較表備註。</p>
    </div>
  );
}

/** 志願清單存在這台裝置；要換裝置或分享，就複製帶著清單的連結 */
function ShareLink({ mine }: { mine: string[] }) {
  const [done, setDone] = useState(false);
  const url = `${location.origin}${location.pathname}?mine=${mine.join(",")}#timeline`;
  const copy = async () => {
    if ((await shareOrCopy(url, "我的志願清單｜上岸地圖")) === "copied") { setDone(true); setTimeout(() => setDone(false), 1600); }
  };
  return (
    <div className="share">
      <button className="btn" onClick={copy}>{done ? "已複製 ✓" : `🔗 ${linkVerb}志願清單連結`}</button>
      <p className="hint">清單只存在這台裝置的瀏覽器。在手機或其他電腦打開這個連結，就會帶入同一份清單；也可以傳給一起準備的朋友。</p>
    </div>
  );
}
