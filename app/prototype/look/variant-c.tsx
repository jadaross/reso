/* PROTOTYPE — throwaway. Wayfinder ticket 06.
 *
 * C — "Menu". Borrowed from the thing itself: a restaurant menu. Centred,
 * type-led, almost no chrome. Dot leaders instead of tables, words instead of digits.
 */

import {
  ANNOUNCEMENT, CHOSEN_DAY, CLOSE_DAY_LABEL, DRAWN, TIER, TIER_LABEL,
  attending, freeCountByDay, headcount, members, monthGrid, picks,
  type Screen,
} from "./fixtures";

const css = `
.vc { --paper:#E9EDE6; --ink:#16301F; --claret:#8C2F39; --faint:#5E7263;
  min-height:100dvh; background:var(--paper); color:var(--ink);
  font-family:"Karla",ui-sans-serif,system-ui,sans-serif;
  max-width:460px; margin:0 auto; padding:34px 26px 132px; text-align:center; }
.vc .mark { font-size:12px; letter-spacing:.24em; color:var(--faint); }
.vc h1 { font-family:"Fraunces","Iowan Old Style",Georgia,serif; font-weight:400; font-size:33px;
  line-height:1.08; letter-spacing:-.01em; margin:20px 0 8px; }
.vc h1 em { font-style:italic; }
.vc .lede { color:var(--faint); font-size:15px; line-height:1.6; margin:0 auto 26px; max-width:32ch; }
.vc .hr { width:52px; height:1px; background:var(--ink); opacity:.35; margin:26px auto; }
.vc .hr.wide { width:100%; }
.vc .names { list-style:none; padding:0; margin:0; }
.vc .names li + li { margin-top:2px; }
.vc .names button { font-family:"Fraunces",Georgia,serif; font-size:27px; font-weight:400; background:none;
  border:none; color:var(--ink); padding:11px 8px; cursor:pointer; width:100%; }
.vc .names button:hover { color:var(--claret); }
.vc .cal { display:grid; grid-template-columns:repeat(7,1fr); gap:7px 4px; margin:6px 0 4px; }
.vc .cal .dow { font-size:10px; letter-spacing:.12em; color:var(--faint); padding-bottom:8px; }
.vc .cal button { background:none; border:none; font-family:"Fraunces",Georgia,serif; font-size:17px;
  color:var(--ink); aspect-ratio:1; cursor:pointer; border-radius:50%; display:grid; place-items:center; opacity:.55;
  width:34px; justify-self:center; }
.vc .cal button.on { background:var(--claret); color:var(--paper); opacity:1; }
.vc .cal button.many { opacity:1; box-shadow:inset 0 0 0 1px rgba(22,48,31,.28); }
.vc .cal button.won { background:var(--ink); color:var(--paper); opacity:1; }
.vc .cal span.void { }
.vc .course { margin:8px 0 0; }
.vc .course .place { font-family:"Fraunces",Georgia,serif; font-size:44px; line-height:1.02; font-weight:400;
  letter-spacing:-.02em; margin:0 0 6px; }
.vc .course .area { font-style:italic; color:var(--faint); font-size:17px; }
.vc .when { font-family:"Fraunces",Georgia,serif; font-size:23px; margin:22px 0 4px; }
.vc .for { color:var(--faint); font-size:15px; }
.vc .tier { font-size:11px; letter-spacing:.22em; color:var(--claret); margin-top:26px; }
.vc .act { display:inline-block; font-family:"Fraunces",Georgia,serif; font-size:19px; background:none;
  border:none; border-bottom:1px solid var(--claret); color:var(--claret); padding:0 2px 5px; margin-top:26px; cursor:pointer; }
.vc .act.quiet { color:var(--faint); border-color:rgba(22,48,31,.3); font-size:16px; margin-top:18px; }
.vc .note { font-size:14px; color:var(--faint); line-height:1.6; margin:22px auto 0; max-width:34ch; }
.vc .sect { font-size:11px; letter-spacing:.2em; color:var(--faint); margin:30px 0 14px; }
.vc .item { display:flex; align-items:baseline; gap:8px; text-align:left; padding:9px 0; }
.vc .item .nm { font-family:"Fraunces",Georgia,serif; font-size:19px; white-space:nowrap; }
.vc .item .nm i { font-family:"Karla",sans-serif; font-style:normal; font-size:13px; color:var(--faint); }
.vc .item .dots { flex:1; border-bottom:1px dotted rgba(22,48,31,.4); transform:translateY(-4px); }
.vc .item .pr { color:var(--claret); font-size:16px; letter-spacing:.08em; }
.vc .item.off .nm, .vc .item.off .pr { opacity:.42; }
.vc .field { display:flex; gap:0; border-bottom:1px solid rgba(22,48,31,.35); margin:4px 0 6px; }
.vc .field input { flex:1; background:none; border:none; font-family:"Fraunces",Georgia,serif; font-size:17px;
  color:var(--ink); padding:10px 2px; text-align:left; }
.vc .field input::placeholder { color:rgba(22,48,31,.42); }
.vc .field button { background:none; border:none; color:var(--claret); font-family:inherit; font-size:14px; cursor:pointer; padding:0 4px; }
`;

