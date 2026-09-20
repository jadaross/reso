import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { openOuting } from "@/lib/cycle/month-view";
import { getDb } from "@/lib/db";
import { members, picks, type PriceTier } from "@/lib/db/schema";
import { currentAdmin, currentMember } from "@/lib/identity/guard";

import { Eyebrow } from "../frame";
import styles from "../page.module.css";
import { AddForm } from "./add-form";
import { AddressControl, RemoveControl, RetryLink, TierControl } from "./row-controls";
import rows from "./restaurants.module.css";

const TIER_LABEL: Record<PriceTier, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default async function Restaurants({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();
  if (!member) redirect(`/g/${secret}`);

  const admin = await currentAdmin();

  const [all, outing] = await Promise.all([
    getDb()
      .select({
        id: picks.id,
        name: picks.name,
        tier: picks.tier,
        address: picks.address,
        linkStatus: picks.linkStatus,
        addedBy: members.name,
        addedById: picks.memberId,
      })
      .from(picks)
      .innerJoin(members, eq(members.id, picks.memberId))
      .orderBy(asc(picks.name)),
    openOuting(),
  ]);

  const party = outing?.kind === "party";
  const tier = party ? undefined : outing?.tier;

  // What everyone can see: how big the list is and how it splits by tier. Not which
  // restaurants are on it — the pool is deliberately hidden so the Draw stays a
  // surprise and nobody feels judged for what they put in.
  const byTier = {
    low: all.filter((p) => p.tier === "low").length,
    medium: all.filter((p) => p.tier === "medium").length,
    high: all.filter((p) => p.tier === "high").length,
  };

  const mine = group(all.filter((p) => p.addedById === member.id));
  const inDraw = group(tier ? all.filter((p) => p.tier === tier) : []);
  const rest = group(tier ? all.filter((p) => p.tier !== tier) : all);

  return (
    <>
      <Eyebrow text={all.length === 1 ? "1 place" : `${all.length} places`} />
      <h1 className={styles.title}>Restaurants</h1>
      <p className={styles.lede}>
        Add anywhere you fancy. Nobody sees the list, so the draw stays a surprise —
        and if someone else adds the same place, it goes in twice.
      </p>

      <AddForm secret={secret} />

      <div className={rows.counts}>
        <span className={rows.countsTotal}>
          {all.length === 1 ? "1 place" : `${all.length} places`}
        </span>
        <span className={rows.countsLine}>
          {tier
            ? `${byTier[tier]} of them are in this month's draw.`
            : party
              ? "This month is a dinner party, so there is no draw."
              : "No month is open, so nothing is in a draw yet."}
        </span>
        <div className={rows.tally}>
          {(["low", "medium", "high"] as const).map((each) => (
            <div
              key={each}
              className={
                each === tier ? `${rows.tallyCell} ${rows.inDraw}` : rows.tallyCell
              }
            >
              <span className={rows.tallyCount}>{byTier[each]}</span>
              <span className={rows.tallyLabel}>{TIER_LABEL[each]}</span>
            </div>
          ))}
        </div>
      </div>

      {mine.length > 0 ? (
        <>
          <div className={rows.groupHead}>Yours</div>
          {mine.map((entry) => (
            <Row key={entry.key} secret={secret} entry={entry} removable />
          ))}
        </>
      ) : (
        <p className={rows.empty}>
          You haven&rsquo;t added anywhere yet. You only ever see your own.
        </p>
      )}

      {admin ? (
        <>
          <div className={rows.groupHead}>
            Everyone&rsquo;s &mdash; in the draw this month
            {tier ? ` (${TIER_LABEL[tier]})` : ""}
          </div>
          {inDraw.length === 0 ? (
            <p className={rows.empty}>
              {party
                ? "A dinner party month: nothing is drawn."
                : "Nothing in this month\u2019s tier, so there is nothing to draw from."}
            </p>
          ) : (
            inDraw.map((entry) => (
              <Row key={`d-${entry.key}`} secret={secret} entry={entry} />
            ))
          )}

          {rest.length > 0 ? (
            <>
              <div className={rows.groupHead}>
                Everyone&rsquo;s &mdash; waiting for another kind of month
              </div>
              {rest.map((entry) => (
                <Row
                  key={`r-${entry.key}`}
                  secret={secret}
                  entry={entry}
                  dimmed
                />
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}

type Entry = {
  key: string;
  name: string;
  tier: PriceTier;
  address: string | null;
  addedBy: string[];
  /** True when a link was pasted and never parsed; the raw link is still stored. */
  unresolved: boolean;
  /** Every Pick for this restaurant — one ticket each in the Draw. */
  pickIds: string[];
};

/**
 * One row per restaurant, not per Pick.
 *
 * The Picks stay separate in the database because each one is a ticket in the
 * Draw — that is the whole voting mechanism. But two identical rows on screen read
 * as a bug rather than as a vote, so the list shows the place once and names
 * everyone who wants it.
 */
function group(picksInSection: {
  id: string;
  name: string;
  tier: PriceTier;
  address: string | null;
  addedBy: string;
  linkStatus: "none" | "resolved" | "unresolved";
}[]): Entry[] {
  const byName = new Map<string, Entry>();

  for (const pick of picksInSection) {
    const existing = byName.get(pick.name);
    if (existing) {
      existing.addedBy.push(pick.addedBy);
      existing.pickIds.push(pick.id);
      existing.address ??= pick.address;
      existing.unresolved ||= pick.linkStatus === "unresolved";
    } else {
      byName.set(pick.name, {
        key: pick.name,
        name: pick.name,
        tier: pick.tier,
        address: pick.address,
        addedBy: [pick.addedBy],
        unresolved: pick.linkStatus === "unresolved",
        pickIds: [pick.id],
      });
    }
  }

  return [...byName.values()];
}

function Row({
  secret,
  entry,
  dimmed = false,
  removable = false,
}: {
  secret: string;
  entry: Entry;
  dimmed?: boolean;
  /** True in "Yours": every Pick in the row is the reader's own, so they can take it back. */
  removable?: boolean;
}) {
  const tickets = entry.pickIds.length;

  return (
    <div className={dimmed ? `${rows.row} ${rows.rowOff}` : rows.row}>
      <div>
        <div className={rows.name}>{entry.name}</div>
        <div className={rows.meta}>
          {entry.address ? (
            entry.address
          ) : entry.unresolved ? (
            <RetryLink secret={secret} pickIds={entry.pickIds} />
          ) : (
            <AddressControl secret={secret} pickIds={entry.pickIds} />
          )}{" "}
          &middot; {list(entry.addedBy)}
          {tickets > 1 ? (
            <span className={rows.wanted}> &middot; {tickets} tickets in the draw</span>
          ) : null}
          {removable ? (
            <>
              {" "}
              &middot; <RemoveControl secret={secret} pickIds={entry.pickIds} />
            </>
          ) : null}
        </div>
      </div>
      <TierControl secret={secret} pickIds={entry.pickIds} tier={entry.tier} />
    </div>
  );
}

/** "Jada", "Jada and Lottie", "Jada, Lottie and Jack". */
function list(names: string[]): string {
  if (names.length === 1) return `added by ${names[0]}`;
  const last = names[names.length - 1];
  return `added by ${names.slice(0, -1).join(", ")} and ${last}`;
}
