/* PROTOTYPE — throwaway. Wayfinder ticket 06.
 *
 * B — "Planner". The month grid is the app. Time first, place second: the same
 * calendar persists across every phase and simply fills in. Dense, no hero object.
 */

import {
  ANNOUNCEMENT, CHOSEN_DAY, CLOSE_DAY_LABEL, DRAWN, MONTH_LABEL, TIER, TIER_LABEL,
  attending, freeCountByDay, headcount, isWeekend, members, monthGrid, picks,
  type Screen,
} from "./fixtures";

const css = `
.vb { --paper:#FBFBF9; --ink:#1F262B; --rule:#DCE0DD; --blue:#1F3FBF; --soft:#EEF1EE; --mute:#6E7A80;
  min-height:100dvh; background:var(--paper); color:var(--ink);
  font-family:"IBM Plex Sans",ui-sans-serif,system-ui,sans-serif;
  font-variant-numeric:tabular-nums; max-width:520px; margin:0 auto; padding:0 0 132px; }
.vb .bar { display:flex; align-items:center; justify-content:space-between; padding:14px 18px;
  border-bottom:1px solid var(--rule); font-size:13px; color:var(--mute); }
.vb .bar strong { color:var(--ink); font-weight:600; }
.vb .head { padding:20px 18px 14px; }
.vb .head h1 { font-size:26px; font-weight:600; letter-spacing:-.02em; margin:0 0 5px; }
.vb .head p { margin:0; color:var(--mute); font-size:14px; line-height:1.45; }
.vb .cal { border-top:1px solid var(--rule); }
.vb .dows { display:grid; grid-template-columns:repeat(7,1fr); border-bottom:1px solid var(--rule); }
.vb .dows span { font-size:11px; color:var(--mute); text-align:center; padding:7px 0; font-weight:500; }
.vb .cells { display:grid; grid-template-columns:repeat(7,1fr); }
.vb .cell { position:relative; min-height:60px; border-right:1px solid var(--rule); border-bottom:1px solid var(--rule);
  background:none; font:inherit; color:inherit; text-align:left; padding:6px 0 0 7px; cursor:pointer; }
.vb .cell:nth-child(7n) { border-right:none; }
.vb .cell.wknd { background:var(--soft); }
.vb .cell.void { background:repeating-linear-gradient(-45deg,transparent,transparent 5px,#F2F4F1 5px,#F2F4F1 6px); cursor:default; }
.vb .cell .n { font-size:14px; display:block; line-height:1.1; }
.vb .cell.mine .n { color:var(--blue); font-weight:600; }
.vb .cell .bars { position:absolute; left:7px; right:7px; bottom:7px; display:flex; gap:2px; }
.vb .cell .bars i { height:4px; flex:1; background:var(--rule); border-radius:1px; }
.vb .cell .bars i.f { background:#9AA8D8; }
.vb .cell.mine .bars i.f { background:var(--blue); }
.vb .cell.mine::after { content:""; position:absolute; inset:0; border:2px solid var(--blue); pointer-events:none; }
.vb .cell.won { background:var(--blue); }
.vb .cell.won .n, .vb .cell.won .lbl { color:#fff; }
.vb .cell.won .bars i { background:rgba(255,255,255,.35); }
.vb .cell.won .bars i.f { background:#fff; }
.vb .cell.won::after { border:none; }
.vb .cell .lbl { font-size:9px; font-weight:600; letter-spacing:.06em; margin-left:5px; }
.vb .cell.won .bars { display:none; }
.vb .legend { display:flex; gap:16px; padding:12px 18px; font-size:12px; color:var(--mute); border-bottom:1px solid var(--rule); }
.vb .legend span { display:flex; align-items:center; gap:6px; }
.vb .legend b { width:14px; height:6px; border-radius:1px; display:inline-block; }
.vb .panel { padding:18px; border-bottom:1px solid var(--rule); }
.vb .kv { display:grid; grid-template-columns:96px 1fr; gap:10px 14px; font-size:15px; }
.vb .kv dt { color:var(--mute); font-size:13px; padding-top:2px; }
.vb .kv dd { margin:0; font-weight:500; }
.vb .kv dd small { display:block; font-weight:400; color:var(--mute); font-size:13px; margin-top:2px; }
.vb .btn { display:block; width:100%; padding:13px; border-radius:4px; font:inherit; font-weight:600; font-size:15px; cursor:pointer; }
.vb .btn.pri { background:var(--blue); color:#fff; border:none; }
.vb .btn.sec { background:transparent; color:var(--blue); border:1px solid #C3CBE8; margin-top:8px; }
.vb .quote { font-size:13px; color:var(--mute); line-height:1.5; padding:14px 18px; border-bottom:1px solid var(--rule); }
.vb table { width:100%; border-collapse:collapse; font-size:14px; }
.vb th { text-align:left; font-size:11px; font-weight:600; color:var(--mute); letter-spacing:.03em;
  padding:9px 18px; border-bottom:1px solid var(--rule); background:var(--soft); }
.vb td { padding:11px 18px; border-bottom:1px solid var(--rule); }
.vb td.t { text-align:right; color:var(--blue); font-weight:600; white-space:nowrap; }
.vb tr.off td { color:#9AA5AA; }
.vb tr.off td.t { color:#9AA5AA; }
.vb .field { display:flex; gap:8px; padding:14px 18px; border-bottom:1px solid var(--rule); }
.vb .field input { flex:1; border:1px solid var(--rule); border-radius:4px; padding:11px 12px; font:inherit; font-size:14px; background:#fff; }
.vb .field button { border:none; background:var(--ink); color:#fff; border-radius:4px; padding:0 16px; font:inherit; font-weight:600; cursor:pointer; }
.vb .names { display:grid; grid-template-columns:1fr 1fr; }
.vb .names button { padding:16px 18px; border:none; border-bottom:1px solid var(--rule); border-right:1px solid var(--rule);
  background:none; font:inherit; font-size:16px; text-align:left; cursor:pointer; color:var(--ink); }
.vb .names button:nth-child(2n) { border-right:none; }
.vb .foot { padding:14px 18px; font-size:13px; color:var(--mute); line-height:1.5; }
`;

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ME = members[0];

