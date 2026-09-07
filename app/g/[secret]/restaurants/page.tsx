import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { openOuting } from "@/lib/cycle/month-view";
import { getDb } from "@/lib/db";
import { members, picks, type PriceTier } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

import styles from "../page.module.css";
import { Shell } from "../shell";
import { AddForm } from "./add-form";
import { AddressControl, TierControl } from "./row-controls";
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

  const [all, outing] = await Promise.all([
    getDb()
      .select({
        id: picks.id,
        name: picks.name,
        tier: picks.tier,
        address: picks.address,
        linkStatus: picks.linkStatus,
        addedBy: members.name,
      })
      .from(picks)
      .innerJoin(members, eq(members.id, picks.memberId))
      .orderBy(asc(picks.name)),
    openOuting(),
  ]);

  const tier = outing?.tier;
  const inDraw = group(tier ? all.filter((p) => p.tier === tier) : []);
  const rest = group(tier ? all.filter((p) => p.tier !== tier) : all);

  return (
    <Shell
      secret={secret}
      member={member}
      section="restaurants"
      eyebrow={all.length === 1 ? "1 place" : `${all.length} places`}
    >
      <h1 className={styles.title}>Restaurants</h1>
      <p className={styles.lede}>
        Add anywhere you fancy. If someone else adds the same place, it goes into the
        draw twice.
      </p>

      <AddForm secret={secret} />

      {all.length === 0 ? (
        <p className={rows.empty}>
          Nothing on the list yet. Whatever goes in first has good odds.
        </p>
      ) : null}

      {tier && inDraw.length > 0 ? (
        <>
          <div className={rows.groupHead}>
            In the draw this month &mdash; {TIER_LABEL[tier]}
          </div>
          {inDraw.map((entry) => (
            <Row key={entry.key} secret={secret} entry={entry} />
          ))}
        </>
      ) : null}

      {tier && inDraw.length === 0 && all.length > 0 ? (
        <p className={rows.empty}>
          Nothing in this month&rsquo;s {TIER_LABEL[tier].toLowerCase()} tier yet, so
          there is nothing to draw from. Add somewhere, or ask Jada to change the tier.
        </p>
      ) : null}

      {rest.length > 0 ? (
        <>
          <div className={rows.groupHead}>
            {tier ? "Waiting for another kind of month" : "On the list"}
          </div>
          {rest.map((entry) => (
            <Row
              key={entry.key}
              secret={secret}
              entry={entry}
              dimmed={Boolean(tier)}
            />
          ))}
        </>
      ) : null}
    </Shell>
  );
}

type Entry = {
  key: string;
  name: string;
  tier: PriceTier;
  address: string | null;
  addedBy: string[];
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
}[]): Entry[] {
  const byName = new Map<string, Entry>();

  for (const pick of picksInSection) {
    const existing = byName.get(pick.name);
    if (existing) {
      existing.addedBy.push(pick.addedBy);
      existing.pickIds.push(pick.id);
      existing.address ??= pick.address;
    } else {
      byName.set(pick.name, {
        key: pick.name,
        name: pick.name,
        tier: pick.tier,
        address: pick.address,
        addedBy: [pick.addedBy],
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
}: {
  secret: string;
  entry: Entry;
  dimmed?: boolean;
}) {
  const tickets = entry.pickIds.length;

  return (
    <div className={dimmed ? `${rows.row} ${rows.rowOff}` : rows.row}>
      <div>
        <div className={rows.name}>{entry.name}</div>
        <div className={rows.meta}>
          {entry.address ?? (
            <AddressControl secret={secret} pickIds={entry.pickIds} />
          )}{" "}
          &middot; {list(entry.addedBy)}
          {tickets > 1 ? (
            <span className={rows.wanted}> &middot; {tickets} tickets in the draw</span>
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