const DOW = ["M", "T", "W", "T", "F", "S", "S"];
const ME = members[0];
const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

export function VariantC({ screen }: { screen: Screen }) {
  return (
    <div className="vc">
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
      <div className="mark">RESO</div>
      <h1>
        Good evening. <em>Who are you?</em>
      </h1>
      <div className="hr" />
      <ul className="names">
        {members.map((m) => (
          <li key={m.id}>
            <button>{m.name}</button>
          </li>
        ))}
      </ul>
      <p className="note">Tap your name once and this phone will remember.</p>
    </>
  );
}

function Dates() {
  const counts = freeCountByDay();
  return (
    <>
      <div className="mark">OCTOBER · {TIER_LABEL[TIER].toUpperCase()}</div>
      <h1>
        Which evenings <em>can you do?</em>
      </h1>
      <p className="lede">Tap them all. The most popular one wins on {CLOSE_DAY_LABEL}.</p>
      <div className="cal">
        {DOW.map((d, i) => (
          <div className="dow" key={i}>{d}</div>
        ))}
        {monthGrid().map((day, i) =>
          day === null ? (
            <span className="void" key={i} />
          ) : (
            <button
              key={i}
              className={`${ME.free.includes(day) ? "on" : ""} ${(counts.get(day) ?? 0) >= 4 ? "many" : ""}`}
            >
              {day}
            </button>
          ),
        )}
      </div>
      <div className="hr" />
      <p className="note">
        {WORDS[ME.free.length]} evenings from you. The sixteenth is ahead with {WORDS[counts.get(16) ?? 0]} of{" "}
        {WORDS[members.length]}. A ring means four or more can make it.
      </p>
    </>
  );
}

function Announced() {
  return (
    <>
      <div className="mark">OCTOBER</div>
      <div className="hr" />
      <div className="course">
        <p className="place">{DRAWN.name}</p>
        <p className="area">{DRAWN.area}</p>
      </div>
      <p className="when">Friday the sixteenth</p>
      <p className="for">a table for {WORDS[headcount]}, eight o&rsquo;clock</p>
      <div className="tier">{TIER_LABEL[TIER].toUpperCase()} MONTH</div>
      <div className="hr" />
      <p className="note">
        Jada and Nell both put this one down, so it went into the draw twice. It still needs booking.
      </p>
      <button className="act">Send it to the group</button>
      <br />
      <button className="act quiet">Draw again</button>
      <p className="note" style={{ fontSize: 13, opacity: 0.7 }}>“{ANNOUNCEMENT}”</p>
    </>
  );
}

function Picks() {
  const marks = { low: "£", medium: "££", high: "£££" } as const;
  const inTier = picks.filter((p) => p.tier === TIER);
  const rest = picks.filter((p) => p.tier !== TIER);
  const counts = new Map<string, number>();
  for (const p of inTier) counts.set(p.name, (counts.get(p.name) ?? 0) + 1);
  const seen = new Set<string>();
  return (
    <>
      <div className="mark">THE LIST</div>
      <h1>
        Where we <em>might go</em>
      </h1>
      <p className="lede">Add anywhere you fancy. If two of you add the same place, it gets two goes in the draw.</p>
      <div className="field">
        <input placeholder="Name, or paste a Maps link" />
        <button>Add</button>
      </div>
      <div className="sect">IN THE DRAW THIS MONTH</div>
      {inTier.map((p) => {
        if (seen.has(p.name)) return null;
        seen.add(p.name);
        const n = counts.get(p.name) ?? 1;
        return (
          <div className="item" key={p.id}>
            <span className="nm">
              {p.name} <i>{p.area}{n > 1 ? ` · ×${n}` : ""}</i>
            </span>
            <span className="dots" />
            <span className="pr">{marks[p.tier]}</span>
          </div>
        );
      })}
      <div className="sect">FOR A DEARER MONTH</div>
      {rest.map((p) => (
        <div className="item off" key={p.id}>
          <span className="nm">
            {p.name} <i>{p.area}</i>
          </span>
          <span className="dots" />
          <span className="pr">{marks[p.tier]}</span>
        </div>
      ))}
      <p className="note">{attending.length} of you are free on the sixteenth.</p>
    </>
  );
}
