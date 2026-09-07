/* PROTOTYPE — throwaway. Wayfinder ticket 06.
 *
 * A — "Stub". The Draw is a raffle, so the month's dinner is a physical thing:
 * a bone ticket on a dark table. One hero object per screen; everything else quiet.
 */

import {
  ANNOUNCEMENT, CHOSEN_DAY, CLOSE_DAY_LABEL, DRAWN, MONTH_LABEL, TIER, TIER_LABEL,
  attending, freeCountByDay, headcount, members, monthGrid, picks, plusOnesCount,
  type Screen,
} from "./fixtures";

const css = `
.va { --ink:#0E1116; --bone:#EFEBE1; --amber:#F0A83C; --dim:#7A8391;
  min-height:100dvh; background:var(--ink); color:var(--bone);
  font-family:"Inter Tight",ui-sans-serif,system-ui,sans-serif;
  padding:28px 20px 132px; max-width:520px; margin:0 auto; }
.va h1,.va .display { font-family:"Bricolage Grotesque","Inter Tight",sans-serif; font-weight:700; letter-spacing:-.03em; }
.va .mark { font-size:13px; color:var(--dim); letter-spacing:.04em; }
.va h1 { font-size:34px; line-height:1.05; margin:18px 0 22px; }
.va .stub { position:relative; background:var(--bone); color:var(--ink); border-radius:4px;
  padding:18px 20px 18px 30px; width:100%; text-align:left; border:none; cursor:pointer; display:block;
  font-family:"Bricolage Grotesque",sans-serif; font-size:24px; font-weight:700; letter-spacing:-.02em; }
.va .stub::before { content:""; position:absolute; left:12px; top:10px; bottom:10px; width:2px;
  background:radial-gradient(circle at 1px 3px, var(--ink) 1.2px, transparent 1.4px) 0 0/2px 8px repeat-y; opacity:.35; }
.va .stub + .stub { margin-top:10px; }
.va .who { display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin-bottom:6px; }
.va .sub { color:var(--dim); font-size:14px; }
.va .grid { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin:18px 0 10px; }
.va .dow { font-size:11px; color:var(--dim); text-align:center; padding-bottom:2px; }
.va .day { aspect-ratio:1; border-radius:6px; border:1px solid #232833; background:transparent; color:var(--bone);
  font-size:15px; font-variant-numeric:tabular-nums; cursor:pointer; display:grid; place-items:center; }
.va .day.on { background:var(--amber); border-color:var(--amber); color:var(--ink); font-weight:600; }
.va .day.blank { border:none; }
.va .day.weekend:not(.on) { border-color:#2F3644; }
.va .hint { border-top:1px solid #232833; margin-top:20px; padding-top:16px; font-size:15px; line-height:1.5; }
.va .hint b { color:var(--amber); font-weight:600; }
.va .ticket { background:var(--bone); color:var(--ink); border-radius:6px; padding:0 24px 26px; margin-top:6px; position:relative; }
.va .ticket { padding-top:26px; }
.va .ticket .month { font-size:12px; letter-spacing:.14em; color:#6C6558; }
.va .ticket .place { font-family:"Bricolage Grotesque",sans-serif; font-weight:700; font-size:46px; line-height:.98;
  letter-spacing:-.04em; margin:10px 0 4px; }
.va .ticket .area { font-size:16px; color:#6C6558; }
.va .tear { position:relative; height:1px; margin:24px -24px 20px;
  background:repeating-linear-gradient(to right, #C9C2B2 0 6px, transparent 6px 12px); }
.va .tear::before, .va .tear::after { content:""; position:absolute; top:-9px; width:18px; height:18px;
  border-radius:50%; background:var(--ink); }
.va .tear::before { left:-9px; }
.va .tear::after { right:-9px; }
.va .rows { display:flex; gap:26px; }
.va .rows div span { display:block; font-size:12px; color:#6C6558; margin-bottom:3px; }
.va .rows div strong { font-family:"Bricolage Grotesque",sans-serif; font-size:22px; letter-spacing:-.02em; }
.va .stamp { position:absolute; right:18px; top:26px; transform:rotate(7deg); border:2px solid var(--amber);
  color:#B87516; border-radius:3px; padding:5px 10px; font-size:13px; font-weight:600; letter-spacing:.08em; }
.va .share { width:100%; background:var(--amber); color:var(--ink); border:none; border-radius:6px; padding:16px;
  font-size:17px; font-weight:600; margin-top:16px; cursor:pointer; font-family:inherit; }
.va .note { font-size:14px; color:var(--dim); margin-top:12px; line-height:1.5; }
.va .add { display:flex; gap:8px; margin:16px 0 22px; }
.va .add input { flex:1; background:#171B23; border:1px solid #2A3140; color:var(--bone); border-radius:6px;
  padding:13px 14px; font-size:15px; font-family:inherit; }
.va .add button { background:var(--bone); color:var(--ink); border:none; border-radius:6px; padding:0 18px;
  font-weight:600; font-size:15px; cursor:pointer; font-family:inherit; }
.va .pick { display:flex; align-items:baseline; justify-content:space-between; gap:12px;
  padding:14px 0; border-bottom:1px solid #1D222B; }
.va .pick.off { opacity:.38; }
.va .pick .nm { font-size:17px; }
.va .pick .ar { font-size:13px; color:var(--dim); }
.va .pick .tier { font-size:15px; color:var(--amber); letter-spacing:.06em; white-space:nowrap; }
.va .pick .dup { font-size:12px; color:var(--amber); }
.va .grouphead { font-size:13px; color:var(--dim); margin:24px 0 2px; }
`;