export function VariantB({ screen }: { screen: Screen }) {
  return (
    <div className="vb">
      <style>{css}</style>
      <div className="bar">
        <span>Reso</span>
        <span>
          <strong>{MONTH_LABEL}</strong> · {TIER_LABEL[TIER]}
        </span>
      </div>
      {screen === "name" && <Name />}
      {screen === "dates" && <Cal announced={false} />}
      {screen === "announced" && <Cal announced />}
      {screen === "picks" && <Picks />}
    </div>
  );
}

function Name() {
  return (
    <>
      <div className="head">
        <h1>Who are you?</h1>
        <p>Pick your name. This phone stays signed in as you.</p>
      </div>
      <div className="names">
        {members.map((m) => (
          <button key={m.id}>{m.name}</button>
        ))}
      </div>
      <p className="foot">Not on the list? Ask Jada to add you.</p>
    </>
  );
}

function Cal({ announced }: { announced: boolean }) {
  const counts = freeCountByDay();
  return (
    <>
      <div className="head">
        <h1>{announced ? `${DRAWN.name}, Friday the ${CHOSEN_DAY}th` : "When are you free?"}</h1>
        <p>
          {announced
            ? `${DRAWN.area}. Table for ${headcount}. Nobody has booked it yet.`
            : `Tap the evenings you could make. Locks on ${CLOSE_DAY_LABEL}.`}
        </p>
      </div>
      <div className="cal">
        <div className="dows">
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="cells">
          {monthGrid().map((day, i) => {
            if (day === null) return <div className="cell void" key={i} />;
            const n = counts.get(day) ?? 0;
            const mine = ME.free.includes(day);
            const won = announced && day === CHOSEN_DAY;
            return (
              <button
                key={i}
                className={`cell${isWeekend(day) ? " wknd" : ""}${mine && !won ? " mine" : ""}${won ? " won" : ""}`}
              >
                <span className="n">{day}</span>
                {won && <span className="lbl">DINNER</span>}
                <span className="bars">
                  {members.map((_, k) => (
                    <i key={k} className={k < n ? "f" : ""} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="legend">
        <span>
          <b style={{ background: "#9AA8D8" }} /> who&rsquo;s free
        </span>
        <span>
          <b style={{ background: "#1F3FBF" }} /> you
        </span>
        <span>{members.length - members.filter((m) => m.free.length).length} yet to answer</span>
      </div>
      {announced ? (
        <>
          <div className="panel">
            <dl className="kv">
              <dt>Where</dt>
              <dd>
                {DRAWN.name}
                <small>{DRAWN.address}</small>
              </dd>
              <dt>Why it won</dt>
              <dd>
                Two of you added it
                <small>6 restaurants were in the Low pool, Mangal 2 held 2 of the 7 tickets</small>
              </dd>
              <dt>Going</dt>
              <dd>
                {attending.map((m) => m.name).join(", ")}
                <small>plus {headcount - attending.length} guests</small>
              </dd>
            </dl>
          </div>
          <div className="panel">
            <button className="btn pri">Send it to the group</button>
            <button className="btn sec">Draw again</button>
          </div>
          <p className="quote">“{ANNOUNCEMENT}”</p>
        </>
      ) : (
        <p className="foot">
          You have {ME.free.length} evenings in. Friday the 16th leads with {counts.get(16)} of {members.length}.
        </p>
      )}
    </>
  );
}

function Picks() {
  const marks = { low: "£", medium: "££", high: "£££" } as const;
  const sorted = [...picks].sort((a, b) => (a.tier === TIER ? -1 : b.tier === TIER ? 1 : 0));
  return (
    <>
      <div className="head">
        <h1>Restaurants</h1>
        <p>{picks.length} on the list. Add the same place as someone else and it gets two tickets in the draw.</p>
      </div>
      <div className="field">
        <input placeholder="Name, or paste a Maps link" />
        <button>Add</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Place</th>
            <th>Added by</th>
            <th style={{ textAlign: "right" }}>Tier</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id} className={p.tier === TIER ? "" : "off"}>
              <td>
                {p.name}
                <br />
                <span style={{ fontSize: 12, color: "#6E7A80" }}>
                  {p.address ? p.area : `${p.area} · no address yet`}
                </span>
              </td>
              <td>{p.addedBy}</td>
              <td className="t">{marks[p.tier]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="foot">Greyed-out places are waiting for a Medium or High month.</p>
    </>
  );
}