const DOW = ["M", "T", "W", "T", "F", "S", "S"];
const ME = members[0];

export function VariantA({ screen }: { screen: Screen }) {
  return (
    <div className="va">
      <style>{css}</style>
      {screen === "name" && <Name />}
      {screen === "dates" && <Dates />}
      {screen === "announced" && <Announced />}
      {screen === "picks" && <Picks />}
    </div>
  );
}

function Name() {
  return (
    <>
      <div className="mark">Reso</div>
      <h1>Who are you?</h1>
      {members.map((m) => (
        <button className="stub" key={m.id}>
          {m.name}
        </button>
      ))}
      <p className="note">Tap your name once. This phone will remember it.</p>
    </>
  );
}

function Dates() {
  const counts = freeCountByDay();
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return (
    <>
      <div className="who">
        <div className="mark">Reso · {ME.name}</div>
        <div className="sub">{TIER_LABEL[TIER]} month</div>
      </div>
      <h1>When are you free in October?</h1>
      <p className="sub">Tap every evening you could make. Closes {CLOSE_DAY_LABEL}.</p>
      <div className="grid">
        {DOW.map((d, i) => (
          <div className="dow" key={i}>{d}</div>
        ))}
        {monthGrid().map((day, i) =>
          day === null ? (
            <div className="day blank" key={i} />
          ) : (
            <button
              key={i}
              className={`day${ME.free.includes(day) ? " on" : ""}${[5, 6, 0].includes(new Date(Date.UTC(2026, 9, day)).getUTCDay()) ? " weekend" : ""}`}
            >
              {day}
            </button>
          ),
        )}
      </div>
      <div className="hint">
        You have {ME.free.length} evenings in. Right now <b>Friday {best[0]}</b> works for{" "}
        <b>{best[1]} of {members.length}</b>.
      </div>
    </>
  );
}

function Announced() {
  return (
    <>
      <div className="who">
        <div className="mark">Reso · {ME.name}</div>
        <div className="sub">Drawn {CLOSE_DAY_LABEL}</div>
      </div>
      <div className="ticket">
        <div className="stamp">{TIER_LABEL[TIER].toUpperCase()}</div>
        <div className="month">{MONTH_LABEL.toUpperCase()}</div>
        <div className="place">{DRAWN.name}</div>
        <div className="area">{DRAWN.area} · {DRAWN.address}</div>
        <div className="tear" />
        <div className="rows">
          <div>
            <span>Date</span>
            <strong>Fri {CHOSEN_DAY} Oct</strong>
          </div>
          <div>
            <span>Table for</span>
            <strong>{headcount}</strong>
          </div>
          <div>
            <span>Added by</span>
            <strong>Jada + Nell</strong>
          </div>
        </div>
      </div>
      <button className="share">Send it to the group</button>
      <p className="note">
        Two people had this one down, so it went in twice. {attending.length} of you are free that night
        {plusOnesCount ? `, plus ${plusOnesCount} guests` : ""}. Someone still needs to book it.
      </p>
      <p className="note" style={{ fontSize: 13, opacity: 0.75 }}>“{ANNOUNCEMENT}”</p>
    </>
  );
}

function Picks() {
  const marks = { low: "£", medium: "££", high: "£££" } as const;
  const inTier = picks.filter((p) => p.tier === TIER);
  const rest = picks.filter((p) => p.tier !== TIER);
  const dupes = new Set(
    inTier.filter((p, i, a) => a.findIndex((q) => q.name === p.name) !== i).map((p) => p.name),
  );
  const seen = new Set<string>();
  return (
    <>
      <div className="who">
        <div className="mark">Reso · {ME.name}</div>
        <div className="sub">{picks.length} on the list</div>
      </div>
      <h1>Where should we go?</h1>
      <div className="add">
        <input placeholder="Name, or paste a Maps link" />
        <button>Add</button>
      </div>
      <div className="grouphead">In the draw this month</div>
      {inTier.map((p) => {
        if (seen.has(p.name)) return null;
        seen.add(p.name);
        return (
          <div className="pick" key={p.id}>
            <div>
              <div className="nm">{p.name}</div>
              <div className="ar">
                {p.area}
                {dupes.has(p.name) ? <span className="dup"> · two of you want this</span> : null}
              </div>
            </div>
            <div className="tier">{marks[p.tier]}</div>
          </div>
        );
      })}
      <div className="grouphead">Waiting for a Medium or High month</div>
      {rest.map((p) => (
        <div className="pick off" key={p.id}>
          <div>
            <div className="nm">{p.name}</div>
            <div className="ar">{p.area}</div>
          </div>
          <div className="tier">{marks[p.tier]}</div>
        </div>
      ))}
    </>
  );
}
